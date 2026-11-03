"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { retryBriefingDraft, startBriefingDraft } from "@/app/actions/drafts";
import { requestManual } from "@/lib/db/documents";
import { isDossierId, isSampleId } from "@/lib/ids";
import type { ActionResult, DocumentType } from "@/lib/types";

// Document requests for real dossiers (spec §11.3, §15): zod → dossier id check → work →
// ActionResult. A briefing note starts the AI draft (engine, with its daily limit and cost
// ledger); a risk deck or watch-list update is a manual service the team fulfils with the ops
// scripts. The sample never reaches these: its changes stay in the browser (SHELL-3).

const SAMPLE = "Changes to the sample stay in this browser.";
const FAILED = "That request didn't go through. Your data is safe, so please try again.";

const RequestInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("briefing_note"), trackerItemId: z.string().min(1).max(64), expertReview: z.boolean() }),
  z.object({ type: z.enum(["risk_deck", "watch_list"]) }),
]);

export async function requestDocument(
  dossierId: string,
  input: z.input<typeof RequestInput>,
): Promise<ActionResult<{ documentId: string; type: DocumentType }>> {
  if (isSampleId(dossierId)) return { ok: false, error: SAMPLE };
  const parsed = RequestInput.safeParse(input);
  if (!isDossierId(dossierId) || !parsed.success) return { ok: false, error: "Pick a document type and, for a briefing note, the meeting." };
  const v = parsed.data;
  if (v.type === "briefing_note") {
    const r = await startBriefingDraft(dossierId, { trackerItemId: v.trackerItemId, stakeholderId: null, expertReview: v.expertReview });
    if (!r.ok) return r;
    refresh();
    return { ok: true, data: { documentId: r.data.documentId, type: v.type } };
  }
  try {
    const documentId = await requestManual(dossierId, v.type);
    refresh();
    return { ok: true, data: { documentId, type: v.type } };
  } catch (e) {
    console.error("[docs] request:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

/** drafting → failed → Try again. */
export async function retryDraft(dossierId: string, documentId: string): Promise<ActionResult<null>> {
  const r = await retryBriefingDraft(dossierId, documentId);
  if (r.ok) refresh();
  return r;
}
