import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Debrief, Edge, Fact, PlaybookOutcome, Source, SupportStatement, TrackerItem, TrackerOrigin } from "@/lib/types";
import { getDb } from "./client";

// Tracker writes for real dossiers (spec §13: tracker_items, debriefs, playbook_outcomes, plus
// the debrief's source and support statement). Every call is scoped by dossier id: an item or
// debrief from another dossier is "not found". Server only; the secret-key client bypasses RLS.

type Row = Record<string, unknown>;

function db(): SupabaseClient {
  const c = getDb();
  if (!c) throw new Error("The database isn't configured on this server.");
  return c;
}

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

const toItem = (r: Row): TrackerItem => ({
  id: r.id as string,
  dossierId: r.dossier_id as string,
  stakeholderId: (r.stakeholder_id as string) ?? null,
  leadId: (r.lead_id as string) ?? null,
  stage: r.stage as TrackerItem["stage"],
  nextStep: (r.next_step as string) ?? null,
  dueDate: (r.due_date as string) ?? null,
  meetingAt: (r.meeting_at as string) ?? null,
  origin: r.origin as TrackerOrigin,
  createdAt: r.created_at as string,
});

export async function findItem(dossierId: string, itemId: string): Promise<TrackerItem | null> {
  const r = await db().from("tracker_items").select("*").eq("id", itemId).eq("dossier_id", dossierId).maybeSingle();
  const row = must(r, "read tracker item") as Row | null;
  return row ? toItem(row) : null;
}

/** True when the stakeholder or lead belongs to this dossier. */
export async function ownsTarget(dossierId: string, target: { stakeholderId: string | null; leadId: string | null }): Promise<boolean> {
  const [table, id] = target.stakeholderId ? ["stakeholders", target.stakeholderId] : ["leads", target.leadId];
  if (!id) return false;
  const r = await db().from(table).select("id").eq("id", id).eq("dossier_id", dossierId).maybeSingle();
  return must(r, "check owner") !== null;
}

export async function insertItem(
  dossierId: string,
  target: { stakeholderId: string | null; leadId: string | null; nextStep: string | null },
  origin: TrackerOrigin,
): Promise<TrackerItem> {
  const col = target.stakeholderId ? "stakeholder_id" : "lead_id";
  const existing = await db()
    .from("tracker_items")
    .select("*")
    .eq("dossier_id", dossierId)
    .eq(col, target.stakeholderId ?? target.leadId)
    .maybeSingle();
  const found = must(existing, "read tracker item") as Row | null;
  if (found) return toItem(found);
  const r = await db()
    .from("tracker_items")
    .insert({
      dossier_id: dossierId,
      stakeholder_id: target.stakeholderId,
      lead_id: target.leadId,
      stage: "found",
      next_step: target.nextStep,
      origin,
    })
    .select("*")
    .single();
  return toItem(must(r, "add tracker item") as Row);
}

export async function updateItem(
  dossierId: string,
  itemId: string,
  edit: Partial<Pick<TrackerItem, "stage" | "nextStep" | "dueDate" | "meetingAt">>,
): Promise<TrackerItem | null> {
  const patch: Row = {};
  if (edit.stage !== undefined) patch.stage = edit.stage;
  if (edit.nextStep !== undefined) patch.next_step = edit.nextStep;
  if (edit.dueDate !== undefined) patch.due_date = edit.dueDate;
  if (edit.meetingAt !== undefined) patch.meeting_at = edit.meetingAt;
  const r = await db().from("tracker_items").update(patch).eq("id", itemId).eq("dossier_id", dossierId).select("*").maybeSingle();
  const row = must(r, "update tracker item") as Row | null;
  return row ? toItem(row) : null;
}

export async function deleteItem(dossierId: string, itemId: string): Promise<boolean> {
  const r = await db().from("tracker_items").delete().eq("id", itemId).eq("dossier_id", dossierId).select("id");
  return (must(r, "remove tracker item") as Row[]).length > 0;
}

/**
 * Store a debrief computed by `applyDebrief` (ids are fresh uuids). Order follows the foreign
 * keys: playbook row → debrief → source → statement → item. If a later insert fails, the rows
 * already written are removed so nothing half-saved changes a score.
 */
export async function insertDebrief(rows: {
  dossierId: string;
  item: TrackerItem;
  debrief: Debrief;
  source: Source | null;
  statement: SupportStatement | null;
  playbook: PlaybookOutcome | null;
  /** TRK-10: the memo's influence facts and "who else must agree" ties (cascade with the debrief). */
  facts: Fact[];
  edges: Edge[];
}): Promise<void> {
  const c = db();
  const { dossierId, item, debrief, source, statement, playbook, facts, edges } = rows;
  try {
    if (playbook) {
      // Anonymised (TRK-5): only these columns exist on the table, and only these are sent.
      must(
        await c.from("playbook_outcomes").insert({
          id: playbook.id,
          route: playbook.route,
          category: playbook.category,
          overall: playbook.overall,
          next_step_agreed: playbook.nextStepAgreed,
        }),
        "add playbook outcome",
      );
    }
    must(
      await c.from("debriefs").insert({
        id: debrief.id,
        tracker_item_id: debrief.trackerItemId,
        stakeholder_id: debrief.stakeholderId,
        meeting_at: debrief.meetingAt,
        reporter: debrief.reporter,
        overall: debrief.overall,
        next_step_agreed: debrief.nextStepAgreed,
        notes: debrief.notes,
        support_before: debrief.supportBefore,
        support_after: debrief.supportAfter,
        stage_before: debrief.stageBefore,
        stage_after: debrief.stageAfter,
        added_next_step: debrief.addedNextStep,
        playbook_outcome_id: debrief.playbookOutcomeId,
        memo: debrief.memo ?? null,
      }),
      "save debrief",
    );
    if (source && statement) {
      must(
        await c.from("sources").insert({
          id: source.id,
          dossier_id: dossierId,
          label: source.label,
          url: null,
          title: source.title,
          source_type: "debrief",
          excerpt: source.excerpt,
          excerpt_lang: "en",
          reliability: "A",
          credibility: 1,
          credibility_reason: source.credibilityReason,
          published_at: source.publishedAt,
          verified_at: source.verifiedAt,
          origin: "debrief",
          accepted: true,
        }),
        "save debrief source",
      );
      must(
        await c.from("support_statements").insert({
          id: statement.id,
          stakeholder_id: statement.stakeholderId,
          debrief_id: debrief.id,
          rating: statement.rating,
          summary: statement.summary,
          source_id: source.id,
          stated_at: statement.statedAt,
        }),
        "save debrief statement",
      );
      if (facts.length) {
        must(
          await c.from("facts").insert(
            facts.map((f) => ({
              id: f.id,
              stakeholder_id: f.stakeholderId,
              field: f.field,
              value: f.value,
              rating: f.rating,
              quote: f.quote,
              source_ids: [source.id],
              status: "sourced",
              debrief_id: debrief.id,
            })),
          ),
          "save memo facts",
        );
      }
      if (edges.length) {
        must(
          await c.from("edges").insert(
            edges.map((e) => ({
              id: e.id,
              dossier_id: dossierId,
              a_id: e.aId,
              b_id: e.bId,
              relation: e.relation,
              source_ids: [source.id],
              status: "sourced",
              debrief_id: debrief.id,
            })),
          ),
          "save memo ties",
        );
      }
    }
    must(
      await c
        .from("tracker_items")
        .update({ stage: item.stage, next_step: item.nextStep, due_date: item.dueDate })
        .eq("id", item.id)
        .eq("dossier_id", dossierId),
      "update tracker item",
    );
  } catch (e) {
    await removeDebriefRows(c, dossierId, debrief.id, source?.id ?? null, playbook?.id ?? null);
    throw e;
  }
}

async function removeDebriefRows(c: SupabaseClient, dossierId: string, debriefId: string, sourceId: string | null, playbookId: string | null) {
  // Deleting the debrief cascades to its statement, memo facts and ties; the source and playbook row go separately.
  await c.from("debriefs").delete().eq("id", debriefId);
  if (sourceId) await c.from("sources").delete().eq("id", sourceId).eq("dossier_id", dossierId).eq("origin", "debrief");
  if (playbookId) await c.from("playbook_outcomes").delete().eq("id", playbookId);
}

/**
 * TRK-6 Undo: delete the debrief (its statement, memo facts and ties cascade), its source and its playbook row, and
 * put the item back: stage from the debrief's own record, next step as it was before.
 */
export async function deleteDebrief(
  dossierId: string,
  debriefId: string,
  restore: { nextStep: string | null; dueDate: string | null },
): Promise<boolean> {
  const c = db();
  const r = await c.from("debriefs").select("id, tracker_item_id, stage_before, added_next_step, playbook_outcome_id").eq("id", debriefId).maybeSingle();
  const d = must(r, "read debrief") as Row | null;
  if (!d) return false;
  const item = await findItem(dossierId, d.tracker_item_id as string);
  if (!item) return false;
  const st = must(await c.from("support_statements").select("source_id").eq("debrief_id", debriefId), "read debrief statement") as Row[];
  for (const s of st) {
    must(
      await c.from("sources").delete().eq("id", s.source_id as string).eq("dossier_id", dossierId).eq("origin", "debrief"),
      "remove debrief source",
    );
  }
  must(await c.from("debriefs").delete().eq("id", debriefId), "remove debrief");
  if (d.playbook_outcome_id) must(await c.from("playbook_outcomes").delete().eq("id", d.playbook_outcome_id as string), "remove playbook outcome");
  const patch: Row = { stage: d.stage_before };
  if (d.added_next_step !== null) {
    patch.next_step = restore.nextStep;
    patch.due_date = restore.dueDate;
  }
  must(await c.from("tracker_items").update(patch).eq("id", item.id).eq("dossier_id", dossierId), "restore tracker item");
  return true;
}
