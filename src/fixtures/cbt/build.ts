// Builds one 碳基 sample market from a hand-curated spec (spec MKT-3, plan S22). Sample data.
//
// Same rules and shape as sample-vietnam.ts (MKT-2), shared by the four markets so each market
// file holds only its research:
// - Every excerpt is copied verbatim from the page at its URL (paragraphs that aren't next to
//   each other are joined with " … ").
// - Every rating, statement, next step, edge and brief sentence cites these sources; every
//   quote appears in the cited excerpt; every number in a brief sentence appears in a cited
//   excerpt (checked by cbt.test.ts). No source → Unverified; no statement → support Unknown.
// - Names only for sourced public officials and the client's own executives quoted in the press.
// - No Chinese organisation is mapped.
import { briefMetrics, contactFirst, scoreStakeholders } from "@/lib/scoring";
import type {
  Brief,
  Category,
  Confidence,
  Credibility,
  Dossier,
  Edge,
  Fact,
  FactField,
  IcdTerm,
  Lead,
  Market,
  Rating03,
  Reliability,
  RequirementTopic,
  Sentence,
  Source,
  SourceType,
  Stakeholder,
  StatementRating,
  SupportStatement,
  TimedEvent,
  TrackerItem,
} from "@/lib/types";

export interface RawSource {
  key: string;
  url: string;
  title: string;
  publisher: string | null;
  sourceType: SourceType;
  excerptLang: string;
  reliability: Reliability;
  credibility: Credibility;
  credibilityReason: string;
  verifiedAt: string;
  excerpt: string;
}

export type Cite = [key: string, quote: string];
export type Rated = [rating: Rating03, value: string, key: string, quote: string];
export type Said = [rating: StatementRating, summary: string, key: string, quote: string];
export type Told = [value: string, key: string, quote: string];
/** A sentence and the source handles it cites. */
export type Said2 = [text: string, ...keys: string[]];

export interface Org {
  id: string;
  name: string;
  nameZh: string | null;
  short: string;
  category: Category;
  city?: string;
  pos: [number, number, number];
  role: Told;
  head?: Told;
  authority?: Rated;
  budget?: Rated;
  access?: Rated;
  recent?: Rated;
  said?: Said[];
  action: Told | null;
}

export interface MarketSpec {
  id: string;
  shareId: string;
  market: Market;
  /** Source id prefix, unique across samples ("us" → us-s1, us-s2…). */
  prefix: string;
  name: string;
  company: string;
  product: string;
  goal: string;
  /** Data timestamp. */
  at: string;
  sources: RawSource[];
  orgs: Org[];
  edges: [a: string, b: string, relation: string, ...keys: string[]][];
  events: { id: string; title: string; date: string; stakeholderId: string; keys: string[] }[];
  leads: { stakeholderId: string; kind: string; why: Said2; eventDate: string }[];
  tracker: string[];
  /** null = no sourced rating (shown as Unverified). */
  marketChecks: { money: [Rating03, string, string] | null; licence: [Rating03, string, string] | null };
  why: Record<string, Said2>;
  rationale: Said2[];
  judgments: [text: string, icd: IcdTerm, confidence: Confidence, ...keys: string[]][];
  plan: Record<"prep" | "contact" | "event" | "followUp", [text: string, stakeholderId: string, ...keys: string[]][]>;
  summary: Said2[];
  risks: Said2[];
  requirements: [topic: RequirementTopic, text: string, ...keys: string[]][];
  needs: string[];
  /** Hand translation of every research-written sentence; same numbers and dates. */
  zh: Record<string, string>;
}

export const NO_ROUTE = "Find a sourced contact route first";

export function buildSample(m: MarketSpec): Dossier {
  const D = m.id;
  const RUN_ID = `${m.id}-run`;
  const AT = m.at;
  const snapshot = new Date(AT);
  const keys = new Map<string, string>();

  const sources: Source[] = m.sources.map((r, i) => {
    const id = `${m.prefix}-s${i + 1}`;
    if (keys.has(r.key)) throw new Error(`${m.id}: duplicate source handle "${r.key}"`);
    keys.set(r.key, id);
    return {
      id,
      dossierId: D,
      label: `S${i + 1}`,
      url: r.url,
      title: r.title,
      publisher: r.publisher,
      sourceType: r.sourceType,
      excerpt: r.excerpt,
      excerptLang: r.excerptLang,
      translation: null,
      reliability: r.reliability,
      credibility: r.credibility,
      credibilityReason: r.credibilityReason,
      publishedAt: null,
      verifiedAt: r.verifiedAt,
      origin: "manual",
      accepted: true,
      rejectReason: null,
      runId: RUN_ID,
      createdAt: AT,
    };
  });

  const sid = (key: string): string => {
    const id = keys.get(key);
    if (!id) throw new Error(`${m.id}: unknown source handle "${key}"`);
    return id;
  };
  const s = ([text, ...k]: Said2): Sentence => ({ text, sourceIds: k.map(sid) });

  const stakeholders: Stakeholder[] = m.orgs.map((o) => ({
    id: o.id,
    dossierId: D,
    name: o.name,
    nameZh: o.nameZh,
    short: o.short,
    category: o.category,
    isChina: false,
    isPerson: false,
    role: o.role[0],
    city: o.city ?? null,
    lat: null,
    lng: null,
    x: o.pos[0],
    y: o.pos[1],
    z: o.pos[2],
    status: "active",
    firstRunId: RUN_ID,
    lastRunId: RUN_ID,
    createdAt: AT,
  }));

  const fact = (o: Org, field: FactField, value: string, rating: Rating03 | null, cites: Cite[]): Fact => ({
    id: `${o.id}-${field}`,
    stakeholderId: o.id,
    runId: RUN_ID,
    field,
    value,
    rating,
    quote: cites[0]?.[1] ?? null,
    sourceIds: cites.map(([k]) => sid(k)),
    status: cites.length > 0 ? "sourced" : "unverified",
    model: null,
    createdAt: AT,
  });

  const facts: Fact[] = m.orgs.flatMap((o): Fact[] => {
    const out: Fact[] = [fact(o, "role", o.role[0], null, [[o.role[1], o.role[2]]])];
    if (o.head) out.push(fact(o, "head", o.head[0], null, [[o.head[1], o.head[2]]]));
    for (const f of ["authority", "budget", "access", "recent"] as const) {
      const r = o[f];
      if (r) out.push(fact(o, f, r[1], r[0], [[r[2], r[3]]]));
      else if (o.category !== "evt") out.push(fact(o, f, "No sourced rating", null, []));
    }
    out.push(o.action ? fact(o, "action", o.action[0], null, [[o.action[1], o.action[2]]]) : fact(o, "action", NO_ROUTE, null, []));
    return out;
  });

  const statements: SupportStatement[] = m.orgs.flatMap((o) =>
    (o.said ?? []).map(([rating, summary, key, quote], i) => ({
      id: `${o.id}-st${i + 1}`,
      stakeholderId: o.id,
      runId: RUN_ID,
      debriefId: null,
      rating,
      summary,
      quote,
      sourceId: sid(key),
      statedAt: null,
      createdAt: AT,
    })),
  );

  const edges: Edge[] = m.edges.map(([a, b, relation, ...k]) => ({
    id: `${a}-${b}`,
    dossierId: D,
    aId: a,
    bId: b,
    relation,
    sourceIds: k.map(sid),
    status: "sourced",
    createdAt: AT,
  }));

  const events: TimedEvent[] = m.events.map((e) => ({
    id: e.id,
    dossierId: D,
    title: e.title,
    kind: "event",
    date: e.date,
    stakeholderIds: [e.stakeholderId],
    sourceIds: e.keys.map(sid),
    status: "sourced",
    relevantToGoal: true,
    createdAt: AT,
  }));

  const leads: Lead[] = m.leads.map((l) => {
    const why = s(l.why);
    return {
      id: `lead-${l.stakeholderId}`,
      dossierId: D,
      type: "event",
      stakeholderId: l.stakeholderId,
      name: m.orgs.find((o) => o.id === l.stakeholderId)!.name,
      kind: l.kind,
      match: { type: "attendees", stakeholderIds: [] },
      meta: null,
      why,
      route: null,
      eventDate: l.eventDate,
      sourceIds: why.sourceIds,
      verification: "sourced",
      status: "new",
      createdAt: AT,
    };
  });

  const tracker: TrackerItem[] = m.tracker.map((id) => ({
    id: `trk-${id}`,
    dossierId: D,
    stakeholderId: id,
    leadId: null,
    stage: "found",
    nextStep: m.orgs.find((o) => o.id === id)!.action?.[0] ?? NO_ROUTE,
    dueDate: null,
    meetingAt: null,
    origin: "map",
    createdAt: AT,
  }));

  const check = (c: [Rating03, string, string] | null) =>
    c ? { rating: c[0], quote: c[1], sourceIds: [sid(c[2])], status: "sourced" as const } : { rating: null, quote: null, sourceIds: [], status: "unverified" as const };

  const base: Dossier = {
    id: D,
    shareId: m.shareId,
    isSample: true,
    name: m.name,
    company: m.company,
    product: m.product,
    market: m.market,
    goal: m.goal,
    certifications: null,
    priceRange: null,
    twPartners: null,
    clientDeadline: null,
    status: "ready",
    marketChecks: { money: check(m.marketChecks.money), licence: check(m.marketChecks.licence) },
    refreshedAt: AT,
    currentRunId: RUN_ID,
    createdAt: AT,
    run: { id: RUN_ID, dossierId: D, kind: "initial", status: "done", startedAt: AT, deadlineAt: null, finishedAt: AT, error: null, createdAt: AT },
    sources,
    stakeholders,
    facts,
    statements,
    edges,
    events,
    briefs: [],
    leads,
    tracker,
    debriefs: [],
    documentRequests: [],
    documents: [],
    intros: [],
    team: [],
    contacts: [],
    ties: [],
    introDrafts: [],
    aliases: [],
  };

  // The contact order comes from the scoring code, like every other dossier.
  const scored = scoreStakeholders(base, snapshot).filter((x) => x.eligible);
  const counts = new Map(scored.map((x) => [x.id, x.sourceCount]));
  const path = contactFirst(scored, { sourceCounts: counts })
    .filter((p) => m.why[p.stakeholderId])
    .map((p) => ({ stakeholderId: p.stakeholderId, why: s(m.why[p.stakeholderId]) }));
  const act = ([text, stakeholderId, ...k]: [string, string, ...string[]]) => ({ text, stakeholderId, sourceIds: k.map(sid) });

  const brief: Brief = {
    id: `${m.id}-brief-1`,
    dossierId: D,
    version: 1,
    metrics: briefMetrics(base, snapshot),
    rationale: m.rationale.map(s),
    judgments: m.judgments.map(([text, icd, confidence, ...k]) => ({ text, icd, confidence, sourceIds: k.map(sid) })),
    path,
    reduceOpposition: [],
    plan: { prep: m.plan.prep.map(act), contact: m.plan.contact.map(act), event: m.plan.event.map(act), followUp: m.plan.followUp.map(act) },
    summary: m.summary.map(s),
    risks: m.risks.map(s),
    requirements: m.requirements.map(([topic, text, ...k]) => ({ topic, text, sourceIds: k.map(sid) })),
    routes: [],
    meet: events.map((e) => ({ eventId: e.id, title: e.title, date: e.date!, mappedStakeholders: 0, sourceIds: e.sourceIds })),
    needs: m.needs,
    changesNote: [],
    zh: m.zh,
    inputsAt: AT,
    createdAt: AT,
  };

  return { ...base, briefs: [brief] };
}

/** The handle → id map of a built sample, for report content that cites the same sources. */
export function sourceIdOf(d: Dossier, spec: MarketSpec, key: string): string {
  const i = spec.sources.findIndex((r) => r.key === key);
  if (i < 0) throw new Error(`${spec.id}: unknown source handle "${key}"`);
  return d.sources[i].id;
}
