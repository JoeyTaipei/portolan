import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntroRequest, TrackerItem } from "@/lib/types";
import { getDb } from "./client";

// Network writes for real dossiers (spec §11.5, NET-4, NET-6): save a lead to the tracker and
// request a Portolan intro. Every call is scoped by dossier id; a lead or stakeholder from
// another dossier is "not found". Server only; the secret-key client bypasses RLS.

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
  origin: r.origin as TrackerItem["origin"],
  createdAt: r.created_at as string,
});

/**
 * NET-4: mark the lead saved and add it to the tracker in Found (once). Events carry their
 * date as the meeting date, so the debrief comes due the day after.
 */
export async function saveLead(dossierId: string, leadId: string): Promise<TrackerItem | null> {
  const lead = must(
    await db().from("leads").select("id, type, event_date").eq("id", leadId).eq("dossier_id", dossierId).maybeSingle(),
    "read lead",
  ) as Row | null;
  if (!lead) return null;
  must(await db().from("leads").update({ status: "saved" }).eq("id", leadId).eq("dossier_id", dossierId), "save lead");
  const existing = must(
    await db().from("tracker_items").select("*").eq("dossier_id", dossierId).eq("lead_id", leadId).maybeSingle(),
    "read tracker item",
  ) as Row | null;
  if (existing) return toItem(existing);
  const r = await db()
    .from("tracker_items")
    .insert({
      dossier_id: dossierId,
      lead_id: leadId,
      stage: "found",
      meeting_at: lead.type === "event" ? (lead.event_date as string | null) : null,
      origin: "network",
    })
    .select("*")
    .single();
  return toItem(must(r, "add tracker item") as Row);
}

/** NET-6: one open intro request per stakeholder; asking again returns the existing one. */
export async function requestIntro(dossierId: string, stakeholderId: string, purpose: string): Promise<IntroRequest | null> {
  const owner = must(
    await db().from("stakeholders").select("id").eq("id", stakeholderId).eq("dossier_id", dossierId).maybeSingle(),
    "check stakeholder",
  );
  if (!owner) return null;
  const open = must(
    await db()
      .from("intro_requests")
      .select("*")
      .eq("dossier_id", dossierId)
      .eq("stakeholder_id", stakeholderId)
      .in("status", ["received", "in_progress"])
      .maybeSingle(),
    "read intro",
  ) as Row | null;
  const row = open ?? (must(await db().from("intro_requests").insert({ dossier_id: dossierId, stakeholder_id: stakeholderId, purpose }).select("*").single(), "add intro") as Row);
  return {
    id: row.id as string,
    dossierId: row.dossier_id as string,
    stakeholderId: row.stakeholder_id as string,
    purpose: row.purpose as string,
    status: row.status as IntroRequest["status"],
    resultNote: (row.result_note as string) ?? null,
    createdAt: row.created_at as string,
  };
}
