"use server";

import { PARTNER_Q_TYPICAL_USD, partnerQuestionsLive, questionCandidates, writePartnerQuestions } from "@/lib/claude/partner-questions";
import { insertPartnerQuestions } from "@/lib/db/partner-questions";
import { loadDossier } from "@/lib/db/load-dossier";
import { usageCount } from "@/lib/db/dossiers";
import { bumpUsage, ledgerStore } from "@/lib/db/research";
import { isDossierId, isSampleId } from "@/lib/ids";
import { LIMITS, taipeiDay, useDossierAi as countDossierAi } from "@/lib/limits/counters";
import type { ActionResult } from "@/lib/types";

// NET-8 (risky change: paid API). Same order as RE-BRIEF: estimate first (nothing spent), then
// the confirmed write: dossier id → per-dossier AI limit → one Opus call through the cost
// ledger → checked set stored. The sample and mock mode never call Claude.

const SAMPLE = "The sample's questions are built from its sourced facts. Your own markets can have Claude write them.";
const MOCK = "Writing tailored questions needs live mode. The starter questions are already shown.";
const FAILED = "The questions couldn't be written. Your data is safe, so please try again.";

export interface PartnerQuestionsEstimate {
  usd: number;
  text: string;
  candidates: number;
  remainingToday: number;
}

async function ready(dossierId: string) {
  if (isSampleId(dossierId)) return { ok: false as const, error: SAMPLE };
  if (!isDossierId(dossierId)) return { ok: false as const, error: "This dossier couldn't be found." };
  if (!partnerQuestionsLive()) return { ok: false as const, error: MOCK };
  const d = await loadDossier(dossierId);
  if (!d) return { ok: false as const, error: "This dossier couldn't be found." };
  const candidates = questionCandidates(d, new Date()).length;
  if (!candidates) return { ok: false as const, error: "No partner candidate has sourced facts to write from yet." };
  return { ok: true as const, d, candidates };
}

export async function estimatePartnerQuestions(dossierId: string): Promise<ActionResult<PartnerQuestionsEstimate>> {
  try {
    const r = await ready(dossierId);
    if (!r.ok) return r;
    const used = await usageCount(taipeiDay(new Date()), `dossier:${dossierId}:ai`);
    const remainingToday = Math.max(0, LIMITS.dossierAi - used);
    if (remainingToday === 0) return { ok: false, error: "Today's AI limit for this dossier is reached. Try again after 00:00 Taipei time." };
    return {
      ok: true,
      data: { usd: PARTNER_Q_TYPICAL_USD, candidates: r.candidates, remainingToday, text: `Writing tailored questions for ${r.candidates} partner candidates costs about US$${PARTNER_Q_TYPICAL_USD.toFixed(2)}. Continue?` },
    };
  } catch (e) {
    console.error("[partner-questions] estimate:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

/** After the user confirmed the estimate. The old set stays until a new one passes the check. */
export async function writeTailoredQuestions(dossierId: string): Promise<ActionResult<{ written: number }>> {
  try {
    const r = await ready(dossierId);
    if (!r.ok) return r;
    const now = new Date();
    const limit = await countDossierAi(bumpUsage, dossierId, now);
    if (!limit.ok) return { ok: false, error: limit.error };
    const out = await writePartnerQuestions(r.d, { store: ledgerStore, runId: null, dossierId, purpose: "partner_questions" }, now);
    if (!out.ok) return { ok: false, error: out.reason };
    await insertPartnerQuestions(dossierId, out.entries, out.model);
    return { ok: true, data: { written: out.entries.length } };
  } catch (e) {
    console.error("[partner-questions] write:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}
