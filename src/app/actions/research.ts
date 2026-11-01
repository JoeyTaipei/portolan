"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { BRIEF_TYPICAL_USD, writeBrief } from "@/lib/claude/brief";
import { insertBrief } from "@/lib/db/briefs";
import { getDb } from "@/lib/db/client";
import { getDossierState, insertDossier, insertOutbox, keepPending, mergePending, usageCount } from "@/lib/db/dossiers";
import { readDossier } from "@/lib/db/read";
import { bumpUsage, ledgerStore, listSteps } from "@/lib/db/research";
import { isDossierId, newDossierId, newShareId } from "@/lib/ids";
// The counters' "use…" names are not React hooks; aliased so the hooks lint rule stays quiet.
import { hashEmail, LIMITS, taipeiDay, useDossierAi as countDossierAi, useResearch as countResearch } from "@/lib/limits/counters";
import { startResearch } from "@/lib/research/start";
import { offMapNames } from "@/lib/research/steps";
import type { ActionResult } from "@/lib/types";

// Research Server Actions (spec §7.1, §7.6, §8, §11.1). Engine lane. Every action is a public
// POST: inputs are validated here, the dossier id is the only key (spec §9) and is format-checked
// before any query, and returns carry only what the screens show. Daily limits are counted
// before anything is written or any paid step is queued.

const OFF = "Research isn't switched on here yet.";
const FAILED = "Something went wrong on our side. Try again in a moment.";
const NOT_FOUND = "This dossier wasn't found.";

export interface CreateDossierInput {
  company: string;
  product: string;
  goal: string;
  email: string;
  market: "TW";
  certifications?: string;
  priceRange?: string;
  twPartners?: string;
  clientDeadline?: string;
  /** Honeypot: a value means a bot; the request is dropped silently. */
  website?: string;
}

export interface CreatedDossier {
  id: string;
  url: string;
}

const required = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Fill in ${what} to start research.`)
    .max(200, `Keep ${what} under 200 characters.`);
const optional = z
  .string()
  .trim()
  .max(200, "Keep the optional details under 200 characters each.")
  .optional()
  .transform((v) => (v ? v : null));

const CreateSchema = z.object({
  company: required("your company"),
  product: required("the product or service"),
  goal: required("a goal"),
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email to start research.")),
  market: z.literal("TW", "Taiwan is the only market open for now."),
  certifications: optional,
  priceRange: optional,
  twPartners: optional,
  clientDeadline: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Enter your deadline as a date."),
  website: z.string().optional(),
});

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createDossier(input: CreateDossierInput): Promise<ActionResult<CreatedDossier>> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const v = parsed.data;
  // Honeypot (spec §7.1): drop silently. The bot gets a link that opens nothing.
  if (v.website && v.website.trim()) {
    const id = newDossierId();
    return { ok: true, data: { id, url: `${await origin()}/d/${id}` } };
  }
  if (!getDb()) return { ok: false, error: OFF };

  try {
    const now = new Date();
    const emailHash = hashEmail(v.email);
    const limit = await countResearch(bumpUsage, emailHash, now);
    if (!limit.ok) return { ok: false, error: limit.error };

    // Fresh 128-bit ids; a clash (never expected) draws new ones instead of reusing.
    let id = "";
    for (let attempt = 0; attempt < 3 && !id; attempt++) {
      const candidate = newDossierId();
      const ok = await insertDossier({
        id: candidate,
        shareId: newShareId(),
        name: `${v.company} · Taiwan entry`,
        company: v.company,
        product: v.product,
        goal: v.goal,
        email: v.email,
        emailHash,
        certifications: v.certifications,
        priceRange: v.priceRange,
        twPartners: v.twPartners,
        clientDeadline: v.clientDeadline,
      });
      if (ok) id = candidate;
    }
    if (!id) return { ok: false, error: FAILED };
    // The team sends the link by hand (D3: no automatic email); the outbox is their list.
    await insertOutbox(id, v.email, "dossier_link");
    await startResearch(id, "initial", now);
    return { ok: true, data: { id, url: `${await origin()}/d/${id}` } };
  } catch (err) {
    console.error(`[createDossier] ${(err as Error).message}`);
    return { ok: false, error: FAILED };
  }
}

/** HOME-5 and "Try again" after a failed run: research again; counts against today's limit. */
export async function refreshDossier(dossierId: string): Promise<ActionResult<{ runId: string }>> {
  if (!isDossierId(dossierId)) return { ok: false, error: NOT_FOUND };
  if (!getDb()) return { ok: false, error: OFF };
  try {
    const d = await getDossierState(dossierId);
    if (!d) return { ok: false, error: NOT_FOUND };
    if (d.status === "researching") return { ok: false, error: "Research is already running for this dossier." };
    if (!d.emailHash) return { ok: false, error: FAILED };
    const now = new Date();
    const limit = await countResearch(bumpUsage, d.emailHash, now);
    if (!limit.ok) return { ok: false, error: limit.error };
    const { runId } = await startResearch(dossierId, "refresh", now);
    return { ok: true, data: { runId } };
  } catch (err) {
    console.error(`[refreshDossier] ${(err as Error).message}`);
    return { ok: false, error: FAILED };
  }
}

/** "Needs your check" after a refresh: same as an existing stakeholder, or different (spec §7.6). */
export async function resolveMatch(
  dossierId: string,
  pendingStakeholderId: string,
  decision: { same: true; existingStakeholderId: string } | { same: false },
): Promise<ActionResult<null>> {
  const uuid = z.uuid();
  if (!isDossierId(dossierId) || !uuid.safeParse(pendingStakeholderId).success) return { ok: false, error: NOT_FOUND };
  if (decision.same && !uuid.safeParse(decision.existingStakeholderId).success) return { ok: false, error: NOT_FOUND };
  if (!getDb()) return { ok: false, error: OFF };
  try {
    const ok = decision.same
      ? await mergePending(dossierId, pendingStakeholderId, decision.existingStakeholderId)
      : await keepPending(dossierId, pendingStakeholderId);
    return ok ? { ok: true, data: null } : { ok: false, error: "This check was already settled. Reload to see the map." };
  } catch (err) {
    console.error(`[resolveMatch] ${(err as Error).message}`);
    return { ok: false, error: FAILED };
  }
}

export interface RebriefEstimate {
  usd: number;
  /** e.g. "Rewriting the brief costs about US$0.30." */
  text: string;
  remainingToday: number;
}

const REBRIEF_FAILED = "The brief can't be rewritten right now. Your research is saved.";

async function rebriefable(dossierId: string): Promise<ActionResult<null>> {
  if (!isDossierId(dossierId)) return { ok: false, error: NOT_FOUND };
  if (!getDb()) return { ok: false, error: "The brief can't be rewritten here yet." };
  const d = await getDossierState(dossierId);
  if (!d) return { ok: false, error: NOT_FOUND };
  if (d.status === "researching") return { ok: false, error: "Research is still running. The brief is written when it finishes." };
  if (d.status === "failed") return { ok: false, error: "Research didn't finish, so there's nothing to write the brief from yet." };
  return { ok: true, data: null };
}

/** Shown before RE-BRIEF runs (spec §8): the cost first, then confirmation. Nothing is spent here. */
export async function estimateRebrief(dossierId: string): Promise<ActionResult<RebriefEstimate>> {
  try {
    const ok = await rebriefable(dossierId);
    if (!ok.ok) return ok;
    const used = await usageCount(taipeiDay(new Date()), `dossier:${dossierId}:ai`);
    const remainingToday = Math.max(0, LIMITS.dossierAi - used);
    if (remainingToday === 0) return { ok: false, error: "Today's AI limit for this dossier is reached. Try again after 00:00 Taipei time." };
    return {
      ok: true,
      data: { usd: BRIEF_TYPICAL_USD, text: `Rewriting the brief costs about US$${BRIEF_TYPICAL_USD.toFixed(2)}. Continue?`, remainingToday },
    };
  } catch (err) {
    console.error(`[estimateRebrief] ${(err as Error).message}`);
    return { ok: false, error: REBRIEF_FAILED };
  }
}

/** After the user confirmed the estimate: count it, then write the next version in the background. */
export async function rebrief(dossierId: string): Promise<ActionResult<{ version: number }>> {
  try {
    const ok = await rebriefable(dossierId);
    if (!ok.ok) return ok;
    const now = new Date();
    const limit = await countDossierAi(bumpUsage, dossierId, now);
    if (!limit.ok) return { ok: false, error: limit.error };
    const d = await readDossier(dossierId);
    if (!d) return { ok: false, error: NOT_FOUND };
    const version = (d.briefs[d.briefs.length - 1]?.version ?? 0) + 1;
    after(async () => {
      try {
        const r = await writeBrief({
          d,
          now,
          offMapNames: d.currentRunId ? offMapNames(await listSteps(d.currentRunId)) : [],
          // Outside a research run: the daily AI counter limits it, the ledger records it.
          ledger: { store: ledgerStore, runId: null, dossierId, purpose: "rebrief" },
        });
        if (!r.ok) console.error(`[rebrief] ${r.reason}`);
        else await insertBrief(dossierId, r.brief.draft, r.brief.removed);
      } catch (err) {
        console.error(`[rebrief] ${(err as Error).message}`);
      }
    });
    return { ok: true, data: { version } };
  } catch (err) {
    console.error(`[rebrief] ${(err as Error).message}`);
    return { ok: false, error: REBRIEF_FAILED };
  }
}
