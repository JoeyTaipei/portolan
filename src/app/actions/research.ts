"use server";

// CONTRACT STUB (plan P-10). The engine lane owns this file from S3/S4 on and replaces the
// bodies; the ui lane imports these signatures and never edits them.
import type { ActionResult } from "@/lib/types";

const OFF = "Research isn't switched on yet.";

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

export async function createDossier(input: CreateDossierInput): Promise<ActionResult<CreatedDossier>> {
  void input;
  return { ok: false, error: OFF };
}

export async function refreshDossier(dossierId: string): Promise<ActionResult<{ runId: string }>> {
  void dossierId;
  return { ok: false, error: OFF };
}

/** "Needs your check" after a refresh: same as an existing stakeholder, or different (spec §7.6). */
export async function resolveMatch(
  dossierId: string,
  pendingStakeholderId: string,
  decision: { same: true; existingStakeholderId: string } | { same: false },
): Promise<ActionResult<null>> {
  void dossierId;
  void pendingStakeholderId;
  void decision;
  return { ok: false, error: OFF };
}

export interface RebriefEstimate {
  usd: number;
  /** e.g. "Rewriting the brief costs about US$0.30." */
  text: string;
  remainingToday: number;
}

/** Shown before RE-BRIEF runs (spec §8): the cost first, then confirmation. */
export async function estimateRebrief(dossierId: string): Promise<ActionResult<RebriefEstimate>> {
  void dossierId;
  return { ok: false, error: "The brief can't be rewritten yet." };
}

export async function rebrief(dossierId: string): Promise<ActionResult<{ version: number }>> {
  void dossierId;
  return { ok: false, error: "The brief can't be rewritten yet." };
}
