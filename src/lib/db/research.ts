import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bump } from "@/lib/limits/counters";
import type { LedgerStore } from "@/lib/limits/ledger";
import type { CostProvider, Json, ResearchRun, ResearchStep, RunKind, RunStatus, StepKind, StepStatus } from "@/lib/types";
import { getDb } from "./client";

// Research runs, steps, the cost ledger and usage counters (spec §7.3, §8, §13).
// Server only; the secret-key client bypasses RLS (no anon policies exist).

export function db(): SupabaseClient {
  const c = getDb();
  if (!c) throw new Error("The database isn't configured on this server.");
  return c;
}

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

type Row = Record<string, unknown>;

export const toRun = (r: Row): ResearchRun => ({
  id: r.id as string,
  dossierId: r.dossier_id as string,
  kind: r.kind as RunKind,
  status: r.status as RunStatus,
  startedAt: (r.started_at as string) ?? null,
  deadlineAt: (r.deadline_at as string) ?? null,
  finishedAt: (r.finished_at as string) ?? null,
  error: (r.error as string) ?? null,
  createdAt: r.created_at as string,
});

export const toStep = (r: Row): ResearchStep => ({
  id: r.id as string,
  runId: r.run_id as string,
  kind: r.kind as StepKind,
  entityKey: (r.entity_key as string) ?? null,
  parallelRunId: (r.parallel_run_id as string) ?? null,
  status: r.status as StepStatus,
  attempts: r.attempts as number,
  lockedAt: (r.locked_at as string) ?? null,
  result: (r.result as Json) ?? null,
  createdAt: r.created_at as string,
});

// ─── Runs ────────────────────────────────────────────────────────────────────

export async function insertRun(dossierId: string, kind: RunKind, startedAt: Date, deadlineAt: Date): Promise<ResearchRun> {
  const r = await db()
    .from("research_runs")
    .insert({ dossier_id: dossierId, kind, status: "running", started_at: startedAt.toISOString(), deadline_at: deadlineAt.toISOString() })
    .select()
    .single();
  return toRun(must(r, "insert run"));
}

export async function getRun(runId: string): Promise<ResearchRun | null> {
  const r = await db().from("research_runs").select().eq("id", runId).maybeSingle();
  const row = must(r, "get run");
  return row ? toRun(row) : null;
}

export async function updateRun(runId: string, patch: { status?: RunStatus; finished_at?: string; error?: string | null }) {
  must(await db().from("research_runs").update(patch).eq("id", runId), "update run");
}

export interface DossierBasics {
  id: string;
  company: string;
  product: string;
  goal: string;
  status: string;
  currentRunId: string | null;
}

export async function getDossierBasics(dossierId: string): Promise<DossierBasics | null> {
  const r = await db().from("dossiers").select("id, company, product, goal, status, current_run_id").eq("id", dossierId).maybeSingle();
  const row = must(r, "get dossier") as Row | null;
  if (!row) return null;
  return {
    id: row.id as string,
    company: row.company as string,
    product: row.product as string,
    goal: row.goal as string,
    status: row.status as string,
    currentRunId: (row.current_run_id as string) ?? null,
  };
}

export async function updateDossier(dossierId: string, patch: { status?: string; current_run_id?: string; refreshed_at?: string }) {
  must(await db().from("dossiers").update(patch).eq("id", dossierId), "update dossier");
}

// ─── Steps ───────────────────────────────────────────────────────────────────

export interface NewStep {
  kind: StepKind;
  entityKey?: string | null;
  parallelRunId?: string | null;
  status?: StepStatus;
  result?: Json;
}

export async function insertSteps(runId: string, steps: NewStep[]): Promise<ResearchStep[]> {
  if (!steps.length) return [];
  const r = await db()
    .from("research_steps")
    .insert(
      steps.map((s) => ({
        run_id: runId,
        kind: s.kind,
        entity_key: s.entityKey ?? null,
        parallel_run_id: s.parallelRunId ?? null,
        status: s.status ?? "queued",
        result: s.result ?? null,
      })),
    )
    .select();
  return (must(r, "insert steps") as Row[]).map(toStep);
}

/**
 * Insert steps, skipping any whose parallel_run_id already exists. Claude steps use a guard key
 * there ("rate:<stakeholder id>", "leads:<run id>") so two workers can't queue the same step twice.
 */
export async function insertStepsOnce(runId: string, steps: (NewStep & { parallelRunId: string })[]): Promise<void> {
  if (!steps.length) return;
  const r = await db()
    .from("research_steps")
    .upsert(
      steps.map((s) => ({
        run_id: runId,
        kind: s.kind,
        entity_key: s.entityKey ?? null,
        parallel_run_id: s.parallelRunId,
        status: s.status ?? "queued",
        result: s.result ?? null,
      })),
      { onConflict: "parallel_run_id", ignoreDuplicates: true },
    );
  must(r, "insert steps once");
}

export async function listSteps(runId: string): Promise<ResearchStep[]> {
  const r = await db().from("research_steps").select().eq("run_id", runId).order("created_at");
  return (must(r, "list steps") as Row[]).map(toStep);
}

export async function stepByParallelRunId(parallelRunId: string): Promise<ResearchStep | null> {
  const r = await db().from("research_steps").select().eq("parallel_run_id", parallelRunId).maybeSingle();
  const row = must(r, "find step") as Row | null;
  return row ? toStep(row) : null;
}

export async function countSteps(runId: string): Promise<number> {
  const r = await db().from("research_steps").select("id", { count: "exact", head: true }).eq("run_id", runId);
  if (r.error) throw new Error(`count steps: ${r.error.message}`);
  return r.count ?? 0;
}

/** Atomically move up to n queued steps to running (claim_research_steps RPC). */
export async function claimSteps(runId: string, n: number): Promise<ResearchStep[]> {
  const r = await db().rpc("claim_research_steps", { p_run_id: runId, p_n: n });
  return (must(r, "claim steps") as Row[]).map(toStep);
}

/**
 * Take the processing lock on a running step: succeeds for exactly one caller, so a repeated
 * webhook and a poll can't both process the same result. A lock older than `staleMs` is taken over.
 */
export async function lockStep(stepId: string, now: Date, staleMs: number): Promise<boolean> {
  const stale = new Date(now.getTime() - staleMs).toISOString();
  const r = await db()
    .from("research_steps")
    .update({ locked_at: now.toISOString() })
    .eq("id", stepId)
    .eq("status", "running")
    .or(`locked_at.is.null,locked_at.lt.${stale}`)
    .select("id");
  return (must(r, "lock step") as Row[]).length === 1;
}

export async function updateStep(
  stepId: string,
  patch: { status?: StepStatus; result?: Json; parallel_run_id?: string; locked_at?: string | null },
) {
  must(await db().from("research_steps").update(patch).eq("id", stepId), "update step");
}

/** Mark steps of some kinds and statuses at once (deadline stop). */
export async function setStepsStatus(runId: string, kinds: StepKind[], from: StepStatus[], to: StepStatus) {
  must(await db().from("research_steps").update({ status: to }).eq("run_id", runId).in("kind", kinds).in("status", from), "set steps");
}

/** Claude steps whose worker died: back to queued (or failed after 3 attempts). */
export async function requeueStale(runId: string, kinds: StepKind[], olderThan: Date) {
  const r = await db()
    .from("research_steps")
    .select("id, attempts")
    .eq("run_id", runId)
    .in("kind", kinds)
    .eq("status", "running")
    .lt("locked_at", olderThan.toISOString())
    // A Parallel step that already has its run is waiting on Parallel, not on a worker.
    .or('parallel_run_id.is.null,parallel_run_id.like."rate:*",parallel_run_id.like."leads:*"');
  for (const s of must(r, "stale steps") as Row[]) {
    await updateStep(s.id as string, { status: (s.attempts as number) >= 3 ? "failed" : "queued", locked_at: null });
  }
}

// ─── Cost ledger and counters ────────────────────────────────────────────────

export const ledgerStore: LedgerStore = {
  async spentUsd(runId: string, provider: CostProvider) {
    const r = await db().from("cost_ledger").select("estimated_usd, actual_usd").eq("run_id", runId).eq("provider", provider);
    return (must(r, "ledger spent") as Row[]).reduce((s, x) => s + Number(x.actual_usd ?? x.estimated_usd), 0);
  },
  async insert(row) {
    const r = await db()
      .from("cost_ledger")
      .insert({
        run_id: row.runId,
        dossier_id: row.dossierId,
        provider: row.provider,
        purpose: row.purpose,
        estimated_usd: row.estimatedUsd,
        model: row.model,
      })
      .select("id")
      .single();
    return (must(r, "ledger insert") as Row).id as string;
  },
  async settle(id, a) {
    must(
      await db().from("cost_ledger").update({ actual_usd: a.actualUsd, tokens_in: a.tokensIn ?? null, tokens_out: a.tokensOut ?? null }).eq("id", id),
      "ledger settle",
    );
  },
};

export const bumpUsage: Bump = async (day, scope, max) => {
  const r = await db().rpc("bump_usage", { p_day: day, p_scope: scope, p_max: max });
  return must(r, "bump usage") === true;
};

// ─── Aliases ─────────────────────────────────────────────────────────────────

export async function listAliases(dossierId: string): Promise<{ alias: string; stakeholderKey: string }[]> {
  const r = await db().from("org_aliases").select("alias, stakeholder_key").or(`dossier_id.is.null,dossier_id.eq.${dossierId}`);
  return (must(r, "aliases") as Row[]).map((x) => ({ alias: x.alias as string, stakeholderKey: x.stakeholder_key as string }));
}

// ─── Progress (RES-1) ────────────────────────────────────────────────────────

export interface ProgressRows {
  stakeholders: { name: string; status: string; createdAt: string }[];
  sources: { title: string; publisher: string | null; accepted: boolean; rejectReason: string | null; reliability: string; credibility: number; createdAt: string }[];
  acceptedSources: number;
}

/** What the progress screen shows: names found, latest sources (accepted and rejected), counts. */
export async function progressRows(dossierId: string, runId: string, limit = 20): Promise<ProgressRows> {
  const client = db();
  const [st, src, acc] = await Promise.all([
    client.from("stakeholders").select("name, status, created_at").eq("dossier_id", dossierId).eq("last_run_id", runId),
    client
      .from("sources")
      .select("title, publisher, accepted, reject_reason, reliability, credibility, created_at")
      .eq("dossier_id", dossierId)
      .eq("run_id", runId)
      .order("created_at", { ascending: false })
      .order("label", { ascending: false })
      .limit(limit),
    client.from("sources").select("id", { count: "exact", head: true }).eq("dossier_id", dossierId).eq("run_id", runId).eq("accepted", true),
  ]);
  if (acc.error) throw new Error(`progress count: ${acc.error.message}`);
  return {
    stakeholders: (must(st, "progress stakeholders") as Row[]).map((x) => ({
      name: x.name as string,
      status: x.status as string,
      createdAt: x.created_at as string,
    })),
    sources: (must(src, "progress sources") as Row[]).map((x) => ({
      title: x.title as string,
      publisher: (x.publisher as string) ?? null,
      accepted: x.accepted as boolean,
      rejectReason: (x.reject_reason as string) ?? null,
      reliability: x.reliability as string,
      credibility: x.credibility as number,
      createdAt: x.created_at as string,
    })),
    acceptedSources: acc.count ?? 0,
  };
}
