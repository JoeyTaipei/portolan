// Tracker state flow (spec §12 06, docs/scoring.md §3.1 and §7). Pure functions shared by the
// sample (localStorage overlay) and real dossiers (Server Actions), so both behave the same.
//
// Risky change: a debrief is a source (A1, weight ×2 in scoring) and support is recomputed from
// statements, never adjusted by a fixed amount. The playbook row is anonymised: route, category,
// overall and next step only — no dossier id, names or free text (TRK-5).
import { influenceBreakdown, influenceFor } from "@/lib/scoring/influence";
import { debriefRating, supportFor } from "@/lib/scoring/support";
import { cleanMemo, memoEdges, memoExcerptLines, memoFacts, memoHasContent } from "@/lib/tracker/memo";
import type {
  Banded,
  Brief,
  Category,
  Debrief,
  DebriefMemo,
  DebriefOverall,
  Dossier,
  Edge,
  Fact,
  InfluenceFactor,
  Iso,
  Lead,
  PlaybookOutcome,
  Source,
  Stakeholder,
  SupportResult,
  SupportStatement,
  TrackerItem,
  TrackerOrigin,
  TrackerStage,
} from "@/lib/types";

export const STAGES: readonly TrackerStage[] = ["found", "contacted", "met", "partner"];

export const STAGE_LABEL: Record<TrackerStage, string> = {
  found: "Found",
  contacted: "Contacted",
  met: "Met",
  partner: "Partner",
};

export const OVERALL_LABEL: Record<DebriefOverall, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const NOTES_MAX = 1000;
export const DEFAULT_DUE_DAYS = 7;

/** What the tracker reads and writes. The sample overlay and the database hold the same shapes. */
export interface TrackerState {
  dossierId: string;
  stakeholders: Pick<Stakeholder, "id" | "name" | "short" | "category" | "isChina">[];
  leads: Pick<Lead, "id" | "name" | "type" | "stakeholderId">[];
  tracker: TrackerItem[];
  debriefs: Debrief[];
  statements: SupportStatement[];
  sources: Source[];
  /** Influence facts and ties: a meeting memo adds its own (TRK-10, scoring §3.2). */
  facts: Fact[];
  edges: Edge[];
  playbook: PlaybookOutcome[];
  /** The current brief, if any: a debrief saved after `inputsAt` makes it Out of date (§7). */
  brief: Pick<Brief, "inputsAt"> | null;
}

// ─── Small helpers ───────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "2026-10-31" or a timestamp → whole calendar days from that day to `now` (local time). */
export function daysSince(date: Iso, now: Date): number {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Math.round((localMidnight(now) - new Date(y, m - 1, d).getTime()) / DAY_MS);
}

/** "2026-11-08": `days` after `now`, as a local calendar date. */
export function addDays(now: Date, days: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function stageRank(stage: TrackerStage): number {
  return STAGES.indexOf(stage);
}

/** Saving a debrief moves the stage to at least Met; Partner is only ever set by hand. */
export function stageAfterDebrief(stage: TrackerStage): TrackerStage {
  return stageRank(stage) >= stageRank("met") ? stage : "met";
}

export function itemName(state: Pick<TrackerState, "stakeholders" | "leads">, item: TrackerItem): string {
  if (item.stakeholderId) {
    const s = state.stakeholders.find((x) => x.id === item.stakeholderId);
    if (s) return s.short ?? s.name;
  }
  if (item.leadId) {
    const l = state.leads.find((x) => x.id === item.leadId);
    if (l) return l.name;
  }
  return "Tracked contact";
}

const LEAD_CATEGORY: Record<Lead["type"], Category> = { investor: "cap", lawyer: "leg", event: "evt" };

export function itemCategory(state: Pick<TrackerState, "stakeholders" | "leads">, item: TrackerItem): Category | null {
  const sid = item.stakeholderId ?? state.leads.find((l) => l.id === item.leadId)?.stakeholderId ?? null;
  const s = sid ? state.stakeholders.find((x) => x.id === sid) : null;
  if (s) return s.category;
  const lead = state.leads.find((l) => l.id === item.leadId);
  return lead ? LEAD_CATEGORY[lead.type] : null;
}

/** Influence for the item's stakeholder (scoring §2, with memo answers first per §3.2). */
export function itemInfluence(state: Pick<TrackerState, "stakeholders" | "facts" | "edges">, item: TrackerItem): Banded | null {
  if (!item.stakeholderId) return null;
  const s = state.stakeholders.find((x) => x.id === item.stakeholderId);
  return influenceFor(item.stakeholderId, state.facts, state.edges, s?.category);
}

/** Support for the item's stakeholder, recomputed from statements (scoring §3). */
export function itemSupport(state: Pick<TrackerState, "statements" | "sources">, item: TrackerItem, now: Date): SupportResult {
  if (!item.stakeholderId) return { kind: "unknown" };
  return supportFor(item.stakeholderId, state.statements, state.sources, now);
}

// ─── Stage counts and the list (TRK-1, TRK-7) ────────────────────────────────

export function stageCounts(tracker: TrackerItem[]): Record<TrackerStage, number> {
  const out: Record<TrackerStage, number> = { found: 0, contacted: 0, met: 0, partner: 0 };
  for (const t of tracker) out[t.stage] += 1;
  return out;
}

export type ItemEdit = Partial<Pick<TrackerItem, "stage" | "nextStep" | "dueDate" | "meetingAt">>;

export function editItem(state: TrackerState, itemId: string, edit: ItemEdit): TrackerState {
  return { ...state, tracker: state.tracker.map((t) => (t.id === itemId ? { ...t, ...edit } : t)) };
}

export function removeItem(state: TrackerState, itemId: string): TrackerState {
  return { ...state, tracker: state.tracker.filter((t) => t.id !== itemId) };
}

export function addItem(
  state: TrackerState,
  item: Pick<TrackerItem, "id" | "stakeholderId" | "leadId" | "origin" | "createdAt"> & { nextStep?: string | null },
): TrackerState {
  const dup = state.tracker.some(
    (t) => (item.stakeholderId && t.stakeholderId === item.stakeholderId) || (item.leadId && t.leadId === item.leadId),
  );
  if (dup) return state;
  const row: TrackerItem = {
    id: item.id,
    dossierId: state.dossierId,
    stakeholderId: item.stakeholderId,
    leadId: item.leadId,
    stage: "found",
    nextStep: item.nextStep ?? null,
    dueDate: null,
    meetingAt: null,
    origin: item.origin,
    createdAt: item.createdAt,
  };
  return { ...state, tracker: [...state.tracker, row] };
}

// ─── Debrief due (TRK-2) ─────────────────────────────────────────────────────

export interface DueDebrief {
  item: TrackerItem;
  daysAgo: number;
}

/** From the day after a meeting with no debrief for that meeting yet; oldest first. */
export function dueDebriefs(state: Pick<TrackerState, "tracker" | "debriefs">, now: Date): DueDebrief[] {
  return state.tracker
    .filter((t) => t.meetingAt !== null)
    .map((t) => ({ item: t, daysAgo: daysSince(t.meetingAt as string, now) }))
    .filter(
      ({ item, daysAgo }) =>
        daysAgo >= 1 && !state.debriefs.some((d) => d.trackerItemId === item.id && d.meetingAt === item.meetingAt),
    )
    .sort((a, b) => b.daysAgo - a.daysAgo);
}

export function meetingWhen(daysAgo: number): string {
  return daysAgo === 1 ? "Meeting was yesterday" : `Meeting was ${daysAgo} days ago`;
}

// ─── Save debrief and Undo (TRK-3…6) ─────────────────────────────────────────

export interface DebriefInput {
  trackerItemId: string;
  overall: DebriefOverall;
  nextStepAgreed: boolean;
  /** Private to the team. Never copied into the source, statement or playbook. */
  notes: string | null;
  addToPlaybook: boolean;
  /** With "Yes": the next step and its due date (default 7 days). */
  nextStep: { text: string; dueDate: string } | null;
  /** TRK-9 optional detail; null when "Add detail" was left closed or empty. */
  memo?: DebriefMemo | null;
}

/** Ids for the new rows, made by the caller (random on the sample, database ids on real dossiers). */
export interface DebriefIds {
  debrief: string;
  source: string;
  statement: string;
  playbook: string;
  /** For the memo's facts (up to 4) and ties (up to 5). */
  facts?: string[];
  edges?: string[];
}

/** Everything the result card shows, and what Undo needs to put back. */
export interface DebriefReceipt {
  debriefId: string;
  itemName: string;
  itemBefore: TrackerItem;
  supportBefore: SupportResult;
  supportAfter: SupportResult;
  influenceBefore: Banded | null;
  influenceAfter: Banded | null;
  /** Factors the memo set or changed (TRK-10), for the result card. */
  memoFactors: InfluenceFactor[];
  stageBefore: TrackerStage;
  stageAfter: TrackerStage;
  nextStep: { text: string; dueDate: string } | null;
  briefOutOfDate: boolean;
  playbookRoute: string | null;
}

const ROUTE_WORD: Record<TrackerOrigin, string> = {
  map: "direct approach",
  manual: "direct approach",
  network: "saved lead",
  intro: "intro",
  debrief: "follow-up",
};

/** "industry · intro → meeting". Built only from fixed words: never a name or free text. */
export function playbookRoute(category: Category, origin: TrackerOrigin): string {
  const CATEGORY_WORD: Record<Category, string> = {
    gov: "government",
    ind: "industry",
    cap: "capital",
    leg: "legal",
    evt: "event",
  };
  return `${CATEGORY_WORD[category]} · ${ROUTE_WORD[origin]} → meeting`;
}

function nextLabel(sources: Source[]): string {
  const n = sources.filter((s) => s.origin === "debrief").length + 1;
  return `D${n}`;
}

function supportScore(s: SupportResult): number | null {
  return s.kind === "known" ? s.score : null;
}

export function applyDebrief(
  state: TrackerState,
  input: DebriefInput,
  ids: DebriefIds,
  now: Date,
): { state: TrackerState; receipt: DebriefReceipt } {
  const item = state.tracker.find((t) => t.id === input.trackerItemId);
  if (!item) throw new Error("Tracker item not found");
  const at = now.toISOString();
  const day = at.slice(0, 10);
  const name = itemName(state, item);
  const category = itemCategory(state, item);
  const supportBefore = itemSupport(state, item, now);
  const influenceBefore = itemInfluence(state, item);
  const stakeholder = item.stakeholderId ? state.stakeholders.find((x) => x.id === item.stakeholderId) : undefined;
  const memo =
    input.memo && memoHasContent(input.memo)
      ? cleanMemo(input.memo, {
          stakeholderId: item.stakeholderId,
          isChina: stakeholder?.isChina ?? false,
          mapIds: new Set(state.stakeholders.map((x) => x.id)),
        })
      : null;

  // The debrief as an A1 source (scoring §3.1). The excerpt is fixed text, never the notes; the
  // memo's influence answers are fixed words too, so each memo fact's quote is in the excerpt.
  const source: Source = {
    id: ids.source,
    dossierId: state.dossierId,
    label: nextLabel(state.sources),
    url: null,
    title: `Debrief, ${day}, your team`,
    publisher: null,
    sourceType: "debrief",
    excerpt: [
      `Meeting debrief: overall ${OVERALL_LABEL[input.overall].toLowerCase()}; next step agreed: ${input.nextStepAgreed ? "yes" : "not yet"}.`,
      ...memoExcerptLines(memo),
    ].join(" "),
    excerptLang: "en",
    translation: null,
    reliability: "A",
    credibility: 1,
    credibilityReason: "Your team's own account of the meeting.",
    publishedAt: (item.meetingAt ?? at).slice(0, 10),
    verifiedAt: day,
    origin: "debrief",
    accepted: true,
    rejectReason: null,
    runId: null,
    createdAt: at,
  };
  const statement: SupportStatement | null = item.stakeholderId
    ? {
        id: ids.statement,
        stakeholderId: item.stakeholderId,
        runId: null,
        debriefId: ids.debrief,
        rating: memo?.stance ?? debriefRating(input.overall),
        summary: `Meeting debrief: ${OVERALL_LABEL[input.overall].toLowerCase()}`,
        quote: null,
        sourceId: ids.source,
        statedAt: source.publishedAt,
        createdAt: at,
      }
    : null;
  const playbook: PlaybookOutcome | null =
    input.addToPlaybook && category
      ? {
          id: ids.playbook,
          route: playbookRoute(category, item.origin),
          category,
          overall: input.overall,
          nextStepAgreed: input.nextStepAgreed,
          createdAt: at,
        }
      : null;

  const stageAfter = stageAfterDebrief(item.stage);
  const added = input.nextStepAgreed && input.nextStep?.text.trim() ? { text: input.nextStep.text.trim(), dueDate: input.nextStep.dueDate } : null;
  const itemAfter: TrackerItem = {
    ...item,
    stage: stageAfter,
    ...(added ? { nextStep: added.text, dueDate: added.dueDate } : {}),
  };

  const sources = statement ? [...state.sources, source] : state.sources;
  const statements = statement ? [...state.statements, statement] : state.statements;
  const supportAfter = item.stakeholderId ? supportFor(item.stakeholderId, statements, sources, now) : supportBefore;

  // TRK-10: the memo's influence answers and "who else must agree" ties (scoring §3.2).
  const memoCtx = item.stakeholderId ? { stakeholderId: item.stakeholderId, debriefId: ids.debrief, sourceId: ids.source, at } : null;
  const newFacts = memoCtx ? memoFacts(memo, { ...memoCtx, newId: (i) => ids.facts?.[i] ?? `${ids.debrief}-f${i}` }) : [];
  // A pair already tied on the map adds nothing to centrality: keep the tie list one line per pair.
  const tied = (x: string, y: string) => state.edges.some((e) => (e.aId === x && e.bId === y) || (e.aId === y && e.bId === x));
  const newEdges = memoCtx
    ? memoEdges(memo, { ...memoCtx, dossierId: state.dossierId, newId: (i) => ids.edges?.[i] ?? `${ids.debrief}-e${i}` }).filter(
        (e) => !tied(e.aId, e.bId),
      )
    : [];
  const facts = [...state.facts, ...newFacts];
  const edges = [...state.edges, ...newEdges];
  const influenceAfter = itemInfluence({ stakeholders: state.stakeholders, facts, edges }, item);
  const before = item.stakeholderId ? influenceBreakdown(item.stakeholderId, state.facts, state.edges, stakeholder?.category) : [];
  const after = item.stakeholderId ? influenceBreakdown(item.stakeholderId, facts, edges, stakeholder?.category) : [];
  const memoFactors = after
    .filter((f, i) => newFacts.some((x) => x.field === f.factor) || (f.factor === "centrality" && newEdges.length > 0) || f.rating !== before[i]?.rating)
    .map((f) => f.factor);

  const debrief: Debrief = {
    id: ids.debrief,
    trackerItemId: item.id,
    stakeholderId: item.stakeholderId,
    meetingAt: item.meetingAt,
    reporter: null,
    overall: input.overall,
    nextStepAgreed: input.nextStepAgreed,
    notes: input.notes?.trim() ? input.notes.trim().slice(0, NOTES_MAX) : null,
    supportBefore: supportScore(supportBefore),
    supportAfter: supportScore(supportAfter),
    stageBefore: item.stage,
    stageAfter,
    addedNextStep: added?.text ?? null,
    playbookOutcomeId: playbook?.id ?? null,
    memo,
    createdAt: at,
  };

  const next: TrackerState = {
    ...state,
    tracker: state.tracker.map((t) => (t.id === item.id ? itemAfter : t)),
    debriefs: [...state.debriefs, debrief],
    statements,
    sources,
    facts,
    edges,
    playbook: playbook ? [...state.playbook, playbook] : state.playbook,
  };
  return {
    state: next,
    receipt: {
      debriefId: debrief.id,
      itemName: name,
      itemBefore: item,
      supportBefore,
      supportAfter,
      influenceBefore,
      influenceAfter,
      memoFactors,
      stageBefore: item.stage,
      stageAfter,
      nextStep: added,
      briefOutOfDate: state.brief !== null && at > state.brief.inputsAt,
      playbookRoute: playbook?.route ?? null,
    },
  };
}

/** TRK-6: delete the debrief, its source, statement, memo facts and ties, and playbook row; put the item back. */
export function undoDebrief(state: TrackerState, receipt: Pick<DebriefReceipt, "debriefId" | "itemBefore">): TrackerState {
  const debrief = state.debriefs.find((d) => d.id === receipt.debriefId);
  if (!debrief) return state;
  const statementIds = new Set(state.statements.filter((s) => s.debriefId === debrief.id).map((s) => s.id));
  const sourceIds = new Set(state.statements.filter((s) => statementIds.has(s.id)).map((s) => s.sourceId));
  return {
    ...state,
    tracker: state.tracker.map((t) => (t.id === receipt.itemBefore.id ? receipt.itemBefore : t)),
    debriefs: state.debriefs.filter((d) => d.id !== debrief.id),
    statements: state.statements.filter((s) => !statementIds.has(s.id)),
    sources: state.sources.filter((s) => !(sourceIds.has(s.id) && s.origin === "debrief")),
    facts: state.facts.filter((f) => f.debriefId !== debrief.id),
    edges: state.edges.filter((e) => e.debriefId !== debrief.id),
    playbook: state.playbook.filter((p) => p.id !== debrief.playbookOutcomeId),
  };
}

/** Lift the tracker's slice out of a dossier (the sample adds its local playbook). */
export function trackerState(d: Dossier, playbook: PlaybookOutcome[] = []): TrackerState {
  const brief = d.briefs.at(-1) ?? null;
  return {
    dossierId: d.id,
    stakeholders: d.stakeholders.map(({ id, name, short, category, isChina }) => ({ id, name, short, category, isChina })),
    leads: d.leads.map(({ id, name, type, stakeholderId }) => ({ id, name, type, stakeholderId })),
    tracker: d.tracker,
    debriefs: d.debriefs,
    statements: d.statements,
    sources: d.sources,
    facts: d.facts,
    edges: d.edges,
    playbook,
    brief: brief ? { inputsAt: brief.inputsAt } : null,
  };
}
