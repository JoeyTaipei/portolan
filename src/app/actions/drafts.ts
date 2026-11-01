"use server";

// CONTRACT STUB (plan P-10). Engine lane owns this from S6/S7 on; ui imports the signatures.
import type { ActionResult, IntroDraft, Tie } from "@/lib/types";

/** DOC-7: start the AI draft of a briefing note for one tracker item or stakeholder. */
export async function startBriefingDraft(
  dossierId: string,
  input: { trackerItemId: string | null; stakeholderId: string | null; expertReview: boolean },
): Promise<ActionResult<{ documentId: string }>> {
  void dossierId;
  void input;
  return { ok: false, error: "Briefing note drafts aren't switched on yet." };
}

export interface ParsedContact {
  name: string;
  title: string | null;
  orgText: string;
  linkedinUrl: string | null;
  origin: "linkedin" | "google" | "vcard" | "manual";
}

/** TEAM-4: send parsed contacts; the server keeps only those matching a stakeholder. */
export async function saveTeamTies(
  dossierId: string,
  memberId: string,
  contacts: ParsedContact[],
): Promise<ActionResult<{ ties: Tie[]; toConfirm: number }>> {
  void dossierId;
  void memberId;
  void contacts;
  return { ok: false, error: "Team connections open after our privacy review. Try it on the sample." };
}

/** Spec §10.7: hard-delete the member's contacts and ties. */
export async function withdrawMember(dossierId: string, memberId: string): Promise<ActionResult<null>> {
  void dossierId;
  void memberId;
  return { ok: false, error: "Team connections open after our privacy review. Try it on the sample." };
}

/** TEAM-9: an intro draft for the teammate to send (Portolan never sends it). */
export async function writeIntroDraft(
  dossierId: string,
  input: { memberId: string; contactId: string; targetStakeholderId: string },
): Promise<ActionResult<IntroDraft>> {
  void dossierId;
  void input;
  return { ok: false, error: "Intro drafts aren't switched on yet." };
}
