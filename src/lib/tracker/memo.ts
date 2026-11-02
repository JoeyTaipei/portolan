// TRK-9…12 meeting memo (docs/scoring.md §3.2). Pure: the question tables the form draws, and
// the facts and edges a memo adds. Every answer word is fixed text, so a fact's quote is always
// found in the debrief source's excerpt; free text (notes) never goes into a source or fact.
//
// Risky change: a memo answer replaces the research rating for that factor ("memo wins").
// "Not sure" is null and writes nothing; Undo removes the facts and edges with the debrief.
import type {
  DebriefMemo,
  Edge,
  Fact,
  MemoAsk,
  MemoBudget,
  MemoFormat,
  MemoInitiator,
  MemoTimeline,
  MemoTopic,
  Rating03,
  RatedFactor,
  StatementRating,
} from "@/lib/types";

export const MEMO_NOTE_MAX = 300;
export const MET_ROLE_MAX = 80;
export const ALSO_AGREE_MAX = 5;

export interface MemoQuestion {
  factor: RatedFactor;
  question: string;
  /** Short button label and the full answer, rating 3 → 0. */
  answers: { rating: Rating03; label: string; text: string }[];
}

export const INFLUENCE_QUESTIONS: MemoQuestion[] = [
  {
    factor: "authority",
    question: "Can they approve or decide this purchase, licence or pilot?",
    answers: [
      { rating: 3, label: "Decides", text: "Decides" },
      { rating: 2, label: "Recommends", text: "Recommends to whoever decides" },
      { rating: 1, label: "Input only", text: "Gives input only" },
      { rating: 0, label: "No role", text: "No role" },
    ],
  },
  {
    factor: "budget",
    question: "Do they control the money for it?",
    answers: [
      { rating: 3, label: "Holds it", text: "Holds the budget" },
      { rating: 2, label: "Shapes it", text: "Shapes or requests it" },
      { rating: 1, label: "Indirect", text: "Indirect" },
      { rating: 0, label: "None", text: "None" },
    ],
  },
  {
    factor: "access",
    question: "How close are they to the final decision-maker?",
    answers: [
      { rating: 3, label: "Is them", text: "Is the decision-maker" },
      { rating: 2, label: "Reports directly", text: "Reports directly" },
      { rating: 1, label: "2+ levels", text: "Two or more levels away" },
      { rating: 0, label: "No line", text: "No line" },
    ],
  },
  {
    factor: "recent",
    question: "Did they mention a live tender, pilot or rule they are driving now?",
    answers: [
      { rating: 3, label: "Leading one", text: "Leading one" },
      { rating: 2, label: "Involved", text: "Involved in one" },
      { rating: 1, label: "Mentioned", text: "Mentioned, not involved" },
      { rating: 0, label: "None", text: "None" },
    ],
  },
];

export const FORMAT_LABEL: Record<MemoFormat, string> = { in_person: "In person", video: "Video", event: "At an event" };
export const INITIATOR_LABEL: Record<MemoInitiator, string> = { us: "Us", them: "Them", intro: "Intro" };
export const TOPIC_LABEL: Record<MemoTopic, string> = {
  local_production: "Local production / partner",
  non_red: "No PRC parts",
  test_data: "Performance and test data",
  price: "Price",
  timeline: "Delivery timeline",
  budget: "Budget availability",
  export_control: "Export-control status",
  cyber: "Cybersecurity certification",
  interop: "Interoperability",
};
export const TIMELINE_LABEL: Record<MemoTimeline, string> = {
  quarter: "This quarter",
  year: "This year",
  next_budget: "Next budget cycle",
  unknown: "Unknown",
};
export const BUDGET_LABEL: Record<MemoBudget, string> = { funded: "Funded", requested: "Requested", not_yet: "Not yet", unknown: "Unknown" };
export const ASK_LABEL: Record<MemoAsk, string> = {
  demo: "Demo",
  test_data: "Test data",
  export_class: "Export classification",
  partner: "Local partner name",
  pricing: "Pricing",
  documents: "Documents",
};
export const STANCE_LABEL: Record<StatementRating, string> = {
  [-2]: "Clearly against",
  [-1]: "Leaning against",
  0: "Neutral",
  1: "Leaning for",
  2: "Clearly for",
} as Record<StatementRating, string>;

export const ALSO_AGREE_RELATION = "Must also agree (your meeting)";

export function emptyMemo(): DebriefMemo {
  return {
    format: null,
    metRole: null,
    initiatedBy: null,
    authority: null,
    budget: null,
    access: null,
    recent: null,
    alsoAgree: [],
    stance: null,
    priorities: [],
    prioritiesNote: null,
    concerns: [],
    concernsNote: null,
    timeline: null,
    budgetStatus: null,
    asks: [],
    asksNote: null,
  };
}

/** True when the memo records anything at all. */
export function memoHasContent(m: DebriefMemo | null | undefined): m is DebriefMemo {
  if (!m) return false;
  return Object.values(m).some((v) => (Array.isArray(v) ? v.length > 0 : v !== null));
}

const clip = (s: string | null, max: number) => (s && s.trim() ? s.trim().slice(0, max) : null);

/**
 * Bound and clean a memo before it is stored. China stakeholders keep no "who we met" text
 * (organisation level only); "also agree" keeps only other stakeholders on this map.
 */
export function cleanMemo(m: DebriefMemo, ctx: { stakeholderId: string | null; isChina: boolean; mapIds: Set<string> }): DebriefMemo {
  return {
    ...m,
    metRole: ctx.isChina ? null : clip(m.metRole, MET_ROLE_MAX),
    alsoAgree: [...new Set(m.alsoAgree)].filter((id) => id !== ctx.stakeholderId && ctx.mapIds.has(id)).slice(0, ALSO_AGREE_MAX),
    priorities: [...new Set(m.priorities)],
    prioritiesNote: clip(m.prioritiesNote, MEMO_NOTE_MAX),
    concerns: [...new Set(m.concerns)],
    concernsNote: clip(m.concernsNote, MEMO_NOTE_MAX),
    asks: [...new Set(m.asks)],
    asksNote: clip(m.asksNote, MEMO_NOTE_MAX),
  };
}

/** "Can they approve or decide this…: Recommends to whoever decides." — fixed words only. */
export function answerLine(factor: RatedFactor, rating: Rating03): string {
  const q = INFLUENCE_QUESTIONS.find((x) => x.factor === factor)!;
  const a = q.answers.find((x) => x.rating === rating)!;
  return `${q.question} ${a.text}.`;
}

/** The influence lines added to the debrief source's excerpt (so each fact quote is in it). */
export function memoExcerptLines(m: DebriefMemo | null | undefined): string[] {
  if (!m) return [];
  return INFLUENCE_QUESTIONS.flatMap((q) => (m[q.factor] === null ? [] : [answerLine(q.factor, m[q.factor] as Rating03)]));
}

/** TRK-10: one sourced fact per answered influence question, citing the debrief source. */
export function memoFacts(
  m: DebriefMemo | null | undefined,
  ctx: { stakeholderId: string; debriefId: string; sourceId: string; at: string; newId: (i: number) => string },
): Fact[] {
  if (!m) return [];
  return INFLUENCE_QUESTIONS.filter((q) => m[q.factor] !== null).map((q, i) => {
    const rating = m[q.factor] as Rating03;
    return {
      id: ctx.newId(i),
      stakeholderId: ctx.stakeholderId,
      runId: null,
      field: q.factor,
      value: q.answers.find((a) => a.rating === rating)!.text,
      rating,
      quote: answerLine(q.factor, rating),
      sourceIds: [ctx.sourceId],
      status: "sourced",
      model: null,
      debriefId: ctx.debriefId,
      createdAt: ctx.at,
    };
  });
}

/** TRK-10: "who else must agree" → sourced ties from this stakeholder, citing the debrief source. */
export function memoEdges(
  m: DebriefMemo | null | undefined,
  ctx: { dossierId: string; stakeholderId: string; debriefId: string; sourceId: string; at: string; newId: (i: number) => string },
): Edge[] {
  if (!m) return [];
  return m.alsoAgree.map((bId, i) => ({
    id: ctx.newId(i),
    dossierId: ctx.dossierId,
    aId: ctx.stakeholderId,
    bId,
    relation: ALSO_AGREE_RELATION,
    sourceIds: [ctx.sourceId],
    status: "sourced",
    debriefId: ctx.debriefId,
    createdAt: ctx.at,
  }));
}

/**
 * Memo free text for Claude (TRK-12): priorities, concerns, timeline, budget status and asks,
 * labelled as the team's account. Never the private notes. Null when there is nothing to say.
 */
export function memoForPrompt(m: DebriefMemo | null | undefined): string | null {
  if (!memoHasContent(m)) return null;
  const parts: string[] = [];
  const tags = (xs: MemoTopic[]) => xs.map((x) => TOPIC_LABEL[x]).join(", ");
  if (m.priorities.length || m.prioritiesNote) parts.push(`Their priorities: ${[tags(m.priorities), m.prioritiesNote].filter(Boolean).join("; ")}`);
  if (m.concerns.length || m.concernsNote) parts.push(`Their concerns: ${[tags(m.concerns), m.concernsNote].filter(Boolean).join("; ")}`);
  if (m.timeline) parts.push(`Decision timeline they gave: ${TIMELINE_LABEL[m.timeline]}`);
  if (m.budgetStatus) parts.push(`Budget status they described: ${BUDGET_LABEL[m.budgetStatus]}`);
  if (m.asks.length || m.asksNote)
    parts.push(`They asked us for: ${[m.asks.map((a) => ASK_LABEL[a]).join(", "), m.asksNote].filter(Boolean).join("; ")}`);
  if (m.stance !== null) parts.push(`Their stance on working with us: ${STANCE_LABEL[m.stance]}`);
  return parts.length ? parts.join("\n") : null;
}
