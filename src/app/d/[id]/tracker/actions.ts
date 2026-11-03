"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { loadDossier } from "@/lib/db/load-dossier";
import { deleteDebrief, deleteItem, findItem, insertDebrief, insertItem, ownsTarget, updateItem } from "@/lib/db/tracker";
import { isDossierId } from "@/lib/ids";
import { applyDebrief, NOTES_MAX, trackerState, type DebriefReceipt } from "@/lib/tracker/flow";
import { ALSO_AGREE_MAX, MEMO_NOTE_MAX, MET_ROLE_MAX } from "@/lib/tracker/memo";
import type { ActionResult, Debrief, TrackerItem } from "@/lib/types";

// Tracker writes for real dossiers (spec §15): zod → dossier id check → work → ActionResult.
// The sample never reaches these: its changes stay in the browser (SHELL-3).

const SAMPLE = "Changes to the sample stay in this browser.";
const FAILED = "That didn't save. Your data is safe, so please try again.";

const id = z.string().min(1).max(64);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stage = z.enum(["found", "contacted", "met", "partner"]);

function checkDossier(dossierId: unknown): string | null {
  const parsed = z.string().safeParse(dossierId);
  return parsed.success && isDossierId(parsed.data) ? parsed.data : null;
}

async function run<T>(what: string, work: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await work();
  } catch (e) {
    console.error(`[tracker] ${what}:`, e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

const AddInput = z
  .object({ stakeholderId: id.nullable(), leadId: id.nullable(), origin: z.enum(["map", "network", "manual"]) })
  .refine((v) => (v.stakeholderId === null) !== (v.leadId === null));

export async function addToTracker(dossierId: string, input: z.input<typeof AddInput>): Promise<ActionResult<TrackerItem>> {
  if (dossierId === "sample") return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const parsed = AddInput.safeParse(input);
  if (!did || !parsed.success) return { ok: false, error: "That stakeholder couldn't be added. Reload the page and try again." };
  return run("add", async () => {
    const v = parsed.data;
    if (!(await ownsTarget(did, v))) return { ok: false, error: "That stakeholder isn't in this dossier." };
    const item = await insertItem(did, { stakeholderId: v.stakeholderId, leadId: v.leadId, nextStep: null }, v.origin);
    refresh();
    return { ok: true, data: item };
  });
}

const EditInput = z.object({
  stage: stage.optional(),
  nextStep: z.string().trim().max(300).nullable().optional(),
  dueDate: day.nullable().optional(),
  meetingAt: day.nullable().optional(),
});

export async function editTrackerItem(dossierId: string, itemId: string, edit: z.input<typeof EditInput>): Promise<ActionResult<TrackerItem>> {
  if (dossierId === "sample") return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const iid = id.safeParse(itemId);
  const parsed = EditInput.safeParse(edit);
  if (!did || !iid.success || !parsed.success) return { ok: false, error: "Check the date and the next step, then save again." };
  return run("edit", async () => {
    const v = parsed.data;
    const item = await updateItem(did, iid.data, { ...v, nextStep: v.nextStep === "" ? null : v.nextStep });
    if (!item) return { ok: false, error: "That item is no longer in the tracker." };
    refresh();
    return { ok: true, data: item };
  });
}

export async function removeTrackerItem(dossierId: string, itemId: string): Promise<ActionResult<null>> {
  if (dossierId === "sample") return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const iid = id.safeParse(itemId);
  if (!did || !iid.success) return { ok: false, error: "That item couldn't be removed. Reload the page and try again." };
  return run("remove", async () => {
    if (!(await deleteItem(did, iid.data))) return { ok: false, error: "That item is no longer in the tracker." };
    refresh();
    return { ok: true, data: null };
  });
}

// TRK-9 memo: every field bounded; null / [] = "Not sure". cleanMemo (flow) also drops a China
// stakeholder's "who we met" and any "also agree" id not on this map.
const rating = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable();
const topic = z.enum(["local_production", "non_red", "test_data", "price", "timeline", "budget", "export_control", "cyber", "interop"]);
const note = z.string().max(MEMO_NOTE_MAX).nullable();
const Memo = z.object({
  format: z.enum(["in_person", "video", "event"]).nullable(),
  metRole: z.string().max(MET_ROLE_MAX).nullable(),
  initiatedBy: z.enum(["us", "them", "intro"]).nullable(),
  authority: rating,
  budget: rating,
  access: rating,
  recent: rating,
  alsoAgree: z.array(id).max(ALSO_AGREE_MAX),
  stance: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]).nullable(),
  priorities: z.array(topic).max(9),
  prioritiesNote: note,
  concerns: z.array(topic).max(9),
  concernsNote: note,
  timeline: z.enum(["quarter", "year", "next_budget", "unknown"]).nullable(),
  budgetStatus: z.enum(["funded", "requested", "not_yet", "unknown"]).nullable(),
  asks: z.array(z.enum(["demo", "test_data", "export_class", "partner", "pricing", "documents"])).max(6),
  asksNote: note,
});

const DebriefInput = z.object({
  trackerItemId: id,
  overall: z.enum(["positive", "neutral", "negative"]),
  nextStepAgreed: z.boolean(),
  notes: z.string().max(NOTES_MAX).nullable(),
  addToPlaybook: z.boolean(),
  nextStep: z.object({ text: z.string().trim().min(1).max(300), dueDate: day }).nullable(),
  memo: Memo.nullable().optional(),
});

export async function saveDebrief(dossierId: string, input: z.input<typeof DebriefInput>): Promise<ActionResult<DebriefReceipt>> {
  if (dossierId === "sample") return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const parsed = DebriefInput.safeParse(input);
  if (!did || !parsed.success) return { ok: false, error: "Pick an overall result, keep notes under 1000 characters and memo notes under 300, then save." };
  return run("save debrief", async () => {
    const d = await loadDossier(did);
    if (!d || !(await findItem(did, parsed.data.trackerItemId))) return { ok: false, error: "That item is no longer in the tracker." };
    const ids = {
      debrief: crypto.randomUUID(),
      source: crypto.randomUUID(),
      statement: crypto.randomUUID(),
      playbook: crypto.randomUUID(),
      facts: Array.from({ length: 4 }, () => crypto.randomUUID()),
      edges: Array.from({ length: ALSO_AGREE_MAX }, () => crypto.randomUUID()),
    };
    const { state, receipt } = applyDebrief(trackerState(d), parsed.data, ids, new Date());
    await insertDebrief({
      dossierId: did,
      item: state.tracker.find((t) => t.id === parsed.data.trackerItemId) as TrackerItem,
      debrief: state.debriefs.find((x) => x.id === ids.debrief) as Debrief,
      source: state.sources.find((s) => s.id === ids.source) ?? null,
      statement: state.statements.find((s) => s.id === ids.statement) ?? null,
      playbook: state.playbook.find((p) => p.id === ids.playbook) ?? null,
      facts: state.facts.filter((f) => f.debriefId === ids.debrief),
      edges: state.edges.filter((e) => e.debriefId === ids.debrief),
    });
    refresh();
    return { ok: true, data: receipt };
  });
}

const UndoInput = z.object({ nextStep: z.string().max(300).nullable(), dueDate: day.nullable() });

export async function undoDebrief(dossierId: string, debriefId: string, restore: z.input<typeof UndoInput>): Promise<ActionResult<null>> {
  if (dossierId === "sample") return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const deb = id.safeParse(debriefId);
  const parsed = UndoInput.safeParse(restore);
  if (!did || !deb.success || !parsed.success) return { ok: false, error: "Undo didn't work. Reload the page and try again." };
  return run("undo debrief", async () => {
    if (!(await deleteDebrief(did, deb.data, parsed.data))) return { ok: false, error: "That debrief was already removed." };
    refresh();
    return { ok: true, data: null };
  });
}
