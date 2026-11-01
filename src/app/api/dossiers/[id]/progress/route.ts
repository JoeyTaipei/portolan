import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { getDossierBasics, getRun, listSteps, progressRows } from "@/lib/db/research";
import { isDossierId } from "@/lib/ids";
import { advance } from "@/lib/research/steps";
import type { ResearchStep } from "@/lib/types";

// GET /api/dossiers/[id]/progress (spec §7.3, RES-1). Polled every 3 s by the progress screen.
// Returns the phase, counts, the latest 20 items, elapsed time and an estimate of time left —
// and advances missed steps: finished Parallel runs are processed and up to 8 queued Claude
// steps are claimed, all inside after() so this response stays fast.
// The dossier id is the only key (spec §9): a wrong-format id is a 404 before any query.

export const maxDuration = 300;

const PHASES = {
  discover: "Finding stakeholders",
  enrich: "Collecting sources",
  rate: "Rating",
  leads: "Writing the brief",
} as const;

export interface ProgressItem {
  kind: "found" | "accepted" | "rejected";
  text: string;
  at: string;
}

export interface ProgressResponse {
  status: "researching" | "partial" | "ready" | "failed";
  phase: string;
  /** 0–1 for the bar. */
  progress: number;
  counts: { found: number; enriched: number; acceptedSources: number; rated: number; stillResearching: number };
  items: ProgressItem[];
  elapsedMs: number;
  etaMs: number | null;
  error: string | null;
}

const MIN = 60_000;
const finished = (s: ResearchStep) => s.status !== "queued" && s.status !== "running";

export async function GET(_request: Request, ctx: RouteContext<"/api/dossiers/[id]/progress">) {
  const { id } = await ctx.params;
  if (!isDossierId(id)) return Response.json({ error: "Not found" }, { status: 404 });
  if (!getDb()) return Response.json({ error: "Research isn't switched on here." }, { status: 503 });

  try {
    const d = await getDossierBasics(id);
    if (!d) return Response.json({ error: "Not found" }, { status: 404 });
    const now = new Date();
    if (d.currentRunId) {
      const work = await advance(d.currentRunId, now);
      if (work.length) {
        after(async () => {
          const results = await Promise.allSettled(work.map((w) => w()));
          for (const r of results) if (r.status === "rejected") console.error(`[progress ${id}] ${String(r.reason)}`);
        });
      }
    }
    const fresh = (await getDossierBasics(id)) ?? d;
    const run = fresh.currentRunId ? await getRun(fresh.currentRunId) : null;
    const steps = run ? await listSteps(run.id) : [];
    const rows = run ? await progressRows(id, run.id) : { stakeholders: [], sources: [], acceptedSources: 0 };

    const by = (k: ResearchStep["kind"]) => steps.filter((s) => s.kind === k);
    const discover = by("discover")[0];
    const enrich = by("enrich");
    const rate = by("rate");
    const leads = by("leads")[0];
    const enrichDone = enrich.filter(finished).length;
    const rateDone = rate.filter(finished).length;
    const elapsedMs = run?.startedAt ? now.getTime() - Date.parse(run.startedAt) : 0;
    const status = fresh.status as ProgressResponse["status"];

    let phase: string;
    let progress: number;
    let etaMs: number | null;
    if (status === "failed") [phase, progress, etaMs] = ["Research didn't finish", 1, null];
    else if (status === "ready" || status === "partial" || !run || run.status !== "running") [phase, progress, etaMs] = ["Done", 1, 0];
    else if (!discover || discover.status !== "done") {
      phase = PHASES.discover;
      progress = Math.min(0.3, (elapsedMs / (8 * MIN)) * 0.3);
      etaMs = Math.max(0, 8 * MIN - elapsedMs) + 5 * MIN;
    } else if (enrich.length && enrichDone < enrich.length) {
      phase = PHASES.enrich;
      progress = 0.3 + 0.3 * (enrichDone / enrich.length);
      etaMs = 3 * MIN * (1 - enrichDone / enrich.length) + 2 * MIN;
    } else if (!leads) {
      phase = PHASES.rate;
      progress = 0.6 + 0.3 * (rate.length ? rateDone / rate.length : 1);
      etaMs = 2 * MIN * (1 - (rate.length ? rateDone / rate.length : 1)) + MIN;
    } else {
      phase = PHASES.leads;
      progress = 0.95;
      etaMs = MIN;
    }
    if (etaMs !== null && run?.deadlineAt) etaMs = Math.min(etaMs, Math.max(0, Date.parse(run.deadlineAt) - now.getTime()));

    const items: ProgressItem[] = [
      ...rows.stakeholders.map((s): ProgressItem => ({ kind: "found", text: `Found: ${s.name}`, at: s.createdAt })),
      ...rows.sources.map(
        (s): ProgressItem =>
          s.accepted
            ? { kind: "accepted", text: `Source accepted: ${s.title}${s.publisher ? ` · ${s.publisher}` : ""} · ${s.reliability}${s.credibility}`, at: s.createdAt }
            : { kind: "rejected", text: `Rejected: ${(s.rejectReason ?? "quality filter").toLowerCase()}${s.publisher ? ` · ${s.publisher}` : ""}`, at: s.createdAt },
      ),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 20);

    const body: ProgressResponse = {
      status,
      phase,
      progress: Number(progress.toFixed(3)),
      counts: {
        found: rows.stakeholders.length,
        enriched: enrichDone,
        acceptedSources: rows.acceptedSources,
        rated: rateDone,
        stillResearching: rows.stakeholders.filter((s) => s.status === "still_researching").length,
      },
      items,
      elapsedMs,
      etaMs,
      // Spec copy adds "This didn't count against today's limit." — only true once failed runs
      // are given back to the daily counter (S4 owns the counting).
      error: status === "failed" ? "Research didn't finish." : null,
    };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error(`[progress ${id}] ${(err as Error).message}`);
    return Response.json({ error: "Progress isn't available right now. Try again in a moment." }, { status: 500 });
  }
}
