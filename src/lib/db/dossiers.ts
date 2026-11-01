import "server-only";
import type { AliasRow } from "@/lib/research/filter";
import type { Category, StakeholderStatus } from "@/lib/types";
import { db } from "./research";

// Dossier rows, the email outbox and the refresh bookkeeping (spec §7.1, §7.6, §13).
// Server only. The email is written here and never read back by the screens (read.ts never
// selects it): `email` for the outbox and manual follow-up, `email_hash` for counting.

type Row = Record<string, unknown>;

function must<T>(r: { data: T | null; error: { message: string; code?: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

export interface NewDossier {
  id: string;
  shareId: string;
  name: string;
  company: string;
  product: string;
  goal: string;
  email: string;
  emailHash: string;
  certifications: string | null;
  priceRange: string | null;
  twPartners: string | null;
  clientDeadline: string | null;
}

/** Insert one dossier. Returns false on an id or share-id clash so the caller draws new ids. */
export async function insertDossier(d: NewDossier): Promise<boolean> {
  const r = await db().from("dossiers").insert({
    id: d.id,
    share_id: d.shareId,
    name: d.name,
    company: d.company,
    product: d.product,
    market: "TW",
    goal: d.goal,
    email: d.email,
    email_hash: d.emailHash,
    certifications: d.certifications,
    price_range: d.priceRange,
    tw_partners: d.twPartners,
    client_deadline: d.clientDeadline,
    status: "researching",
  });
  if (r.error?.code === "23505") return false; // unique violation: never reuse, draw again
  must(r, "insert dossier");
  return true;
}

export async function insertOutbox(dossierId: string, toEmail: string, kind: string) {
  must(await db().from("email_outbox").insert({ dossier_id: dossierId, to_email: toEmail, kind }), "insert outbox");
}

export interface DossierState {
  id: string;
  status: string;
  emailHash: string | null;
  currentRunId: string | null;
}

export async function getDossierState(id: string): Promise<DossierState | null> {
  const r = await db().from("dossiers").select("id, status, email_hash, current_run_id").eq("id", id).maybeSingle();
  const row = must(r, "get dossier state") as Row | null;
  if (!row) return null;
  return {
    id: row.id as string,
    status: row.status as string,
    emailHash: (row.email_hash as string) ?? null,
    currentRunId: (row.current_run_id as string) ?? null,
  };
}

/** Today's count for one usage scope, without adding to it (RE-BRIEF shows what's left). */
export async function usageCount(day: string, scope: string): Promise<number> {
  const r = await db().from("usage_counters").select("count").eq("day", day).eq("scope", scope).maybeSingle();
  const row = must(r, "usage count") as Row | null;
  return row ? Number(row.count) : 0;
}

// ─── Refresh (spec §7.6) ─────────────────────────────────────────────────────

export interface RefreshStakeholder {
  id: string;
  name: string;
  nameZh: string | null;
  category: Category;
  status: StakeholderStatus;
  lastRunId: string | null;
}

export async function refreshStakeholders(dossierId: string): Promise<RefreshStakeholder[]> {
  const r = await db().from("stakeholders").select("id, name, name_zh, category, status, last_run_id").eq("dossier_id", dossierId);
  return (must(r, "refresh stakeholders") as Row[]).map((x) => ({
    id: x.id as string,
    name: x.name as string,
    nameZh: (x.name_zh as string) ?? null,
    category: x.category as Category,
    status: x.status as StakeholderStatus,
    lastRunId: (x.last_run_id as string) ?? null,
  }));
}

/** Matched stakeholders: researched again in this run; their id (and debriefs, tracker, ties) stay. */
export async function markMatched(ids: string[], runId: string) {
  if (!ids.length) return;
  must(await db().from("stakeholders").update({ status: "still_researching", last_run_id: runId }).in("id", ids), "mark matched");
}

/** Old stakeholders this run didn't find: kept, still scored, labelled (spec §7.6). */
export async function markNotFound(dossierId: string, keepIds: string[]) {
  let q = db().from("stakeholders").update({ status: "not_found_latest" }).eq("dossier_id", dossierId).neq("status", "pending_check");
  if (keepIds.length) q = q.not("id", "in", `(${keepIds.join(",")})`);
  must(await q, "mark not found");
}

export async function setPending(ids: string[]) {
  if (!ids.length) return;
  must(await db().from("stakeholders").update({ status: "pending_check" }).in("id", ids), "set pending");
}

/** This dossier's own aliases (from "Same as X") plus the site-wide seeds. */
export async function aliasRows(dossierId: string): Promise<AliasRow[]> {
  const r = await db().from("org_aliases").select("alias, stakeholder_key").or(`dossier_id.is.null,dossier_id.eq.${dossierId}`);
  return (must(r, "aliases") as Row[]).map((x) => ({ alias: x.alias as string, stakeholderKey: x.stakeholder_key as string }));
}

/** "Same as X": keep X, write the alias for next time, drop the duplicate node. */
export async function mergePending(dossierId: string, pendingId: string, existingId: string): Promise<boolean> {
  const client = db();
  const both = must(
    await client.from("stakeholders").select("id, name, name_zh, status").eq("dossier_id", dossierId).in("id", [pendingId, existingId]),
    "merge read",
  ) as Row[];
  const pending = both.find((x) => x.id === pendingId);
  const existing = both.find((x) => x.id === existingId);
  if (!pending || !existing || pending.status !== "pending_check" || existing.status === "pending_check") return false;
  const aliases = [pending.name, pending.name_zh].filter((a): a is string => typeof a === "string" && a.trim().length > 0);
  for (const alias of aliases) {
    const r = await client.from("org_aliases").insert({ dossier_id: dossierId, alias, stakeholder_key: existingId });
    if (r.error && r.error.code !== "23505") throw new Error(`alias insert: ${r.error.message}`);
  }
  must(await client.from("stakeholders").delete().eq("id", pendingId).eq("dossier_id", dossierId), "merge delete");
  if (existing.status === "not_found_latest") {
    must(await client.from("stakeholders").update({ status: "active" }).eq("id", existingId), "merge restore");
  }
  return true;
}

/** "Different": the node joins the map as its own stakeholder. */
export async function keepPending(dossierId: string, pendingId: string): Promise<boolean> {
  const r = await db()
    .from("stakeholders")
    .update({ status: "active" })
    .eq("id", pendingId)
    .eq("dossier_id", dossierId)
    .eq("status", "pending_check")
    .select("id");
  return (must(r, "keep pending") as Row[]).length === 1;
}

/** Stakeholders that already have a network card, so a refresh doesn't add a second one. */
export async function leadStakeholderIds(dossierId: string): Promise<Set<string>> {
  const r = await db().from("leads").select("stakeholder_id").eq("dossier_id", dossierId);
  return new Set((must(r, "lead stakeholders") as Row[]).map((x) => x.stakeholder_id as string).filter(Boolean));
}
