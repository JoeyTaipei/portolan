// Builds what the map and home screens draw from a Dossier. Runs on the server with an explicit
// `now`; every score comes from src/lib/scoring. Sourcing rule: only accepted sources are cited,
// and a fact without one is shown as Unverified (never as a sourced value).
import { suggestsSpecIn } from "@/lib/checks/pre-display";
import { contactFirst, influenceBreakdown, scoreStakeholders, sourcesFor } from "@/lib/scoring";
import type { Banded, Category, Dossier, Fact, Level, Stance, StakeholderStatus, SupportResult } from "@/lib/types";
import {
  confidenceExplanation,
  influenceExplanation,
  refsFor,
  sourceRef,
  supportExplanation,
  type Explanation,
  type SourceRef,
} from "@/components/score/explain";

export type Mark = Stance | "event";

export const NO_ROUTE = "Find a sourced contact route first";

export interface NodeVM {
  id: string;
  name: string;
  nameZh: string | null;
  short: string;
  category: Category;
  status: StakeholderStatus;
  isPerson: boolean;
  city: string | null;
  lat: number | null;
  lng: number | null;
  x: number;
  y: number;
  z: number;
  mark: Mark;
  influence: Banded | null;
  support: SupportResult;
  confidence: Level;
  sourceCount: number;
  role: { text: string | null; verified: boolean };
  action: { text: string; verified: boolean; sources: SourceRef[] };
  explain: { influence: Explanation; support: Explanation; confidence: Explanation };
}

export interface MapModel {
  dossierId: string;
  isSample: boolean;
  name: string;
  /** Accepted sources behind this map (Exhibit source line). */
  sourceCount: number;
  nodes: NodeVM[];
  /** Sourced ties only. */
  edges: { a: string; b: string }[];
  /** Contact-first three, in order (scoring §5). */
  contactFirst: string[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  gov: "Government",
  ind: "Industry",
  cap: "Capital",
  leg: "Legal",
  evt: "Events",
};

function newest(facts: Fact[], stakeholderId: string, field: Fact["field"]): { sourced?: Fact; any?: Fact } {
  const mine = facts
    .filter((f) => f.stakeholderId === stakeholderId && f.field === field)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { sourced: mine.find((f) => f.status === "sourced" && f.sourceIds.length > 0), any: mine[0] };
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Spread nodes with no stored position on a ring so they never stack at the centre. */
function fallbackPos(i: number, n: number) {
  const a = (i / Math.max(1, n)) * Math.PI * 2;
  return { x: Math.cos(a) * 0.7, y: 0, z: Math.sin(a) * 0.7 };
}

export function buildMapModel(d: Dossier, now: Date): MapModel {
  const accepted = d.sources.filter((s) => s.accepted);
  const byId = new Map(accepted.map((s) => [s.id, sourceRef(s)]));
  const scored = scoreStakeholders(d, now);
  const scoreOf = new Map(scored.map((s) => [s.id, s]));

  const nodes: NodeVM[] = d.stakeholders.map((s, i) => {
    const sc = scoreOf.get(s.id)!;
    const role = newest(d.facts, s.id, "role");
    const action = newest(d.facts, s.id, "action");
    const actionSources = action.sourced ? refsFor(action.sourced.sourceIds, byId) : [];
    // BRIEF-10: a saved next step that suggests spec-in is not shown (it reads as Unverified).
    const actionText = action.sourced && actionSources.length > 0 && !suggestsSpecIn(text(action.sourced.value) ?? "") ? text(action.sourced.value) : null;
    const roleSourced = role.sourced && refsFor(role.sourced.sourceIds, byId).length > 0 ? text(role.sourced.value) : null;
    const pos = s.x !== null && s.y !== null && s.z !== null ? { x: s.x, y: s.y, z: s.z } : fallbackPos(i, d.stakeholders.length);
    const label = s.short ?? s.name;
    const mark: Mark = s.category === "evt" ? "event" : sc.support.kind === "unknown" ? "unknown" : sc.support.stance;
    const srcs = sourcesFor(s.id, d.facts, d.statements, d.sources).map(sourceRef);
    return {
      id: s.id,
      name: s.name,
      nameZh: s.nameZh,
      short: label,
      category: s.category,
      status: s.status,
      isPerson: s.isPerson,
      city: s.city,
      lat: s.lat,
      lng: s.lng,
      ...pos,
      mark,
      influence: sc.influence,
      support: sc.support,
      confidence: sc.confidence,
      sourceCount: sc.sourceCount,
      role: roleSourced
        ? { text: roleSourced, verified: true }
        : { text: text(role.any?.value) ?? s.role, verified: false },
      action: actionText
        ? { text: actionText, verified: true, sources: actionSources }
        : { text: NO_ROUTE, verified: false, sources: [] },
      explain: {
        influence: influenceExplanation(label, sc.influence, influenceBreakdown(s.id, d.facts, d.edges), byId),
        support: supportExplanation(
          label,
          sc.support,
          d.statements.filter((st) => st.stakeholderId === s.id),
          byId,
        ),
        confidence: confidenceExplanation(label, sc.confidence, srcs, sc.influence),
      },
    };
  });

  const counts = new Map(scored.map((s) => [s.id, s.sourceCount]));
  const picks = contactFirst(
    scored.filter((s) => s.eligible),
    { sourceCounts: counts },
  );

  return {
    dossierId: d.id,
    isSample: d.isSample,
    name: d.name,
    sourceCount: accepted.length,
    nodes,
    edges: d.edges
      .filter((e) => e.status === "sourced" && e.sourceIds.some((id) => byId.has(id)))
      .map((e) => ({ a: e.aId, b: e.bId })),
    contactFirst: picks.map((p) => p.stakeholderId),
  };
}

/** Map draws at most the top 30 by influence, plus the selected node and the contact-first three. */
export const MAP_LIMIT = 30;

export function byInfluence(a: NodeVM, b: NodeVM): number {
  return (b.influence?.score ?? -1) - (a.influence?.score ?? -1) || b.sourceCount - a.sourceCount || a.short.localeCompare(b.short);
}
