"use server";

// Engine lane owns this from S6/S7 on; ui imports the signatures (plan P-10).
import { after } from "next/server";
import { z } from "zod";
import { liveNote, mockNote, NOTE_PAGES, noteIsLive, type NoteResult, type NoteTarget } from "@/lib/claude/briefing-note";
import { getDb } from "@/lib/db/client";
import { loadDossier } from "@/lib/db/load-dossier";
import { bumpUsage, ledgerStore } from "@/lib/db/research";
import { isDossierId, SAMPLE_DOSSIER_ID } from "@/lib/ids";
import { useDossierAi as countDossierAi } from "@/lib/limits/counters";
import { SAMPLE_NOTE } from "@/fixtures/sample-dossier";
import { sampleDossier } from "@/lib/sample/reader";
import type { ActionResult, BriefingNoteContent, Dossier, IntroDraft, Tie } from "@/lib/types";

// Briefing note drafts (spec §11.2, §11.3; risky change: paid API). Order for a real dossier:
// zod → dossier id → stakeholder in this dossier → per-dossier AI limit → rows (drafting) →
// the draft runs in after(), so the page answers at once. Live mode writes a cost-ledger
// estimate before the Opus call (src/lib/claude/client.ts); mock mode calls no paid API.
// The sample never reaches the database: sampleBriefingNote returns the pre-written note.

const SAMPLE = "Changes to the sample stay in this browser.";
const FAILED = "The draft couldn't start. Your data is safe, so please try again.";

const DraftInput = z
  .object({ trackerItemId: z.string().min(1).max(64).nullable(), stakeholderId: z.string().min(1).max(64).nullable(), expertReview: z.boolean() })
  .refine((v) => v.trackerItemId !== null || v.stakeholderId !== null);

/** The stakeholder the note is about: the tracker item's, or its lead's mapped stakeholder. */
function resolveTarget(d: Dossier, input: { trackerItemId: string | null; stakeholderId: string | null }): NoteTarget | null {
  const item = input.trackerItemId ? (d.tracker.find((t) => t.id === input.trackerItemId) ?? null) : null;
  if (input.trackerItemId && !item) return null;
  const leadStakeholder = item?.leadId ? (d.leads.find((l) => l.id === item.leadId)?.stakeholderId ?? null) : null;
  const sid = input.stakeholderId ?? item?.stakeholderId ?? leadStakeholder;
  const stakeholder = d.stakeholders.find((s) => s.id === sid);
  return stakeholder ? { stakeholder, item } : null;
}

/** Sample only: the note for one stakeholder, built in code from the sample (no API, no database). */
export async function sampleBriefingNote(input: { trackerItemId: string | null; stakeholderId: string | null }): Promise<ActionResult<BriefingNoteContent>> {
  const parsed = DraftInput.safeParse({ ...input, expertReview: false });
  if (!parsed.success) return { ok: false, error: "Pick a tracker item first." };
  const target = resolveTarget(sampleDossier, parsed.data);
  if (!target) return { ok: false, error: "That stakeholder isn't in the sample's tracker." };
  if (target.stakeholder.id === SAMPLE_NOTE.stakeholderId) return { ok: true, data: { ...SAMPLE_NOTE, meeting: { ...SAMPLE_NOTE.meeting, at: target.item?.meetingAt ?? null } } };
  return { ok: true, data: mockNote(sampleDossier, target, new Date()).content };
}

/** DOC-7: start the AI draft of a briefing note for one tracker item or stakeholder. */
export async function startBriefingDraft(
  dossierId: string,
  input: { trackerItemId: string | null; stakeholderId: string | null; expertReview: boolean },
): Promise<ActionResult<{ documentId: string }>> {
  if (dossierId === SAMPLE_DOSSIER_ID) return { ok: false, error: SAMPLE };
  const parsed = DraftInput.safeParse(input);
  if (!isDossierId(dossierId) || !parsed.success) return { ok: false, error: "Pick who the meeting is with, then request again." };
  try {
    const d = await loadDossier(dossierId);
    if (!d) return { ok: false, error: "This dossier couldn't be found." };
    const target = resolveTarget(d, parsed.data);
    if (!target) return { ok: false, error: "That stakeholder isn't in this dossier's tracker." };
    const limit = await countDossierAi(bumpUsage, d.id, new Date());
    if (!limit.ok) return { ok: false, error: limit.error };

    const db = getDb();
    if (!db) return { ok: false, error: FAILED };
    const req = await db
      .from("document_requests")
      .insert({ dossier_id: d.id, type: "briefing_note", tracker_item_id: target.item?.id ?? null, expert_review: parsed.data.expertReview })
      .select("id")
      .single();
    if (req.error) throw new Error(req.error.message);
    const doc = await db
      .from("documents")
      .insert({
        dossier_id: d.id,
        request_id: req.data.id,
        type: "briefing_note",
        title: `${target.stakeholder.short ?? target.stakeholder.name}: briefing note`,
        pages: NOTE_PAGES,
        status: "drafting",
      })
      .select("id")
      .single();
    if (doc.error) throw new Error(doc.error.message);
    const documentId = doc.data.id as string;
    after(() => draft(d, target, documentId, parsed.data.expertReview));
    return { ok: true, data: { documentId } };
  } catch (e) {
    console.error("[drafts] start:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

/** drafting → failed → (Try again) → drafting. Counts against the same daily limit. */
export async function retryBriefingDraft(dossierId: string, documentId: string): Promise<ActionResult<null>> {
  if (dossierId === SAMPLE_DOSSIER_ID) return { ok: false, error: SAMPLE };
  const id = z.string().uuid().safeParse(documentId);
  if (!isDossierId(dossierId) || !id.success) return { ok: false, error: "That document couldn't be found." };
  try {
    const d = await loadDossier(dossierId);
    const db = getDb();
    if (!d || !db) return { ok: false, error: FAILED };
    const doc = d.documents.find((x) => x.id === id.data && x.type === "briefing_note" && x.status === "failed");
    if (!doc) return { ok: false, error: "Only a failed draft can be tried again." };
    const request = d.documentRequests.find((r) => r.id === doc.requestId);
    const target = resolveTarget(d, { trackerItemId: request?.trackerItemId ?? null, stakeholderId: doc.content?.stakeholderId ?? null });
    if (!target) return { ok: false, error: "That stakeholder is no longer in this dossier's tracker." };
    const limit = await countDossierAi(bumpUsage, d.id, new Date());
    if (!limit.ok) return { ok: false, error: limit.error };
    const up = await db.from("documents").update({ status: "drafting" }).eq("id", doc.id).eq("dossier_id", d.id);
    if (up.error) throw new Error(up.error.message);
    after(() => draft(d, target, doc.id, request?.expertReview ?? false));
    return { ok: true, data: null };
  } catch (e) {
    console.error("[drafts] retry:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

/** Runs after the response: write the note (or mark it failed) and log removed sentences. */
async function draft(d: Dossier, target: NoteTarget, documentId: string, expertReview: boolean): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date();
  try {
    let result: NoteResult;
    if (noteIsLive()) {
      const r = await liveNote(d, target, { store: ledgerStore, runId: null, dossierId: d.id, purpose: "briefing_note" }, now);
      if (!r.ok) throw new Error(r.reason);
      result = r.result;
    } else {
      result = mockNote(d, target, now);
    }
    if (result.removed.length) {
      await db.from("brief_check_log").insert(result.removed.map((x) => ({ document_id: documentId, sentence: x.sentence, reason: x.reason })));
    }
    const up = await db
      .from("documents")
      .update({
        content: result.content,
        status: expertReview ? "in_review" : "draft_ready",
        facts_checked_at: now.toISOString().slice(0, 10),
      })
      .eq("id", documentId)
      .eq("dossier_id", d.id);
    if (up.error) throw new Error(up.error.message);
  } catch (e) {
    console.error("[drafts] draft:", e instanceof Error ? e.message : e);
    await db.from("documents").update({ status: "failed" }).eq("id", documentId).eq("dossier_id", d.id);
  }
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
