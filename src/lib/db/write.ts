import "server-only";
import type { RateResult, RateSource } from "@/lib/claude/rate";
import type { KeptEntity } from "@/lib/research/filter";
import { labelNumber, sourceKey, type KnownSources, type SourceDraft } from "@/lib/research/sources";
import type { Category, Json, LeadMatch, LeadType, Sentence, StakeholderStatus, TimedEventKind } from "@/lib/types";
import { db } from "./research";

// Writes the research results (spec §13): stakeholders, sources (rejected ones too), facts,
// statements, edges, timed events and leads. China person rows are filtered before this point;
// the stakeholders_china_org_only check constraint is the backstop.

type Row = Record<string, unknown>;

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

// ─── Stakeholders ────────────────────────────────────────────────────────────

/** Deterministic spot in the 3D map, each −1…1: one sector per category, spread by index. */
const SECTOR: Record<Category, number> = { gov: 0, leg: 1, cap: 2, ind: 3, evt: 4 };
export function mapPosition(category: Category, index: number): [number, number, number] {
  const angle = ((SECTOR[category] + ((index * 0.37) % 1) * 0.8) / 5) * 2 * Math.PI;
  const r = 0.35 + ((index * 0.61) % 1) * 0.5;
  const z = (((index * 0.53) % 1) - 0.5) * 1.2;
  return [Number((r * Math.cos(angle)).toFixed(3)), Number((r * Math.sin(angle)).toFixed(3)), Number(z.toFixed(3))];
}

/** New stakeholders start as "Still researching" until their rating is written. Returns key → id. */
export async function insertStakeholders(dossierId: string, runId: string, entities: KeptEntity[]): Promise<Map<string, string>> {
  if (!entities.length) return new Map();
  const rows = entities.map((e, i) => {
    const [x, y, z] = mapPosition(e.category, i);
    return {
      dossier_id: dossierId,
      name: e.name,
      name_zh: e.nameZh,
      short: null,
      category: e.category,
      is_person: e.isChina ? false : e.isPerson,
      is_china: e.isChina,
      role: e.whyRelevant || null,
      x,
      y,
      z,
      status: "still_researching",
      first_run_id: runId,
      last_run_id: runId,
    };
  });
  const r = await db().from("stakeholders").insert(rows).select("id, name");
  const out = new Map<string, string>();
  const byName = new Map((must(r, "insert stakeholders") as Row[]).map((x) => [x.name as string, x.id as string]));
  for (const e of entities) {
    const id = byName.get(e.name);
    if (id) out.set(e.key, id);
  }
  return out;
}

export interface StakeholderLite {
  id: string;
  name: string;
  nameZh: string | null;
  category: Category;
  isChina: boolean;
  isPerson: boolean;
  status: StakeholderStatus;
  role: string | null;
}

export async function listStakeholders(dossierId: string): Promise<StakeholderLite[]> {
  const r = await db().from("stakeholders").select("id, name, name_zh, category, is_china, is_person, status, role").eq("dossier_id", dossierId);
  return (must(r, "list stakeholders") as Row[]).map((x) => ({
    id: x.id as string,
    name: x.name as string,
    nameZh: (x.name_zh as string) ?? null,
    category: x.category as Category,
    isChina: x.is_china as boolean,
    isPerson: x.is_person as boolean,
    status: x.status as StakeholderStatus,
    role: (x.role as string) ?? null,
  }));
}

export async function updateStakeholder(id: string, patch: { status?: StakeholderStatus; city?: string | null; name_zh?: string | null; role?: string }) {
  must(await db().from("stakeholders").update(patch).eq("id", id), "update stakeholder");
}

export async function setStakeholdersStatus(dossierId: string, from: StakeholderStatus, to: StakeholderStatus) {
  must(await db().from("stakeholders").update({ status: to }).eq("dossier_id", dossierId).eq("status", from), "set stakeholders");
}

// ─── Sources ─────────────────────────────────────────────────────────────────

/** What sources.ts needs to de-duplicate and keep labels unique per dossier. */
export async function sourceIndex(dossierId: string): Promise<{ known: KnownSources; nextLabel: number }> {
  const r = await db().from("sources").select("label, url, excerpt, accepted").eq("dossier_id", dossierId);
  const known: KnownSources = new Map();
  let max = 0;
  for (const s of must(r, "source index") as Row[]) {
    max = Math.max(max, labelNumber(s.label as string));
    if (s.url) known.set(sourceKey(s.url as string, s.excerpt as string), { label: s.label as string, accepted: s.accepted as boolean });
  }
  return { known, nextLabel: max + 1 };
}

/** Insert new sources; returns label → id. A label clash (two writers at once) throws and the step retries. */
export async function insertSources(dossierId: string, runId: string, drafts: SourceDraft[]): Promise<Map<string, string>> {
  if (!drafts.length) return new Map();
  const r = await db()
    .from("sources")
    .insert(
      drafts.map((d) => ({
        dossier_id: dossierId,
        label: d.label,
        url: d.url,
        title: d.title,
        publisher: d.publisher,
        source_type: d.sourceType,
        excerpt: d.excerpt,
        excerpt_lang: d.excerptLang,
        reliability: d.reliability,
        credibility: d.credibility,
        verified_at: d.verifiedAt,
        origin: "parallel_basis",
        accepted: d.accepted,
        reject_reason: d.rejectReason,
        run_id: runId,
      })),
    )
    .select("id, label");
  return new Map((must(r, "insert sources") as Row[]).map((x) => [x.label as string, x.id as string]));
}

export async function sourcesByLabel(dossierId: string, labels: string[]): Promise<RateSource[]> {
  if (!labels.length) return [];
  const r = await db()
    .from("sources")
    .select("id, label, url, title, excerpt, excerpt_lang, accepted, verified_at, origin, run_id")
    .eq("dossier_id", dossierId)
    .in("label", labels);
  return (must(r, "sources by label") as Row[])
    .map((x) => ({
      id: x.id as string,
      label: x.label as string,
      url: (x.url as string) ?? null,
      title: x.title as string,
      excerpt: x.excerpt as string,
      excerptLang: x.excerpt_lang as string,
      accepted: x.accepted as boolean,
      verifiedAt: (x.verified_at as string) ?? null,
      origin: x.origin as RateSource["origin"],
      runId: (x.run_id as string) ?? null,
    }))
    .sort((a, b) => labelNumber(a.label) - labelNumber(b.label));
}

// ─── Rating results ──────────────────────────────────────────────────────────

export async function writeRating(stakeholderId: string, runId: string, res: RateResult) {
  const client = db();
  must(
    await client.from("facts").insert(
      res.facts.map((f) => ({
        stakeholder_id: stakeholderId,
        run_id: runId,
        field: f.field,
        value: f.value as Json,
        rating: f.rating,
        quote: f.quote,
        source_ids: f.sourceIds,
        status: f.status,
        model: f.status === "sourced" ? res.model : null,
      })),
    ),
    "insert facts",
  );
  if (res.statements.length) {
    must(
      await client.from("support_statements").insert(
        res.statements.map((s) => ({
          stakeholder_id: stakeholderId,
          run_id: runId,
          rating: s.rating,
          summary: s.summary,
          quote: s.quote,
          source_id: s.sourceId,
          stated_at: s.statedAt,
        })),
      ),
      "insert statements",
    );
  }
  for (const c of res.credibility) {
    must(await client.from("sources").update({ credibility: c.credibility, credibility_reason: c.reason }).eq("id", c.sourceId), "set credibility");
  }
  for (const t of res.translations) {
    must(await client.from("sources").update({ translation: t.text }).eq("id", t.sourceId), "set translation");
  }
  const role = res.facts.find((f) => f.field === "role" && f.status === "sourced");
  await updateStakeholder(stakeholderId, { status: "active", ...(role ? { role: role.value } : {}) });
}

// ─── Edges, events, leads ────────────────────────────────────────────────────

export async function insertEdges(dossierId: string, edges: { aId: string; bId: string; relation: string; sourceIds: string[] }[]) {
  if (!edges.length) return;
  must(
    await db()
      .from("edges")
      .insert(edges.map((e) => ({ dossier_id: dossierId, a_id: e.aId, b_id: e.bId, relation: e.relation, source_ids: e.sourceIds, status: "sourced" }))),
    "insert edges",
  );
}

export async function insertEvents(
  dossierId: string,
  events: { title: string; kind: TimedEventKind; date: string; stakeholderIds: string[]; sourceIds: string[]; relevantToGoal: boolean }[],
) {
  if (!events.length) return;
  must(
    await db()
      .from("timed_events")
      .insert(
        events.map((e) => ({
          dossier_id: dossierId,
          title: e.title,
          kind: e.kind,
          date: e.date,
          stakeholder_ids: e.stakeholderIds,
          source_ids: e.sourceIds,
          status: "sourced",
          relevant_to_goal: e.relevantToGoal,
        })),
      ),
    "insert events",
  );
}

export interface LeadDraft {
  type: LeadType;
  stakeholderId: string;
  name: string;
  kind: string;
  match: LeadMatch;
  why: Sentence | null;
  route: string | null;
  eventDate: string | null;
  sourceIds: string[];
}

export async function insertLeads(dossierId: string, leads: LeadDraft[]) {
  if (!leads.length) return;
  must(
    await db()
      .from("leads")
      .insert(
        leads.map((l) => ({
          dossier_id: dossierId,
          type: l.type,
          stakeholder_id: l.stakeholderId,
          name: l.name,
          kind: l.kind,
          match: l.match as unknown as Json,
          why: l.why as unknown as Json,
          route: l.route,
          event_date: l.eventDate,
          source_ids: l.sourceIds,
          verification: l.sourceIds.length ? "sourced" : "unverified",
        })),
      ),
    "insert leads",
  );
}
