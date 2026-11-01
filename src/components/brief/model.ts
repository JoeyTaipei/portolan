// What the strategy brief (03), the A4 report (05) and the sources page show. Server-side, with
// an explicit `now`. Scores come only from src/lib/scoring; this file only picks and labels.
//
// Sourcing rule: a sentence is shown only when every source it cites is an accepted source of
// this dossier with a verified date, and it has no placeholder (BRIEF-6 pre-display check).
// Failing sentences are dropped, never shown with a warning.
import {
  dataConfidenceExplanation,
  dataConfidenceText,
  refsFor,
  sourceRef,
  type Explanation,
  type SourceRef,
} from "@/components/score/explain";
import { briefMetrics, briefStatus, citedSourceIds, STALE_SOURCE_DAYS, daysBetween } from "@/lib/scoring";
import type { Brief, BriefMetrics, BriefStatus, Dossier, IcdTerm, Confidence, Sentence, Source, SourceType } from "@/lib/types";

export interface Cited {
  text: string;
  refs: SourceRef[];
}

export interface MetricVM {
  key: "readiness" | "opposition" | "window" | "confidence";
  label: string;
  /** The big value, e.g. "Medium · 56" or "21 days". Null = nothing sourced. */
  value: string | null;
  /** One line under it: what it is based on, or why there is no number. */
  note: string;
  explain: Explanation;
}

export interface PlanBoxVM {
  key: keyof Brief["plan"];
  days: string;
  title: string;
  empty: string;
  actions: { text: string; who: string; refs: SourceRef[] }[];
}

export interface EvidenceVM {
  id: string;
  label: string;
  title: string;
  url: string | null;
  type: string;
  reliability: Source["reliability"];
  credibility: Source["credibility"];
  verifiedAt: string | null;
  recheckDue: boolean;
  excerpt: string;
  lang: string;
  translation: string | null;
}

export interface BriefVM {
  dossierId: string;
  isSample: boolean;
  name: string;
  version: number;
  versions: { version: number; createdAt: string; current: boolean }[];
  status: BriefStatus;
  metrics: MetricVM[];
  rationale: Cited[];
  judgments: { text: string; icd: IcdTerm; confidence: Confidence; refs: SourceRef[] }[];
  path: { who: string; stakeholderId: string; why: Cited }[];
  reduce: { who: string; stakeholderId: string; step: Cited }[];
  plan: PlanBoxVM[];
  summary: Cited[];
  risks: Cited[];
  meet: { eventId: string; title: string; date: string; mapped: number; refs: SourceRef[] }[];
  needs: string[];
  changesNote: string[];
  evidence: EvidenceVM[];
  acceptedCount: number;
}

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  government_gazette: "Government gazette",
  legislative_record: "Legislative record",
  government_site: "Government site",
  news: "News",
  trade_press: "Trade press",
  company_site: "Company site",
  report: "Report",
  event_page: "Event page",
  database: "Database",
  debrief: "Debrief",
  other: "Other",
};

// Spec §11.1 placeholder check. Letters in [] so the repo's placeholder grep stays clean.
const PLACEHOLDER = /\[[A-Z _-]+\]|\bT[B]D\b|l[o]rem/i;

/** Accepted sources of this dossier that have a verified date: the only ones a claim may cite. */
export function citable(d: Pick<Dossier, "sources">): Map<string, Source> {
  return new Map(d.sources.filter((s) => s.accepted && s.verifiedAt).map((s) => [s.id, s]));
}

/** BRIEF-6 in code: null when the sentence must not be shown. */
export function checkSentence(s: Sentence, ok: ReadonlyMap<string, Source>): Cited | null {
  if (!s.text.trim() || PLACEHOLDER.test(s.text)) return null;
  if (s.sourceIds.length === 0 || !s.sourceIds.every((id) => ok.has(id))) return null;
  return { text: s.text, refs: s.sourceIds.map((id) => sourceRef(ok.get(id)!)) };
}

function checkAll(xs: Sentence[], ok: ReadonlyMap<string, Source>): Cited[] {
  return xs.map((s) => checkSentence(s, ok)).filter((c): c is Cited => c !== null);
}

export function fmtDay(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A short verbatim piece of the excerpt: the quote a fact relies on if there is one. */
export function excerptFor(src: Source, d: Pick<Dossier, "facts" | "statements">): string {
  const quotes = [
    ...d.facts.filter((f) => f.status === "sourced" && f.sourceIds.includes(src.id)).map((f) => f.quote),
    ...d.statements.filter((s) => s.sourceId === src.id).map((s) => s.quote),
  ].filter((q): q is string => !!q && src.excerpt.includes(q));
  if (quotes[0]) return quotes[0];
  // No quote: the first lines of the excerpt, markdown links reduced to their text.
  const plain = src.excerpt
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*|>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 280 ? `${plain.slice(0, 277).trimEnd()}…` : plain;
}

export function evidenceItem(src: Source, d: Pick<Dossier, "facts" | "statements">, now: Date): EvidenceVM {
  return {
    id: src.id,
    label: src.label,
    title: src.title,
    url: src.url,
    type: SOURCE_TYPE_LABEL[src.sourceType],
    reliability: src.reliability,
    credibility: src.credibility,
    verifiedAt: src.verifiedAt,
    recheckDue: !!src.verifiedAt && daysBetween(src.verifiedAt, now) > STALE_SOURCE_DAYS,
    excerpt: excerptFor(src, d),
    lang: src.excerptLang,
    translation: src.translation,
  };
}

// ─── Metrics (BRIEF-2, REP-4) ────────────────────────────────────────────────

const pct = (f: number) => Math.round(f * 100);

export function metricVMs(
  m: BriefMetrics,
  d: Pick<Dossier, "events" | "marketChecks" | "statements">,
  ok: ReadonlyMap<string, Source>,
): MetricVM[] {
  const events = d.events;
  const r = m.entryReadiness;
  const o = m.opposition;
  const w = m.window;
  const c = m.dataConfidence;
  const check = (v: number | null) => (v === null ? "No sourced rating" : `${v} of 3`);
  const ev = w.found ? events.find((e) => e.id === w.eventId) : undefined;
  const refMap = new Map([...ok].map(([k, v]) => [k, sourceRef(v)]));
  // Each readiness check lists the sources it was rated from; support is worked out from the
  // stakeholders' sourced statements.
  const checkRefs = (c: Dossier["marketChecks"]["money"], rating: number | null) =>
    rating === null || !c ? [] : refsFor(c.sourceIds, refMap);
  const supportRefs = refsFor(d.statements.map((st) => st.sourceId), refMap);
  return [
    {
      key: "readiness",
      label: "Entry readiness",
      value: r ? `${r.level} · ${r.score}` : null,
      note: r ? `of 100, based on ${r.basedOn.rated} of 3 checks` : "No sourced check yet",
      explain: {
        title: "Entry readiness",
        result: r ? `${r.level} · ${r.score} of 100` : "Unverified: no sourced check yet",
        basedOn: r ? `Based on ${r.basedOn.rated} of 3 checks` : "Based on 0 of 3 checks",
        factors: r
          ? [
              { label: "Money: an open budget, tender or programme", weight: null, rating: check(r.checks.money), sources: checkRefs(d.marketChecks.money, r.checks.money) },
              { label: "Licence: a path for a foreign firm", weight: null, rating: check(r.checks.licence), sources: checkRefs(d.marketChecks.licence, r.checks.licence) },
              { label: "Support: supporters' share of known influence", weight: null, rating: check(r.checks.support), sources: r.checks.support === null ? [] : supportRefs },
            ]
          : [],
        summary:
          "Three checks, each rated 0–3 from cited sources: money, licence and support. Score = 100 × the sum of ratings ÷ (3 × the checks that have a source). Unsourced checks are left out. High is 67 or more, Medium 34–66, Low 33 or less.",
      },
    },
    {
      key: "opposition",
      label: "Opposition index",
      value: o ? `${o.level} · ${pct(o.low)}–${pct(o.high)}%` : null,
      note: o ? `Based on ${o.basedOn.known} of ${o.basedOn.of} stakeholders` : "No stakeholder with known support yet",
      explain: {
        title: "Opposition index",
        result: o ? `${o.level} · ${pct(o.low)}–${pct(o.high)}% (point estimate ${pct(o.value)}%)` : "Unverified: no known support yet",
        basedOn: o ? `Based on ${o.basedOn.known} of ${o.basedOn.of} stakeholders with known support` : null,
        factors: [],
        summary:
          "The influence of resistant stakeholders divided by the influence of everyone whose support is known. Unknown support is left out. The range uses each stakeholder's influence range. Low is under 20%, Medium 20–40%, High over 40%.",
      },
    },
    {
      key: "window",
      label: "Window to act",
      value: w.found ? `${w.days} day${w.days === 1 ? "" : "s"}` : null,
      note: w.found ? `until ${w.title}, ${fmtDay(w.date)}` : "No sourced deadline found",
      explain: {
        title: "Window to act",
        result: w.found ? `${w.days} days until ${w.title}` : "No sourced deadline found",
        basedOn: null,
        factors: ev
          ? [{ label: ev.title, weight: null, rating: w.found ? fmtDay(w.date) : "", sources: refsFor(ev.sourceIds, refMap) }]
          : [],
        summary:
          "Days until the next sourced deadline related to your goal: a budget vote, a tender closing or a committee review. With no sourced deadline there is no number.",
      },
    },
    {
      key: "confidence",
      label: "Data confidence",
      value: dataConfidenceText(c),
      note: `${c.qualifying} of ${c.of} stakeholders well sourced`,
      explain: dataConfidenceExplanation(c),
    },
  ];
}

// ─── The brief ───────────────────────────────────────────────────────────────

const PLAN_BOXES: Omit<PlanBoxVM, "actions">[] = [
  { key: "prep", days: "Days 1–2", title: "Prepare", empty: "No sourced preparation step" },
  { key: "contact", days: "Days 3–4", title: "Contact the first three", empty: "No sourced contact step" },
  { key: "event", days: "Day 5", title: "Event or meeting", empty: "No sourced event this week" },
  { key: "followUp", days: "Days 6–7", title: "Follow up", empty: "No sourced follow-up step" },
];

/** The brief to show: `?v=` when it exists, else the newest. Null when there is none. */
export function pickBrief(d: Pick<Dossier, "briefs">, v: string | null): Brief | null {
  if (d.briefs.length === 0) return null;
  const n = v ? Number(v) : NaN;
  return d.briefs.find((b) => b.version === n) ?? d.briefs.at(-1)!;
}

export function buildBriefModel(d: Dossier, brief: Brief, now: Date): BriefVM {
  const ok = citable(d);
  const nameOf = new Map(d.stakeholders.map((s) => [s.id, s.short ?? s.name]));
  const onMap = (id: string) => nameOf.has(id);
  const latest = d.briefs.at(-1)!;

  const plan = PLAN_BOXES.map((box) => ({
    ...box,
    actions: brief.plan[box.key]
      .filter((a) => onMap(a.stakeholderId))
      .map((a) => ({ c: checkSentence({ text: a.text, sourceIds: a.sourceIds }, ok), who: nameOf.get(a.stakeholderId)! }))
      .filter((a): a is { c: Cited; who: string } => a.c !== null)
      .map((a) => ({ text: a.c.text, who: a.who, refs: a.c.refs })),
  }));

  // Evidence = every accepted source this brief cites, in the order it is first cited.
  const cited = [...citedSourceIds(brief)].filter((id) => ok.has(id));
  const evidence = cited.map((id) => evidenceItem(ok.get(id)!, d, now));

  return {
    dossierId: d.id,
    isSample: d.isSample,
    name: d.name,
    version: brief.version,
    versions: [...d.briefs]
      .reverse()
      .map((b) => ({ version: b.version, createdAt: b.createdAt, current: b.version === brief.version })),
    // Out of date is about the newest brief; an older version is out of date by definition.
    status:
      brief.version === latest.version
        ? briefStatus(brief, d, now)
        : { outOfDate: true, reasons: [`A newer version (v${latest.version}) exists.`] },
    metrics: metricVMs(briefMetrics(d, now), d, ok),
    rationale: checkAll(brief.rationale, ok),
    judgments: brief.judgments
      .filter((j) => !PLACEHOLDER.test(j.text) && j.sourceIds.length > 0 && j.sourceIds.every((id) => ok.has(id)))
      .map((j) => ({ text: j.text, icd: j.icd, confidence: j.confidence, refs: j.sourceIds.map((id) => sourceRef(ok.get(id)!)) })),
    path: brief.path
      .filter((p) => onMap(p.stakeholderId))
      .map((p) => ({ who: nameOf.get(p.stakeholderId)!, stakeholderId: p.stakeholderId, why: checkSentence(p.why, ok) }))
      .filter((p): p is BriefVM["path"][number] => p.why !== null),
    reduce: brief.reduceOpposition
      .filter((r) => onMap(r.stakeholderId))
      .map((r) => ({ who: nameOf.get(r.stakeholderId)!, stakeholderId: r.stakeholderId, step: checkSentence(r.step, ok) }))
      .filter((r): r is BriefVM["reduce"][number] => r.step !== null),
    plan,
    summary: checkAll(brief.summary, ok),
    risks: checkAll(brief.risks, ok),
    meet: brief.meet
      .filter((m) => m.sourceIds.length > 0 && m.sourceIds.every((id) => ok.has(id)))
      .map((m) => ({ eventId: m.eventId, title: m.title, date: m.date, mapped: m.mappedStakeholders, refs: m.sourceIds.map((id) => sourceRef(ok.get(id)!)) })),
    needs: brief.needs.filter((n) => !PLACEHOLDER.test(n)),
    changesNote: brief.changesNote.filter((n) => !PLACEHOLDER.test(n)),
    evidence,
    acceptedCount: d.sources.filter((s) => s.accepted).length,
  };
}
