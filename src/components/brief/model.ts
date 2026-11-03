// What the strategy brief (03), the A4 report (05) and the sources page show. Server-side, with
// an explicit `now`. Scores come only from src/lib/scoring; this file only picks and labels.
//
// Sourcing rule: a sentence is shown only when every source it cites is an accepted source of
// this dossier with a verified date, and it has no placeholder (BRIEF-6 pre-display check).
// Failing sentences are dropped, never shown with a warning.
import { zhMap, type ZhMap } from "@/lib/i18n/dossier";
import {
  dataConfidenceExplanation,
  dataConfidenceText,
  refsFor,
  sourceRef,
  type Explanation,
  type SourceRef,
} from "@/components/score/explain";
import { suggestsSpecIn } from "@/lib/checks/pre-display";
import { buildMapModel } from "@/components/map/model";
import {
  briefMetrics,
  briefStatus,
  citedSourceIds,
  datedMoney,
  daysBetween,
  firstBuyer,
  influenceBreakdown,
  isEligible,
  scoreStakeholders,
  STALE_SOURCE_DAYS,
  structuralZeros,
} from "@/lib/scoring";
import { REQUIREMENT_TOPICS, ROUTE_KINDS } from "@/lib/types";
import type { Brief, BriefMetrics, BriefStatus, Dossier, EntryRequirement, ForeignAccess, MoneyStatus, ProcurementRoute, RouteKind, IcdTerm, Confidence, RequirementTopic, Sentence, Source } from "@/lib/types";

export interface Cited {
  text: string;
  refs: SourceRef[];
}

/** BRIEF-9 topic names, shown before each requirement. */
export const REQUIREMENT_LABEL: Record<RequirementTopic, string> = {
  who_can_bid: "Who can bid",
  local_content: "Local content",
  screening: "Screening and tests",
  import_permit: "Import permit",
  procurement_route: "Procurement route",
  cybersecurity: "Cybersecurity",
  export_control: "Export control",
};

/** Fixed code text (never Claude's): shown when no source covers export control. */
export const EXPORT_CHECK = "Needs a specialist check (no source found).";

/** BRIEF-12 route names, in display order. */
export const ROUTE_LABEL: Record<RouteKind, string> = {
  domestic_tender: "Domestic tender",
  police_ci: "Police and critical infrastructure",
  ncsist: "NCSIST co-development or subcontract",
  fms: "Foreign Military Sales (FMS)",
  dcs: "Direct commercial sale (DCS)",
};

export const ACCESS_LABEL: Record<ForeignAccess, string> = {
  direct: "Open to foreign firms",
  via_local_partner: "Through a Taiwanese partner",
  no: "Closed to foreign firms",
  unclear: "Access unclear",
};

export const MONEY_STATUS_LABEL: Record<MoneyStatus, string> = {
  proposed: "proposed",
  in_committee: "in committee",
  passed: "passed",
  open_tender: "open tender",
  awarded: "awarded",
};

export const NO_FIRST_BUYER = "No sourced route with money yet";
export const UNDATED_AMOUNT = "Amount not dated";

export interface RouteVM extends Cited {
  route: RouteKind;
  label: string;
  buyer: string | null;
  access: ForeignAccess;
  accessLabel: string;
  /** Shown only with a date and status; else `undated` is true and no amount is shown. */
  money: { amount: string; asOf: string; status: string; refs: SourceRef[] } | null;
  undated: boolean;
}

export interface FirstBuyerVM {
  who: string;
  how: string;
  /** "open tender, 36億7000 萬元, as of 11 Jul 2026" or the deadline, or the access only. */
  why: string;
  refs: SourceRef[];
  explain: Explanation;
}

export interface RequirementVM extends Cited {
  topic: RequirementTopic;
  label: string;
}

/** BRIEF-11: one gap behind the brief. Fixed code text with a count; never names a person. */
export interface GapVM {
  key: "requirements" | "export" | "routes" | "money" | "readiness" | "window" | "support" | "influence" | "unscored" | "next" | "events";
  /** The sentence on the brief page. */
  text: string;
  /** The short form joined into one line on the A4 (REP-13). */
  short: string;
}

export const NO_GAPS = "Every item in this brief has a source.";

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
  /** I18N-9: checked 繁中 for this version's sentences and the stakeholders' sourced names. */
  zh: ZhMap;
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
  /** BRIEF-9: sourced requirements in topic order; empty on older briefs. */
  requirements: RequirementVM[];
  /** True when there are requirements but none on export control: show the check line. */
  exportCheck: boolean;
  /** BRIEF-12: sourced routes in route order; empty on older briefs. */
  routes: RouteVM[];
  /** Scoring §9; null when no route qualifies (shows NO_FIRST_BUYER) or the brief has no routes. */
  firstBuyer: FirstBuyerVM | null;
  meet: { eventId: string; title: string; date: string; mapped: number; refs: SourceRef[] }[];
  needs: string[];
  changesNote: string[];
  /** BRIEF-11: what we could not verify, in a fixed order; empty = everything has a source. */
  gaps: GapVM[];
  evidence: EvidenceVM[];
  acceptedCount: number;
}

import { SOURCE_TYPE_LABEL } from "@/components/score/grade";
export { SOURCE_TYPE_LABEL };

// Spec §11.1 placeholder check. Letters in [] so the repo's placeholder grep stays clean.
const PLACEHOLDER = /\[[A-Z _-]+\]|\bT[B]D\b|l[o]rem/i;

/** Accepted sources of this dossier that have a verified date: the only ones a claim may cite. */
export function citable(d: Pick<Dossier, "sources">): Map<string, Source> {
  return new Map(d.sources.filter((s) => s.accepted && s.verifiedAt).map((s) => [s.id, s]));
}

/** BRIEF-6 in code: null when the sentence must not be shown. */
export function checkSentence(s: Sentence, ok: ReadonlyMap<string, Source>): Cited | null {
  if (!s.text.trim() || PLACEHOLDER.test(s.text) || suggestsSpecIn(s.text)) return null;
  if (s.sourceIds.length === 0 || !s.sourceIds.every((id) => ok.has(id))) return null;
  return { text: s.text, refs: s.sourceIds.map((id) => sourceRef(ok.get(id)!)) };
}

function requirementsVM(xs: EntryRequirement[], ok: ReadonlyMap<string, Source>): Pick<BriefVM, "requirements" | "exportCheck"> {
  const requirements = xs.flatMap((x) => {
    const c = checkSentence(x, ok);
    return c ? [{ ...c, topic: x.topic, label: REQUIREMENT_LABEL[x.topic] }] : [];
  });
  return { requirements, exportCheck: requirements.length > 0 && !requirements.some((x) => x.topic === "export_control") };
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

// ─── What we could not verify (BRIEF-11) ─────────────────────────────────────

const RATED_FACTORS = ["authority", "budget", "access", "recent"] as const;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The gaps behind a brief, counted from the same data and rules as the marks on the map and the
 * metrics: requirement topics no source covers, readiness checks and deadline with no source,
 * Unknown support, influence ratings with no source, next steps with no source, undated events.
 */
export function couldNotVerify(
  d: Dossier,
  now: Date,
  shown: { requirements: RequirementVM[]; exportCheck: boolean; metrics: BriefMetrics; routes?: RouteVM[] },
): GapVM[] {
  const gaps: GapVM[] = [];
  if (shown.requirements.length > 0) {
    const have = new Set(shown.requirements.map((r) => r.topic));
    const missing = REQUIREMENT_TOPICS.filter((t) => t !== "export_control" && !have.has(t)).map((t) => REQUIREMENT_LABEL[t]);
    if (missing.length)
      gaps.push({
        key: "requirements",
        text: `Entry requirements: no source found for ${missing.join(", ").toLowerCase()}.`,
        short: `${missing.join(", ").toLowerCase()} rules`,
      });
  }
  if (shown.exportCheck) gaps.push({ key: "export", text: `${REQUIREMENT_LABEL.export_control}: ${EXPORT_CHECK.charAt(0).toLowerCase()}${EXPORT_CHECK.slice(1)}`, short: "export control (needs a specialist)" });

  const routes = shown.routes ?? [];
  if (routes.length > 0) {
    const have = new Set(routes.map((x) => x.route));
    const missing = ROUTE_KINDS.filter((k) => !have.has(k)).map((k) => ROUTE_LABEL[k]);
    if (missing.length)
      gaps.push({ key: "routes", text: `Procurement routes: no source found for ${missing.join(", ")}.`, short: `${plural(missing.length, "procurement route")}` });
    const undated = routes.filter((x) => x.undated).length;
    if (undated)
      gaps.push({ key: "money", text: `Money: ${plural(undated, "amount")} with no date or status in the source, so not shown.`, short: `the date of ${plural(undated, "amount")}` });
  }

  const r = shown.metrics.entryReadiness;
  const checks = (["money", "licence", "support"] as const).filter((k) => !r || r.checks[k] === null);
  if (checks.length)
    gaps.push({
      key: "readiness",
      text: `Entry readiness: no sourced ${checks.join(" or ")} check, so ${checks.length === 1 ? "it is" : "they are"} left out of the score.`,
      short: `${checks.join(" and ")} check${checks.length === 1 ? "" : "s"}`,
    });
  if (!shown.metrics.window.found) gaps.push({ key: "window", text: "Window to act: no sourced deadline, so no number is shown.", short: "a deadline" });

  const people = d.stakeholders.filter(isEligible);
  const ids = new Set(people.map((s) => s.id));
  const scored = scoreStakeholders(d, now).filter((s) => ids.has(s.id));
  const n = people.length;
  const unknown = scored.filter((s) => s.support.kind === "unknown").length;
  if (unknown)
    gaps.push({
      key: "support",
      text: `Support: Unknown for ${unknown} of ${plural(n, "stakeholder")}, with no sourced statement about firms like yours.`,
      short: `support of ${unknown} of ${n} stakeholders`,
    });

  // Influence: Claude-rated factors with no sourced rating. A 0 set by the category rule is not a gap.
  let missing = 0;
  let total = 0;
  for (const s of people) {
    const zeros = structuralZeros(s.id, d.facts, s.category);
    const sourced = new Set(influenceBreakdown(s.id, d.facts, d.edges, s.category).filter((f) => f.sourceIds.length > 0).map((f) => f.factor));
    for (const f of RATED_FACTORS) {
      if (zeros.includes(f)) continue;
      total++;
      if (!sourced.has(f)) missing++;
    }
  }
  if (missing)
    gaps.push({
      key: "influence",
      text: `Influence: ${missing} of ${total} ratings have no source, so those stakeholders show a wider range.`,
      short: `${missing} of ${total} influence ratings`,
    });
  const unscored = scored.filter((s) => s.influence === null).length;
  if (unscored)
    gaps.push({
      key: "unscored",
      text: `Influence: no score for ${plural(unscored, "stakeholder")}, with fewer than two sourced ratings.`,
      short: `influence of ${plural(unscored, "stakeholder")}`,
    });

  const noRoute = buildMapModel(d, now).nodes.filter((x) => ids.has(x.id) && !x.action.verified).length;
  if (noRoute)
    gaps.push({
      key: "next",
      text: `Next step: no sourced contact route for ${noRoute} of ${plural(n, "stakeholder")}.`,
      short: `a next step for ${noRoute} of ${n}`,
    });
  const undated = d.events.filter((e) => e.status !== "sourced" || e.date === null).length;
  if (undated) gaps.push({ key: "events", text: `Events: ${plural(undated, "event")} with no sourced date.`, short: `${plural(undated, "event date")}` });
  return gaps;
}

// ─── Procurement routes and the first buyer (BRIEF-12, scoring §9) ──────────

function routeVMs(xs: ProcurementRoute[], ok: ReadonlyMap<string, Source>, nameOf: ReadonlyMap<string, string>): RouteVM[] {
  return ROUTE_KINDS.flatMap((kind) => {
    const x = xs.find((r) => r.route === kind);
    const c = x ? checkSentence(x, ok) : null;
    if (!x || !c) return [];
    const dm = datedMoney(x);
    const moneyOk = dm && dm.sourceIds.every((id) => ok.has(id));
    return [
      {
        ...c,
        route: kind,
        label: ROUTE_LABEL[kind],
        buyer: x.buyerId ? (nameOf.get(x.buyerId) ?? null) : null,
        access: x.access,
        accessLabel: ACCESS_LABEL[x.access],
        money: moneyOk ? { amount: dm.amount, asOf: dm.asOf, status: MONEY_STATUS_LABEL[dm.status], refs: dm.sourceIds.map((id) => sourceRef(ok.get(id)!)) } : null,
        undated: !!x.money && !moneyOk,
      },
    ];
  });
}

const FIRST_BUYER_RULE =
  "Code picks it, not Claude. Only routes a foreign firm can use, with a Government buyer on the map. Ranked by money status (open tender or awarded, then passed, in committee, proposed; an amount counts only with a date and status), then access (direct before through a partner before unclear), then the buyer's nearest sourced deadline, then the buyer's influence. Most likely, not certain.";

function firstBuyerVM(d: Dossier, brief: Brief, routes: RouteVM[], ok: ReadonlyMap<string, Source>, nameOf: ReadonlyMap<string, string>, now: Date): FirstBuyerVM | null {
  const shown = new Set(routes.map((r) => r.route));
  const scored = scoreStakeholders(d, now);
  const pick = firstBuyer({
    routes: (brief.routes ?? []).filter((r) => shown.has(r.route)).map((r) => (routes.find((x) => x.route === r.route)?.money ? r : { ...r, money: null })),
    govOnMap: new Set(d.stakeholders.filter((s) => s.category === "gov" && isEligible(s)).map((s) => s.id)),
    influence: new Map(scored.flatMap((s) => (s.influence ? [[s.id, s.influence.score] as const] : []))),
    events: d.events,
    now,
  });
  if (!pick) return null;
  const vm = routes.find((r) => r.route === pick.route.route)!;
  const parts = [
    vm.money ? `${vm.money.status}, ${vm.money.amount}, as of ${fmtDay(vm.money.asOf)}` : null,
    pick.deadline ? `next deadline ${pick.deadline.title}, ${fmtDay(pick.deadline.date)}` : null,
  ].filter(Boolean);
  const refs = [...vm.refs, ...(vm.money?.refs ?? [])].filter((r, i, a) => a.findIndex((y) => y.id === r.id) === i);
  return {
    who: nameOf.get(pick.buyerId) ?? pick.buyerId,
    how: vm.accessLabel.charAt(0).toLowerCase() + vm.accessLabel.slice(1),
    why: parts.length ? parts.join("; ") : `${vm.label}, ${vm.accessLabel.toLowerCase()}`,
    refs,
    explain: {
      title: "Most likely first buyer",
      result: `${nameOf.get(pick.buyerId) ?? pick.buyerId}, ${vm.label}`,
      basedOn: `Based on ${routes.length} sourced route${routes.length === 1 ? "" : "s"}`,
      factors: routes.map((r) => ({
        label: `${r.label}${r.buyer ? ` · ${r.buyer}` : ""}`,
        weight: null,
        rating: [r.accessLabel, r.money ? `${r.money.status}, ${r.money.amount}` : r.undated ? UNDATED_AMOUNT : "no amount"].join(" · "),
        sources: [...r.refs, ...(r.money?.refs ?? [])].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i),
      })),
      summary: FIRST_BUYER_RULE,
    },
  };
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
  const metrics = briefMetrics(d, now);
  const reqs = requirementsVM(brief.requirements ?? [], ok);
  const govName = new Map(d.stakeholders.map((s) => [s.id, s.short ?? s.name]));
  const routes = routeVMs(brief.routes ?? [], ok, govName);

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
    zh: zhMap(d, brief),
    version: brief.version,
    versions: [...d.briefs]
      .reverse()
      .map((b) => ({ version: b.version, createdAt: b.createdAt, current: b.version === brief.version })),
    // Out of date is about the newest brief; an older version is out of date by definition.
    status:
      brief.version === latest.version
        ? briefStatus(brief, d, now)
        : { outOfDate: true, reasons: [`A newer version (v${latest.version}) exists.`] },
    metrics: metricVMs(metrics, d, ok),
    rationale: checkAll(brief.rationale, ok),
    judgments: brief.judgments
      .filter((j) => !PLACEHOLDER.test(j.text) && !suggestsSpecIn(j.text) && j.sourceIds.length > 0 && j.sourceIds.every((id) => ok.has(id)))
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
    ...reqs,
    routes,
    firstBuyer: routes.length ? firstBuyerVM(d, brief, routes, ok, govName, now) : null,
    meet: brief.meet
      .filter((m) => m.sourceIds.length > 0 && m.sourceIds.every((id) => ok.has(id)))
      .map((m) => ({ eventId: m.eventId, title: m.title, date: m.date, mapped: m.mappedStakeholders, refs: m.sourceIds.map((id) => sourceRef(ok.get(id)!)) })),
    needs: brief.needs.filter((n) => !PLACEHOLDER.test(n)),
    changesNote: brief.changesNote.filter((n) => !PLACEHOLDER.test(n)),
    gaps: couldNotVerify(d, now, { ...reqs, metrics, routes }),
    evidence,
    acceptedCount: d.sources.filter((s) => s.accepted).length,
  };
}
