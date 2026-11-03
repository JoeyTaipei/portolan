// The Vietnam sample behind /d/sample-vn (spec MKT-2, plan S21). Sample data.
//
// Curated by hand on 2026-11-03 from public web pages (no Parallel or Claude call). Real
// organisations only; the client is an unnamed sample. Same rules as sample-dossier.ts:
// - Every excerpt is copied verbatim from the page at its URL (paragraphs that aren't next to
//   each other are joined with " … ").
// - Every rating, statement, next step, edge and brief sentence cites these sources; every
//   quote appears in the cited excerpt; every number in a brief sentence appears in a cited
//   excerpt. No source → Unverified; no statement → support Unknown.
// - Names only for sourced public officials; nobody else is named.
// - 繁中: every research-written sentence has a hand translation in the brief's `zh`, with the
//   same numbers and dates.
import { SAMPLE_VN_ID, SAMPLE_VN_SHARE_ID } from "@/lib/ids";
import { briefMetrics, contactFirst, scoreStakeholders } from "@/lib/scoring";
import type {
  Brief,
  Category,
  Credibility,
  Dossier,
  Edge,
  Fact,
  FactField,
  Lead,
  Rating03,
  Reliability,
  Sentence,
  Source,
  SourceType,
  Stakeholder,
  StatementRating,
  SupportStatement,
  TimedEvent,
  TrackerItem,
} from "@/lib/types";

const D = SAMPLE_VN_ID;
const RUN_ID = "sample-vn-run";
const AT = "2026-11-03T02:00:00Z";
/** Scores and the contact order are computed at this time. */
const SNAPSHOT_AT = new Date("2026-11-03T00:00:00Z");
const NO_ROUTE = "Find a sourced contact route first";

interface RawSource {
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
  accepted: boolean;
  rejectReason: string | null;
  excerpt: string;
}

const RAW = rawSources();
const sourceKeys = new Map<string, string>();

const sources: Source[] = RAW.map((r, i) => {
  const id = `vn-s${i + 1}`;
  sourceKeys.set(r.key, id);
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
    accepted: r.accepted,
    rejectReason: r.rejectReason,
    runId: RUN_ID,
    createdAt: AT,
  };
});

function sid(key: string): string {
  const id = sourceKeys.get(key);
  if (!id) throw new Error(`sample-vietnam: unknown source handle "${key}"`);
  return id;
}

// ─── Stakeholders (hand-curated) ─────────────────────────────────────────────

type Cite = [key: string, quote: string];
type Rated = [rating: Rating03, value: string, ...cite: Cite];
type Said = [rating: StatementRating, summary: string, ...cite: Cite];
type Told = [value: string, ...cite: Cite];

interface Org {
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

const LICENCE_Q = "managing and organizing the grant, re-grant, renewal, and revocation of the business licenses for international travel services";
const INBOUND_Q = "foreign-invested enterprises are only permitted to provide international travel services for inbound foreign tourists visiting Vietnam";
const FAMTRIP_Q = "has coordinated with Vietjet Air and Sun Group to host a famtrip delegation from Taiwan (China)";
const ITE_ORG_Q = "co-organized by the Vietnam National Authority of Tourism and the Ho Chi Minh City Department of Tourism";
const TW_FILE_Q = "應報請交通部觀光署備查";

const ORGS: Org[] = [
  // Government (Vietnam)
  {
    id: "vn-vnat",
    name: "Vietnam National Authority of Tourism",
    nameZh: "越南國家旅遊總局",
    short: "VNAT",
    category: "gov",
    city: "Hanoi",
    pos: [-0.45, -0.5, 0.35],
    role: ["Issues and revokes Vietnam's international travel business licences", "bcp-vnat", LICENCE_Q],
    authority: [3, "Grants and revokes the international travel licence a ground operator needs", "bcp-vnat", LICENCE_Q],
    access: [3, "Receives the licence application directly", "vlm-foreign", "submit an application dossier to the Vietnam National Authority of Tourism"],
    recent: [2, "Led Vietnam's delegation to the ASEAN Tourism Forum to promote the national brand", "vnnews-25m", "A delegation from the Việt Nam National Authority of Tourism under the Ministry of Culture, Sports and Tourism will attend the events"],
    said: [[1, "Is promoting Vietnam abroad to attract more international arrivals", "vnnews-25m", "as part of efforts to attract 25 million international tourist arrivals in 2026"]],
    action: ["Ask your Vietnamese partner to show its VNAT international travel licence before you sign", "bcp-vnat", LICENCE_Q],
  },
  {
    id: "vn-mocst",
    name: "Ministry of Culture, Sports and Tourism",
    nameZh: "越南文化體育旅遊部",
    short: "Ministry of Culture, Sports and Tourism",
    category: "gov",
    city: "Hanoi",
    pos: [-0.7, -0.3, 0.1],
    role: ["Government ministry in charge of tourism nationwide; VNAT is one of its bodies", "vnnet-mocst", "responsible for state management nationwide in culture; family affairs; physical training and sports; tourism"],
    authority: [2, "Sets the licence application form that VNAT uses", "vlm-foreign", "made according to the form provided by the Minister of Culture, Sports and Tourism"],
    access: [2, "VNAT advises the Minister directly", "mekong-rename", "giving advice, assisting the Minister in state management of tourism"],
    recent: [2, "Directs Ho Chi Minh City's international travel expo", "bernama-ite", "held under the direction of the Ministry of Culture, Sports and Tourism"],
    action: ["Check the Ministry's current licence form with your Vietnamese partner", "vlm-foreign", "made according to the form provided by the Minister of Culture, Sports and Tourism"],
  },
  {
    id: "vn-danang",
    name: "Da Nang Department of Culture, Sports and Tourism",
    nameZh: "峴港市文化體育旅遊廳",
    short: "Da Nang tourism department",
    category: "gov",
    city: "Da Nang",
    pos: [-0.2, -0.75, 0.6],
    role: ["Runs tourism promotion for Da Nang and hosts trips for Taiwanese travel companies", "vov-danang", FAMTRIP_Q],
    access: [2, "Meets Taiwanese travel companies in person", "vov-danang", "held a gala dinner to strengthen connections with the Taiwanese famtrip delegation"],
    recent: [3, "Hosted 21 Taiwanese travel agencies in November 2025", "tuoitre-danang", "A group of 21 travel agencies from Taiwan wrapped up a six-day trip to Da Nang"],
    said: [[2, "Wants to expand cooperation with the Taiwanese market", "vov-danang", "expand cooperation with the Taiwanese market in the future"]],
    action: ["Ask to join the department's next trip for Taiwanese travel companies", "vov-danang", FAMTRIP_Q],
  },
  {
    id: "vn-hcmc",
    name: "Ho Chi Minh City Department of Tourism",
    nameZh: "胡志明市旅遊廳",
    short: "HCMC Department of Tourism",
    category: "gov",
    city: "Ho Chi Minh City",
    pos: [-0.1, -0.55, -0.35],
    role: ["Co-organises the Ho Chi Minh City international travel expo", "bernama-ite", ITE_ORG_Q],
    recent: [2, "Co-organised ITE HCMC 2026", "bernama-ite", ITE_ORG_Q],
    action: ["Book B2B meetings at the expo it co-organises", "tbn-ite", "turn international travel-trade connections into business opportunities"],
  },
  {
    id: "vn-veco",
    name: "Vietnam Economic and Cultural Office in Taipei",
    nameZh: "駐台北越南經濟文化辦事處",
    short: "Vietnam office in Taipei",
    category: "gov",
    city: "Taipei",
    pos: [-0.85, 0.05, 0.45],
    role: ["Vietnam's representative office in Taipei", "vov-central", "Head of the Vietnam Economic and Cultural Office in Taipei"],
    head: ["Vu Tien Dung, Head", "vov-central", "Vu Tien Dung, Head of the Vietnam Economic and Cultural Office in Taipei"],
    recent: [1, "Spoke publicly about visitor growth between the two sides", "vov-central", "We believe that the number of visitors between the two sides this year will exceed the peak of the pre-pandemic period."],
    said: [[1, "Expects two-way visitor numbers to pass the pre-pandemic peak", "vov-central", "will exceed the peak of the pre-pandemic period"]],
    action: ["Brief the office on your first Taiwan–Vietnam tour and ask for its tourism contacts", "vov-central", "Head of the Vietnam Economic and Cultural Office in Taipei"],
  },
  // Government (Taiwan side)
  {
    id: "tw-tourism",
    name: "Tourism Administration, Ministry of Transportation and Communications",
    nameZh: "交通部觀光署",
    short: "Tourism Administration (Taiwan)",
    category: "gov",
    city: "Taipei",
    pos: [-0.6, 0.25, -0.2],
    role: ["Taiwan's travel-agency regulator; must be told when an agency works with a travel agency abroad", "moj-k0110002", TW_FILE_Q],
    authority: [2, "Receives the filing when a Taiwanese agency partners with a foreign travel agency", "moj-k0110002", TW_FILE_Q],
    access: [2, "Has an office in Ho Chi Minh City covering Vietnam (opened as the Tourism Bureau)", "taiwannews-hcmc", "在越南胡志明市正式成立交通部觀光局駐胡志明市辦事處"],
    action: ["File your Vietnamese ground-operator partnership with the Tourism Administration", "moj-k0110002", TW_FILE_Q],
  },
  // Industry
  {
    id: "tw-tqaa",
    name: "Travel Quality Assurance Association",
    nameZh: "中華民國旅行業品質保障協會",
    short: "Travel Quality Assurance Association",
    category: "ind",
    city: "Taipei",
    pos: [0.35, 0.45, -0.3],
    role: ["Taiwanese travel-industry association that tracks group-tour prices and demand", "vov-taiwan-q4", "According to the Travel Quality Assurance Association of Taiwan (China)"],
    recent: [1, "Forecast a rebound in Taiwanese arrivals to Vietnam", "vov-taiwan-q4", "the association forecasts a notable rebound in Taiwanese arrivals after the rainy season ends"],
    said: [[1, "Forecasts a notable rebound in Taiwanese arrivals to Vietnam", "vov-taiwan-q4", "the association forecasts a notable rebound in Taiwanese arrivals after the rainy season ends"]],
    action: null,
  },
  {
    id: "vn-vietravel",
    name: "Vietravel",
    nameZh: null,
    short: "Vietravel",
    category: "ind",
    city: "Ho Chi Minh City",
    pos: [0.55, 0.15, 0.35],
    role: ["Vietnamese travel company that sells tours both ways between Vietnam and Taiwan", "vietravel-award", "This includes inbound and outbound tourists between the countries."],
    access: [1, "Has worked with Taiwan's tourism authority", "vietravel-award", "The award was conferred by the Taiwan National Administration of Tourism"],
    said: [[2, "Calls Taiwan a key market it wants to invest in", "vietravel-award", "The Taiwanese market is always a key destination that Vietravel is interested in investing in and exploiting."]],
    action: ["Ask Vietravel whether it would be the ground operator for your first Taiwan group", "vietravel-award", "This includes inbound and outbound tourists between the countries."],
  },
  {
    id: "vn-vietjet",
    name: "Vietjet Air",
    nameZh: "越捷航空",
    short: "Vietjet",
    category: "ind",
    city: "Hanoi",
    pos: [0.7, -0.15, 0.05],
    role: ["Vietnamese airline with eight direct routes to Taiwan", "vnnews-vietjet", "through a total of eight direct routes"],
    access: [2, "Co-hosted Da Nang's trip for Taiwanese travel companies", "vov-danang", FAMTRIP_Q],
    recent: [3, "Launched a direct Hanoi–Tainan route", "vnnews-vietjet", "Vietjet has launched its direct Hà Nội-Tainan route"],
    said: [[1, "Wants its Taiwan routes to promote tourism", "vnnews-vietjet", "helping promote tourism, economic exchange and stronger community ties"]],
    action: ["Ask Vietjet for group fares on its Taiwan routes", "vnnews-vietjet", "through a total of eight direct routes"],
  },
  {
    id: "vn-vna",
    name: "Vietnam Airlines",
    nameZh: "越南航空",
    short: "Vietnam Airlines",
    category: "ind",
    city: "Hanoi",
    pos: [0.45, -0.45, -0.25],
    role: ["Vietnam's flag carrier, flying between Hanoi and Taipei", "vnnews-vna", "From Hà Nội, Vietnam Airlines has increased flights to Taipei"],
    recent: [3, "Increased Hanoi–Taipei flights from seven to 11 a week", "vnnews-vna", "From Hà Nội, Vietnam Airlines has increased flights to Taipei from seven to 11 services per week."],
    said: [[1, "Is expanding Taiwan services because tourism demand is growing", "vnnews-vna", "Growing demand for tourism, business travel and family visits between Việt Nam and Northeast Asia has prompted Vietnam Airlines to expand services"]],
    action: ["Compare group fares on Vietnam Airlines' Hanoi–Taipei route", "vnnews-vna", "From Hà Nội, Vietnam Airlines has increased flights to Taipei"],
  },
  {
    id: "vn-sungroup",
    name: "Sun Group",
    nameZh: "太陽集團",
    short: "Sun Group",
    category: "ind",
    city: "Da Nang",
    pos: [0.3, -0.7, 0.4],
    role: ["Tourism group behind Sun World Ba Na Hills in Da Nang", "vov-danang", "Sun World Ba Na Hills"],
    access: [2, "Co-hosted Da Nang's trip for Taiwanese travel companies", "vov-danang", FAMTRIP_Q],
    recent: [2, "Showed its products to Taiwanese agencies in November", "vov-danang", "enabling them to survey and experience tourism products and services in the city"],
    said: [[1, "Co-hosted a trip so Taiwanese agencies could try its products", "vov-danang", "enabling them to survey and experience tourism products and services in the city"]],
    action: ["Ask Sun Group for group rates at Sun World Ba Na Hills", "vov-danang", "Sun World Ba Na Hills"],
  },
  // Events
  {
    id: "vn-ite",
    name: "ITE HCMC 2027",
    nameZh: "胡志明市國際旅展 2027",
    short: "ITE HCMC 2027",
    category: "evt",
    city: "Ho Chi Minh City",
    pos: [0.1, 0.65, 0.2],
    role: ["Vietnam's leading annual international travel expo", "tbn-ite", "ITE HCMC is Vietnam’s leading annual international travel expo"],
    action: ["Book B2B meetings with Vietnamese ground operators at ITE HCMC 2027", "tbn-ite", "turn international travel-trade connections into business opportunities"],
  },
  {
    id: "tw-itf",
    name: "ITF Taiwan International Travel Fair 2026",
    nameZh: "ITF台灣國際旅展 2026",
    short: "ITF 2026",
    category: "evt",
    city: "Taipei",
    pos: [-0.25, 0.7, -0.4],
    role: ["Taiwan's international travel fair at Nangang Exhibition Center", "ctee-itf", "在台北南港展覽館一館登場"],
    action: ["Use ITF to test Taiwanese interest in a first Vietnam tour", "ctee-itf", "集結123個國家及城市、1,600個攤位"],
  },
];

const stakeholders: Stakeholder[] = ORGS.map((o) => ({
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

function fact(o: Org, field: FactField, value: string, rating: Rating03 | null, cites: Cite[]): Fact {
  return {
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
  };
}

const told = ([value, ...cite]: Told): [string, Cite[]] => [value, cite.length ? [cite as unknown as Cite] : []];

const facts: Fact[] = ORGS.flatMap((o): Fact[] => {
  const out: Fact[] = [fact(o, "role", o.role[0], null, told(o.role)[1])];
  if (o.head) out.push(fact(o, "head", o.head[0], null, told(o.head)[1]));
  for (const f of ["authority", "budget", "access", "recent"] as const) {
    const r = o[f];
    if (r) out.push(fact(o, f, r[1], r[0], [[r[2], r[3]]]));
    else if (o.category !== "evt") out.push(fact(o, f, "No sourced rating", null, []));
  }
  out.push(o.action ? fact(o, "action", o.action[0], null, told(o.action)[1]) : fact(o, "action", NO_ROUTE, null, []));
  return out;
});

const statements: SupportStatement[] = ORGS.flatMap((o) =>
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

// ─── Edges (sourced only) ────────────────────────────────────────────────────

const EDGES: [a: string, b: string, relation: string, ...keys: string[]][] = [
  ["vn-vnat", "vn-mocst", "VNAT is an administrative body under the Ministry", "mekong-rename"],
  ["vn-vnat", "vn-ite", "Co-organises ITE HCMC", "bernama-ite"],
  ["vn-hcmc", "vn-ite", "Co-organises ITE HCMC", "bernama-ite"],
  ["vn-mocst", "vn-ite", "Directs ITE HCMC", "bernama-ite"],
  ["vn-danang", "vn-vietjet", "Co-hosted the Taiwan famtrip", "vov-danang"],
  ["vn-danang", "vn-sungroup", "Co-hosted the Taiwan famtrip", "vov-danang"],
  ["vn-vietjet", "vn-sungroup", "Co-hosted the Taiwan famtrip", "vov-danang"],
  ["vn-vietravel", "tw-tourism", "Received Taiwan's tourism contribution award", "vietravel-award"],
];

const edges: Edge[] = EDGES.map(([a, b, relation, ...keys]) => ({
  id: `${a}-${b}`,
  dossierId: D,
  aId: a,
  bId: b,
  relation,
  sourceIds: keys.map(sid),
  status: "sourced",
  createdAt: AT,
}));

// ─── Events ──────────────────────────────────────────────────────────────────

const ev = (id: string, title: string, date: string, stakeholderId: string, ...keys: string[]): TimedEvent => ({
  id,
  dossierId: D,
  title,
  kind: "event",
  date,
  stakeholderIds: [stakeholderId],
  sourceIds: keys.map(sid),
  status: "sourced",
  relevantToGoal: true,
  createdAt: AT,
});

const events: TimedEvent[] = [
  ev("ev-vn-itf", "ITF Taiwan International Travel Fair 2026", "2026-11-06", "tw-itf", "ctee-itf", "yam-itf"),
  ev("ev-vn-ite", "ITE HCMC 2027", "2027-09-09", "vn-ite", "tbn-ite"),
];

const s = (text: string, ...keys: string[]): Sentence => ({ text, sourceIds: keys.map(sid) });

function eventLead(stakeholderId: string, kind: string, why: Sentence, eventDate: string): Lead {
  const o = ORGS.find((x) => x.id === stakeholderId)!;
  return {
    id: `lead-${stakeholderId}`,
    dossierId: D,
    type: "event",
    stakeholderId,
    name: o.name,
    kind,
    match: { type: "attendees", stakeholderIds: [] },
    meta: null,
    why,
    route: null,
    eventDate,
    sourceIds: why.sourceIds,
    verification: "sourced",
    status: "new",
    createdAt: AT,
  };
}

const leads: Lead[] = [
  eventLead("tw-itf", "Consumer travel fair", s("ITF 2026 runs 6–9 November at Nangang Exhibition Center Hall 1, with 1,600 booths.", "ctee-itf", "yam-itf"), "2026-11-06"),
  eventLead("vn-ite", "Travel trade expo", s("ITE HCMC 2027 returns from September 9 to 11, 2027 at SECC in Ho Chi Minh City.", "tbn-ite"), "2027-09-09"),
];

// ─── Tracker: the sample client's starting list (all still "Found") ──────────

const tracker: TrackerItem[] = ["vn-vietravel", "vn-danang", "vn-vnat", "tw-tourism"].map((id) => ({
  id: `trk-${id}`,
  dossierId: D,
  stakeholderId: id,
  leadId: null,
  stage: "found",
  nextStep: ORGS.find((o) => o.id === id)!.action?.[0] ?? NO_ROUTE,
  dueDate: null,
  meetingAt: null,
  origin: "map",
  createdAt: AT,
}));

const base: Dossier = {
  id: D,
  shareId: SAMPLE_VN_SHARE_ID,
  isSample: true,
  name: "Taiwan–Vietnam group tours",
  company: "Taiwanese travel-agency startup (sample client)",
  product: "Small-group tours from Taiwan to Vietnam",
  market: "VN",
  goal: "Sign a first Vietnamese ground operator and launch a first tour within 12 months",
  certifications: null,
  priceRange: null,
  twPartners: null,
  clientDeadline: null,
  status: "ready",
  marketChecks: {
    money: {
      rating: 2,
      quote: "followed by Taiwan (China) with around 1.23 million",
      sourceIds: [sid("vnnews-2025arrivals")],
      status: "sourced",
    },
    licence: {
      rating: 2,
      quote: "you must contribute capital with a Vietnamese partner to form a foreign-invested travel firm exclusively targeted at foreign tourists visiting Vietnam",
      sourceIds: [sid("vlm-foreign")],
      status: "sourced",
    },
  },
  refreshedAt: AT,
  currentRunId: RUN_ID,
  createdAt: AT,
  run: {
    id: RUN_ID,
    dossierId: D,
    kind: "initial",
    status: "done",
    startedAt: AT,
    deadlineAt: null,
    finishedAt: AT,
    error: null,
    createdAt: AT,
  },
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

// ─── Strategy brief v1 (every sentence cites sources) ────────────────────────

/** Why to contact each stakeholder; the order itself comes from scoring §5 below. */
const WHY: Record<string, Sentence> = {
  "vn-vnat": s("VNAT grants and revokes the international travel licence your Vietnamese partner must hold.", "bcp-vnat"),
  "vn-mocst": s("The Ministry is in charge of tourism nationwide and sets the licence form.", "vnnet-mocst", "vlm-foreign"),
  "vn-danang": s("Da Nang's tourism department hosts Taiwanese travel companies and wants more cooperation with Taiwan.", "vov-danang"),
  "vn-vietjet": s("Vietjet flies eight direct routes between Taiwan and Vietnam and co-hosted Da Nang's Taiwan trip.", "vnnews-vietjet", "vov-danang"),
  "vn-vna": s("Vietnam Airlines has added Hanoi–Taipei flights as tourism demand grows.", "vnnews-vna"),
  "vn-sungroup": s("Sun Group co-hosted Da Nang's trip so Taiwanese agencies could try its products.", "vov-danang"),
  "tw-tourism": s("Taiwanese agencies must report partnerships with foreign travel agencies to the Tourism Administration.", "moj-k0110002"),
  "vn-vietravel": s("Vietravel sells tours both ways between Vietnam and Taiwan and calls Taiwan a key market.", "vietravel-award"),
  "vn-hcmc": s("The HCMC Department of Tourism co-organises the city's international travel expo.", "bernama-ite"),
  "vn-veco": s("Vietnam's office in Taipei expects visitor numbers to pass the pre-pandemic peak.", "vov-central"),
  "tw-tqaa": s("The association forecasts a rebound in Taiwanese arrivals to Vietnam.", "vov-taiwan-q4"),
};

function path(): Brief["path"] {
  const scored = scoreStakeholders(base, SNAPSHOT_AT).filter((x) => x.eligible);
  const counts = new Map(scored.map((x) => [x.id, x.sourceCount]));
  return contactFirst(scored, { sourceCounts: counts })
    .filter((p) => WHY[p.stakeholderId])
    .map((p) => ({ stakeholderId: p.stakeholderId, why: WHY[p.stakeholderId] }));
}

const brief: Brief = {
  id: "sample-vn-brief-1",
  dossierId: D,
  version: 1,
  metrics: briefMetrics(base, SNAPSHOT_AT),
  rationale: [
    s("Taiwan is one of Vietnam's largest source markets: about 1.23 million visitors came from Taiwan in 2025.", "vnnews-2025arrivals"),
    s("A Taiwanese agency cannot run tours inside Vietnam on its own, because a foreign-invested firm may serve only inbound foreign tourists.", "vlm-foreign"),
    s("The Vietnamese partner needs an international tour operator licence from VNAT and a VND 250 million deposit.", "vlm-foreign"),
    s("Da Nang's tourism department is courting Taiwanese agencies: it hosted 21 of them in November 2025.", "tuoitre-danang"),
    s("Flights are plentiful: Vietjet alone flies eight direct routes between Taiwan and Vietnam.", "vnnews-vietjet"),
  ],
  judgments: [
    {
      text: "A first Taiwan–Vietnam tour will likely need a licensed Vietnamese ground operator, because a foreign-invested firm may serve only inbound tourists.",
      icd: "likely",
      confidence: "Moderate",
      sourceIds: [sid("vlm-foreign")],
    },
    {
      text: "Da Nang is likely the most welcoming first destination: Taiwan is its second-largest source market and its tourism department wants more cooperation.",
      icd: "likely",
      confidence: "Moderate",
      sourceIds: [sid("vov-danang")],
    },
    {
      text: "Demand from Taiwan will likely hold up, as airlines add direct flights from Taipei, Kaohsiung and Tainan.",
      icd: "likely",
      confidence: "Moderate",
      sourceIds: [sid("vnnews-vietjet"), sid("vnnews-vna")],
    },
  ],
  path: path(),
  reduceOpposition: [],
  plan: {
    prep: [
      { text: "Confirm your Taiwan licence lets you organise your own outbound group tours", stakeholderId: "tw-tourism", sourceIds: [sid("moj-k0110002")] },
      { text: "Check that each Vietnamese candidate holds a VNAT international travel licence", stakeholderId: "vn-vnat", sourceIds: [sid("bcp-vnat")] },
    ],
    contact: [
      { text: "Ask Vietravel whether it would be the ground operator for your first group", stakeholderId: "vn-vietravel", sourceIds: [sid("vietravel-award")] },
      { text: "Ask Da Nang's tourism department to include you in its next Taiwan trip", stakeholderId: "vn-danang", sourceIds: [sid("vov-danang")] },
      { text: "Ask Vietjet for group fares on its Taiwan routes", stakeholderId: "vn-vietjet", sourceIds: [sid("vnnews-vietjet")] },
    ],
    event: [{ text: "Visit ITF to test Taiwanese interest in a first Vietnam tour", stakeholderId: "tw-itf", sourceIds: [sid("ctee-itf")] }],
    followUp: [
      { text: "File the signed partnership with the Tourism Administration", stakeholderId: "tw-tourism", sourceIds: [sid("moj-k0110002")] },
      { text: "Plan B2B meetings at ITE HCMC 2027", stakeholderId: "vn-ite", sourceIds: [sid("tbn-ite")] },
    ],
  },
  summary: [
    s("About 1.23 million visitors came from Taiwan to Vietnam in 2025.", "vnnews-2025arrivals"),
    s("Sell the tour from Taiwan and partner with a licensed Vietnamese ground operator, because foreign-invested firms may serve only inbound tourists.", "vlm-foreign"),
    s("Start with Da Nang, whose tourism department is courting Taiwanese agencies.", "vov-danang"),
  ],
  risks: [
    s("A ground operator without a valid VNAT licence cannot legally run international tours, and VNAT can revoke licences.", "bcp-vnat"),
    s("Arrivals from Taiwan dipped slightly in 2025 from the previous year.", "vnnews-2025arrivals"),
    s("Taiwanese agencies must report partnerships with foreign travel agencies to the Tourism Administration.", "moj-k0110002"),
  ],
  requirements: [
    { topic: "who_can_bid", ...s("Only firms with a VNAT international travel licence may run international tours in Vietnam.", "bcp-vnat") },
    { topic: "procurement_route", ...s("Foreign-invested travel firms may serve only inbound foreign tourists visiting Vietnam.", "vlm-foreign") },
    { topic: "screening", ...s("The licence needs a VND 250 million bank deposit and a qualified person in charge.", "vlm-foreign") },
    { topic: "import_permit", ...s("Visitors from all countries can get a Vietnamese e-visa valid for up to 90 days.", "tuoitre-evisa") },
    { topic: "local_content", ...s("In Taiwan, a Class A travel agency may organise its own outbound group tours.", "moj-k0110002") },
  ],
  routes: [],
  meet: events.map((e) => ({ eventId: e.id, title: e.title, date: e.date!, mappedStakeholders: 0, sourceIds: e.sourceIds })),
  needs: ["Needs from you: your price range", "Needs from you: any existing Vietnam partners", "Needs from you: your own deadline, if you have one"],
  changesNote: [],
  zh: ZH(),
  inputsAt: AT,
  createdAt: AT,
};

export const sampleVietnam: Dossier = { ...base, briefs: [brief] };

// ─── 繁中 (hand-translated; same numbers and dates as the English) ─────────────

function ZH(): Record<string, string> {
  return {
    // market and client
    "Taiwan–Vietnam group tours": "台灣出發越南團體旅遊",
    "Taiwanese travel-agency startup (sample client)": "台灣旅行社新創（範例客戶）",
    "Small-group tours from Taiwan to Vietnam": "台灣出發的越南小團旅遊",
    "Sign a first Vietnamese ground operator and launch a first tour within 12 months": "12 個月內簽下第一家越南地接社，推出第一條行程",

    // judgments
    "A first Taiwan–Vietnam tour will likely need a licensed Vietnamese ground operator, because a foreign-invested firm may serve only inbound tourists.":
      "第一條台越行程很可能需要一家有執照的越南地接社，因為外資旅行社只能接待入境的外國旅客。",
    "Da Nang is likely the most welcoming first destination: Taiwan is its second-largest source market and its tourism department wants more cooperation.":
      "峴港很可能是最歡迎台灣團的第一站：台灣是它第二大客源市場，當地旅遊主管機關也想擴大合作。",
    "Demand from Taiwan will likely hold up, as airlines add direct flights from Taipei, Kaohsiung and Tainan.":
      "台灣的需求很可能維持，航空公司正增加台北、高雄和台南的直飛航班。",

    // rationale
    "Taiwan is one of Vietnam's largest source markets: about 1.23 million visitors came from Taiwan in 2025.":
      "台灣是越南最大的客源市場之一：2025 年約有 123 萬人次從台灣到越南。",
    "A Taiwanese agency cannot run tours inside Vietnam on its own, because a foreign-invested firm may serve only inbound foreign tourists.":
      "台灣旅行社不能自己在越南境內操作行程，因為外資旅行社只能接待入境的外國旅客。",
    "The Vietnamese partner needs an international tour operator licence from VNAT and a VND 250 million deposit.":
      "越南合作夥伴需要越南國家旅遊總局核發的國際旅行業執照，並存入 2.5 億越南盾（VND 250 million）保證金。",
    "Da Nang's tourism department is courting Taiwanese agencies: it hosted 21 of them in November 2025.":
      "峴港旅遊主管機關正在爭取台灣旅行社：2025 年 11 月接待了 21 家。",
    "Flights are plentiful: Vietjet alone flies eight direct routes between Taiwan and Vietnam.":
      "航班很多：光是越捷航空就有 8 條台越直飛航線。",

    // path
    "VNAT grants and revokes the international travel licence your Vietnamese partner must hold.": "越南國家旅遊總局核發和撤銷你的越南夥伴必須持有的國際旅行業執照。",
    "The Ministry is in charge of tourism nationwide and sets the licence form.": "文化體育旅遊部主管全國旅遊業，並訂定執照申請表格。",
    "Da Nang's tourism department hosts Taiwanese travel companies and wants more cooperation with Taiwan.": "峴港旅遊主管機關會接待台灣旅行社，並希望和台灣擴大合作。",
    "Vietjet flies eight direct routes between Taiwan and Vietnam and co-hosted Da Nang's Taiwan trip.": "越捷航空有 8 條台越直飛航線，也合辦了峴港的台灣業者考察團。",
    "Vietnam Airlines has added Hanoi–Taipei flights as tourism demand grows.": "越南航空因旅遊需求成長，增加了河內—台北航班。",
    "Sun Group co-hosted Da Nang's trip so Taiwanese agencies could try its products.": "太陽集團合辦峴港考察團，讓台灣旅行社體驗它的產品。",
    "Taiwanese agencies must report partnerships with foreign travel agencies to the Tourism Administration.": "台灣旅行社和國外旅行社合作，必須報交通部觀光署備查。",
    "Vietravel sells tours both ways between Vietnam and Taiwan and calls Taiwan a key market.": "Vietravel 經營越南與台灣雙向的旅遊，並把台灣視為重點市場。",
    "The HCMC Department of Tourism co-organises the city's international travel expo.": "胡志明市旅遊廳合辦該市的國際旅展。",
    "Vietnam's office in Taipei expects visitor numbers to pass the pre-pandemic peak.": "駐台北越南經濟文化辦事處預期雙邊旅客會超過疫情前高峰。",
    "The association forecasts a rebound in Taiwanese arrivals to Vietnam.": "品保協會預測台灣赴越旅客會回升。",

    // plan
    "Confirm your Taiwan licence lets you organise your own outbound group tours": "確認你在台灣的旅行業執照可以自行組團出國",
    "Check that each Vietnamese candidate holds a VNAT international travel licence": "確認每家越南候選業者都持有越南國家旅遊總局的國際旅行業執照",
    "Ask Vietravel whether it would be the ground operator for your first group": "詢問 Vietravel 是否願意擔任你第一團的地接社",
    "Ask Da Nang's tourism department to include you in its next Taiwan trip": "請峴港旅遊主管機關讓你加入下一次台灣業者考察團",
    "Ask Vietjet for group fares on its Taiwan routes": "向越捷航空詢問台灣航線的團體票價",
    "Visit ITF to test Taiwanese interest in a first Vietnam tour": "到 ITF 旅展測試台灣旅客對第一條越南行程的興趣",
    "File the signed partnership with the Tourism Administration": "簽約後把合作案報交通部觀光署備查",
    "Plan B2B meetings at ITE HCMC 2027": "規劃在 ITE HCMC 2027 的 B2B 洽談",

    // summary and risks
    "About 1.23 million visitors came from Taiwan to Vietnam in 2025.": "2025 年約有 123 萬人次從台灣到越南。",
    "Sell the tour from Taiwan and partner with a licensed Vietnamese ground operator, because foreign-invested firms may serve only inbound tourists.":
      "在台灣銷售行程，並和有執照的越南地接社合作，因為外資旅行社只能接待入境旅客。",
    "Start with Da Nang, whose tourism department is courting Taiwanese agencies.": "從峴港開始，當地旅遊主管機關正在爭取台灣旅行社。",
    "A ground operator without a valid VNAT licence cannot legally run international tours, and VNAT can revoke licences.":
      "沒有有效越南國家旅遊總局執照的地接社不能合法經營國際旅遊，而且執照可能被撤銷。",
    "Arrivals from Taiwan dipped slightly in 2025 from the previous year.": "2025 年台灣旅客比前一年略為減少。",

    // requirements
    "Only firms with a VNAT international travel licence may run international tours in Vietnam.": "只有持越南國家旅遊總局國際旅行業執照的業者，才能在越南經營國際旅遊。",
    "Foreign-invested travel firms may serve only inbound foreign tourists visiting Vietnam.": "外資旅行社只能接待入境越南的外國旅客。",
    "The licence needs a VND 250 million bank deposit and a qualified person in charge.": "申請執照需要 2.5 億越南盾（VND 250 million）銀行保證金和一位合格的負責人。",
    "Visitors from all countries can get a Vietnamese e-visa valid for up to 90 days.": "所有國家的旅客都能申請越南電子簽證，最長 90 天。",
    "In Taiwan, a Class A travel agency may organise its own outbound group tours.": "在台灣，甲種旅行社可以自行組團出國旅遊。",

    // needs
    "Needs from you: any existing Vietnam partners": "需要你提供：你在越南已有的夥伴",

    // next steps
    "Ask your Vietnamese partner to show its VNAT international travel licence before you sign": "簽約前請越南夥伴出示越南國家旅遊總局的國際旅行業執照",
    "Check the Ministry's current licence form with your Vietnamese partner": "和越南夥伴確認文化體育旅遊部目前的執照申請表格",
    "Ask to join the department's next trip for Taiwanese travel companies": "申請加入該廳下一次台灣旅行業者考察團",
    "Book B2B meetings at the expo it co-organises": "在它合辦的旅展預約 B2B 洽談",
    "Brief the office on your first Taiwan–Vietnam tour and ask for its tourism contacts": "向辦事處介紹你的第一條台越行程，並詢問觀光聯絡窗口",
    "File your Vietnamese ground-operator partnership with the Tourism Administration": "把和越南地接社的合作報交通部觀光署備查",
    "Ask Vietravel whether it would be the ground operator for your first Taiwan group": "詢問 Vietravel 是否願意擔任你第一個台灣團的地接社",
    "Compare group fares on Vietnam Airlines' Hanoi–Taipei route": "比較越南航空河內—台北航線的團體票價",
    "Ask Sun Group for group rates at Sun World Ba Na Hills": "向太陽集團詢問巴拿山太陽世界的團體價",
    "Book B2B meetings with Vietnamese ground operators at ITE HCMC 2027": "在 ITE HCMC 2027 預約和越南地接社的 B2B 洽談",
    "Use ITF to test Taiwanese interest in a first Vietnam tour": "利用 ITF 旅展測試台灣旅客對第一條越南行程的興趣",

    // events and leads
    "ITF Taiwan International Travel Fair 2026": "ITF台灣國際旅展 2026",
    "ITE HCMC 2027": "胡志明市國際旅展 2027",
    "ITF 2026 runs 6–9 November at Nangang Exhibition Center Hall 1, with 1,600 booths.": "ITF 2026 於 11 月 6–9 日在南港展覽館一館舉行，共 1,600 個攤位。",
    "ITE HCMC 2027 returns from September 9 to 11, 2027 at SECC in Ho Chi Minh City.": "ITE HCMC 2027 將於 2027 年 9 月 9 日至 11 日在胡志明市 SECC 舉行。",
  };
}

// ─── Sources: copied verbatim from each page on 2026-11-03 ───────────────────

function rawSources(): RawSource[] {
  return [
    {"key": "vnnews-2025arrivals", "url": "https://vietnamnews.vn/Society/1743207/viet-nam-s-international-tourism-sees-best-year-in-2025-with-arrivals-hitting-over-21-million.html", "title": "Việt Nam's international tourism sees best year in 2025, with arrivals hitting over 21 million", "publisher": "Viet Nam News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "China regained its position as Việt Nam's largest source market, sending more than 5.28 million visitors in 2025. That figure was 41.3 per cent higher than in 2024 and equivalent to about 91 per cent of pre-pandemic levels in 2019, the data showed. South Korea ranked second with more than 4.33 million arrivals, followed by Taiwan (China) with around 1.23 million, although both markets posted slight declines from the previous year."},
    {"key": "vov-taiwan-q4", "url": "https://vov.gov.vn/taiwanese-tourists-to-vietnam-expected-to-surge-in-q4-2025-dtnew-1107725", "title": "Taiwanese tourists to Vietnam expected to surge in Q4 2025", "publisher": "Voice of Vietnam", "sourceType": "government_site", "excerptLang": "en", "reliability": "A", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "According to the Travel Quality Assurance Association of Taiwan (China), Taiwanese travelers will enjoy approximately 10% lower prices for group tours to several Southeast Asian countries, including Malaysia, Thailand, the Philippines, and Indonesia in Q4 thanks to currency exchange rate differences, an increase in international flights, and business strategies aimed at boosting sales. In contrast, while tour prices to Vietnam may be higher in the fourth quarter, the association forecasts a notable rebound in Taiwanese arrivals after the rainy season ends. Hanoi and Da Nang remain among the most popular destinations. Notably, after visiting Hanoi, many Taiwanese tourists prioritize trips to Ha Long Bay in Quang Ninh province. Taiwan was the third largest tourist market for Vietnam in the first half of the year, with nearly 630,000 arrivals. Last year, Vietnam welcomed nearly 1.29 million Taiwanese visitors. Travel from Taiwan to Vietnam is now highly convenient, with numerous direct flights to key tourist hubs such as Hanoi, Da Nang, Ho Chi Minh City, Phu Quoc, and Nha Trang."},
    {"key": "vov-danang", "url": "https://vov.gov.vn/taiwanese-travel-operators-visit-da-nang-to-connect-and-promote-tourism-dtnew-1125600", "title": "Taiwanese travel operators visit Da Nang to connect and promote tourism", "publisher": "Voice of Vietnam", "sourceType": "government_site", "excerptLang": "en", "reliability": "A", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "VOV.VN - The Da Nang Department of Culture, Sports and Tourism has coordinated with Vietjet Air and Sun Group to host a famtrip delegation from Taiwan (China) from November 2 to 7, enabling them to survey and experience tourism products and services in the city. … The 21-member delegation, representing travel companies from Taiwan, visited key attractions including Sun World Ba Na Hills, the Da Nang Museum, and the Marble Mountains (Ngu Hanh Son), while engaging in resort and hospitality experiences across the city. They also explored accommodation facilities, sampled cuisine at premium hotels and restaurants, and experienced Da Nang’s nightlife. As part of the program, on the evening of November 6, the department held a gala dinner to strengthen connections with the Taiwanese famtrip delegation and expand cooperation with the Taiwanese market in the future. … The Taiwan market is currently the second-largest source of international visitors to Da Nang, accounting for 7.45% of total international arrivals. Regular flights operate from Taipei and Kaohsiung, with 29 weekly flights by EVA Air, Starlux Airlines, China Airlines, and Tiger Taiwan, complemented by two to three weekly charter flights from Taipei and Taichung operated by Vietjet Air and Bamboo Airways."},
    {"key": "tuoitre-danang", "url": "https://news.tuoitre.vn/21-taiwanese-travel-companies-explore-popular-destinations-in-da-nang-103251107160043418.htm", "title": "21 Taiwanese travel companies explore popular destinations in Da Nang", "publisher": "Tuoi Tre News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "A group of 21 travel agencies from Taiwan wrapped up a six-day trip to Da Nang, where they explored the central Vietnamese city’s leading tourism sites and services, according to the municipal Department of Culture, Sports and Tourism. Members of the Taiwanese delegation during their visit to Da Nang City, central Vietnam from November 2 to 7, 2025. Photo: Thy Dinh … Taiwanese visitors made up the second-largest share of international arrivals, representing 7.45 percent of total foreign tourists to the coastal city."},
    {"key": "vov-central", "url": "https://vov.gov.vn/surge-in-taiwanese-visitors-to-vietnam-half-flock-to-central-region-dtnew-864679", "title": "Surge in Taiwanese visitors to Vietnam, half flock to Central Region", "publisher": "Voice of Vietnam", "sourceType": "government_site", "excerptLang": "en", "reliability": "A", "credibility": 3, "credibilityReason": "No other independent source in this sample covers this yet.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "Approximately 45% of these visitors traveled to tourist destinations in the central region such as Hue, Hoi An, and Da Nang. Vu Tien Dung, Head of the Vietnam Economic and Cultural Office in Taipei, said: “The number of Vietnamese tourists choosing Taiwan as their favorite destination is also increasing. We believe that the number of visitors between the two sides this year will exceed the peak of the pre-pandemic period.\""},
    {"key": "vlm-foreign", "url": "https://vietnamlawmagazine.vn/can-foreign-investors-operate-travel-business-in-vietnam-74372.html", "title": "Can foreign investors operate travel business in Vietnam?", "publisher": "Vietnam Law & Legal Forum", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "Furthermore, Article 30 of the Tourism Law stipulates that foreign-invested enterprises are only permitted to provide international travel services for inbound foreign tourists visiting Vietnam—unless otherwise provided by treaties to which Vietnam is a contracting party. Hence if you want to do business in the tourism sector in Vietnam, you must contribute capital with a Vietnamese partner to form a foreign-invested travel firm exclusively targeted at foreign tourists visiting Vietnam. … · Employ licensed tour guides to accompany tourists under travel contracts and bear responsibility for the guides’ activities during the tour; … Under Article 14.2 of Decree 168/2017/ND-CP detailing the Tourism Law, your company is required to place a security deposit of VND 250 million to operate international travel services. … Once the deposit has been made, your company must submit an application dossier to the Vietnam National Authority of Tourism to request issuance of an international tour operator license . The application dossier must include: - An application for an international tour operator license, made according to the form provided by the Minister of Culture, Sports and Tourism;"},
    {"key": "bcp-vnat", "url": "https://en.baochinhphu.vn/tasks-and-organizational-structure-of-vn-national-administration-of-tourism-11132007.htm", "title": "Tasks and organizational structure of VN National Administration of Tourism", "publisher": "Vietnam Government Portal (baochinhphu.vn)", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "Accordingly, the VNAT functions as an advisory body assisting the Minister of Culture, Sports and Tourism in performing the work of state management, organizing the enforcement of laws on tourism on a national scale, and managing public services on tourism in line with the law. … In addition, the VNAT is responsible for organizing tourism promotion activities at home and abroad, whilst coordinating inter-regional and inter-provincial tourism promotion activities, as decentralized by the Minister of Culture, Sports and Tourism. It is also tasked with managing and organizing the grant, re-grant, renewal, and revocation of the business licenses for international travel services, in addition to managing the issuance of tour guide cards in accordance with the law and the assignment and decentralization of the Minister of Culture, Sports and Tourism."},
    {"key": "mekong-rename", "url": "https://mekongtourism.org/vietnam-national-administration-of-tourism-to-be-renamed-as-of-july-2023/", "title": "Vietnam National Administration of Tourism to be renamed as of July 2023", "publisher": "Mekong Tourism Coordinating Office", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "The Vietnam National Authority of Tourism will replace the Vietnam National Administration of Tourism to govern all tourism services and activities in the country as of July 1, 2023. … The Vietnam National Authority of Tourism is an administrative body under the Ministry of Culture, Sports and Tourism. It is tasked with giving advice, assisting the Minister in state management of tourism, enforcing tourism – related legislation, and managing public services on tourism according to the law."},
    {"key": "vnnet-mocst", "url": "https://vietnamnet.vn/en/vietnam-unveils-new-structure-for-culture-and-tourism-ministry-2539709.html", "title": "Vietnam unveils new structure for culture and tourism ministry", "publisher": "VietNamNet", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "The Vietnamese government has issued Decree No. 298/2026, setting out the functions, responsibilities, powers and new organizational structure of the Ministry of Culture, Sports and Tourism. The Ministry of Culture, Sports and Tourism is a government agency responsible for state management nationwide in culture; family affairs; physical training and sports; tourism; journalism; publishing, printing and distribution; electronic information; grassroots information; and external information. It also oversees public services in the sectors and fields under its jurisdiction. Under the new structure, the ministry has 18 administrative bodies assisting the minister in performing state management functions: Department of Personnel and Organization; Department of Planning and Finance; Department of Legal Affairs; Department of Science, Technology, Training and Environment; Department of Ethnic Culture; Ministry Office; Vietnam Sports Administration; Vietnam National Authority of Tourism; Authority of Press; Authority of Culture, Grassroots Information and Family Affairs; Department of Cultural Heritage; Department of Performing Arts; Department of Cinema; Authority of Cultural Industries and Copyright; Department of Fine Arts, Photography and Exhibition; Authority of Publication and Library; Authority of Electronic Information and Digital Transformation; and Department of International Cooperation."},
    {"key": "vnnews-25m", "url": "https://vietnamnews.vn/life-style/1764544/viet-nam-promotes-tourism-brand-to-realise-target-of-25-million-int-l-arrivals-in-2026.html", "title": "Việt Nam promotes tourism brand to realise target of 25 million int’l arrivals in 2026", "publisher": "Viet Nam News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "HÀ NỘI — Việt Nam will step up promotion of its national tourism brand at the ASEAN Tourism Forum (ATF) 2026 and the ASEAN Travel Exchange (TRAVEX), to be held from January 28–30 in Cebu, the Philippines, as part of efforts to attract 25 million international tourist arrivals in 2026. A delegation from the Việt Nam National Authority of Tourism under the Ministry of Culture, Sports and Tourism will attend the events, which are the largest annual tourism activities within the Association of Southeast Asian Nations ASEAN cooperation framework."},
    {"key": "bernama-ite", "url": "https://bernama.com/en/press/news.php?id=2601491", "title": "20 Years of ITE HCMC - Vibrant Connections - Global Destinations", "publisher": "Bernama", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "HO CHI MINH CITY, Vietnam, Sept 1 (Bernama) -- The 20th International Travel Expo Ho Chi Minh City (ITE HCMC 2026) will take place from August 27 to 29, 2026 at the Saigon Exhibition and Convention Center (SECC), Ho Chi Minh City, under the theme \"Vibrant Connections – Global Destinations.\" The event is held under the direction of the Ministry of Culture, Sports and Tourism and the People's Committee of Ho Chi Minh City, co-organized by the Vietnam National Authority of Tourism and the Ho Chi Minh City Department of Tourism, with the Ho Chi Minh City Tourism Promotion Center, C.I.S Vietnam Advertising and Exhibition Joint Stock Company, and other relevant agencies and units directly overseeing implementation."},
    {"key": "tbn-ite", "url": "https://www.thailand-business-news.com/?p=329000", "title": "ITE HCMC 2026 marks its 20th anniversary as Vietnam's leading international travel expo", "publisher": "Thailand Business News (PR Newswire)", "sourceType": "other", "excerptLang": "en", "reliability": "F", "credibility": 3, "credibilityReason": "No other independent source in this sample covers this yet.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "ITE HCMC 2027 – Save the date: The 21st Ho Chi Minh City International Travel Expo will return from September 9 to 11, 2027 at SECC in Ho Chi Minh City, continuing its mission to turn international travel-trade connections into business opportunities. … Founded in 2005, ITE HCMC is Vietnam’s leading annual international travel expo and an influential tourism trade platform in the Mekong subregion. It connects destinations, sellers, buyers, travel professionals and media partners through business matching, market insights and strategic partnerships supporting inbound and outbound tourism. Website: www.itehcmc.travel"},
    {"key": "tuoitre-evisa", "url": "https://news.tuoitre.vn/vietnam-issues-e-visas-to-citizens-from-all-nations-10374975.htm", "title": "Vietnam issues e-visas to citizens from all nations", "publisher": "Tuoi Tre News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "The Vietnamese government on Monday issued a resolution to grant e-visas to citizens from all countries and territories. … In June, Vietnam’s lawmaking National Assembly passed a number of amendments to the Law on Entry, Exit, Transit and Residence of Foreigners, allowing extending the validity of e-visas granted to foreigners entering the country to 90 days from no more than 30 days for single entry or multiple entries."},
    {"key": "vnnews-vietjet", "url": "https://vietnamnews.vn/economy/1802886/vietjet-expands-its-international-network.html", "title": "Vietjet expands its international network", "publisher": "Viet Nam News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "TAINAN — Vietjet has launched its direct Hà Nội-Tainan route, further expanding air connectivity between Việt Nam and Taiwan (China), the airline has announced. … The new route operates four round-trip flights per week, providing convenient connections between the two cities. Through Vietjet’s continuously expanding network, passengers from Tainan can also conveniently connect to destinations across Việt Nam, Southeast Asia, South Asia, Central Asia, Australia and Europe. … \"We hope the Hà Nội-Tainan (Taiwan, China) route will become a lasting bridge, helping promote tourism, economic exchange and stronger community ties,” Sơn said. Since launching its first flight to Taiwan (China) in 2014, Vietjet has carried five million passengers on more than 38,000 flights between Taiwan (China) and Việt Nam. Today, the airline connects Taipei, Taichung, Tainan and Kaohsiung with Hà Nội, HCM City and Phú Quốc, through a total of eight direct routes."},
    {"key": "vnnews-vna", "url": "https://vietnamnews.vn/economy/1785084/vietnam-airlines-expands-northeast-asia-network-as-travel-demand-rises.html", "title": "Vietnam Airlines expands Northeast Asia network as travel demand rises", "publisher": "Viet Nam News", "sourceType": "news", "excerptLang": "en", "reliability": "B", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "HÀ NỘI — Growing demand for tourism, business travel and family visits between Việt Nam and Northeast Asia has prompted Vietnam Airlines to expand services on key routes to Japan, South Korea and Taiwan (China). … From Hà Nội, Vietnam Airlines has increased flights to Taipei from seven to 11 services per week. The Hà Nội–Osaka route will also see additional frequencies, rising from seven to 11 weekly flights between October 26 and November 30, before increasing to 14 flights a week – equivalent to two daily services – from December 1."},
    {"key": "vietravel-award", "url": "https://vietravel.com/en/vietravel-diary/vietravel-honored-with-taiwan-tourism-contribution-awards-2021-v13580.aspx", "title": "Vietravel honored with Taiwan Tourism Contribution Awards 2021", "publisher": "Vietravel", "sourceType": "company_site", "excerptLang": "en", "reliability": "C", "credibility": 3, "credibilityReason": "No other independent source in this sample covers this yet.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "On April 14, 2021, at the head office, Vietravel was honored to receive the Taiwan Tourism Contribution Awards 2021. The award was conferred by the Taiwan National Administration of Tourism for Vietravel’s important contributions in promoting and developing Taiwan tourism. Vietravel was the only company in Vietnam to be honored with this award. … In recent years, Taiwan has become a favorite destination for Vietnamese tourists. Statistics show that the number of tourists traveling between Vietnam and Taiwan has constantly increased over the years. The Taiwanese market is always a key destination that Vietravel is interested in investing in and exploiting. This includes inbound and outbound tourists between the countries."},
    {"key": "taiwannews-hcmc", "url": "https://www.taiwannews.com.tw/zh/news/3661260", "title": "越南胡志明觀光辦事處成立 未來新住民辦證更方便", "publisher": "Taiwan News", "sourceType": "news", "excerptLang": "zh-TW", "reliability": "B", "credibility": 3, "credibilityReason": "No other independent source in this sample covers this yet.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "（台灣英文新聞/ 文化組 綜合報導）配合政府新南向政策，交通部觀光局經過1年多的籌備，3月15日在越南胡志明市正式成立交通部觀光局駐胡志明市辦事處，該辦事處未來將負責越南、寮國及柬埔寨等地區觀光市場。"},
    {"key": "moj-k0110002", "url": "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=K0110002", "title": "旅行業管理規則", "publisher": "Laws & Regulations Database (MOJ)", "sourceType": "government_gazette", "excerptLang": "zh-TW", "reliability": "A", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "甲種旅行業經營下列業務： 一、接受委託代售國內外海、陸、空運輸事業之客票或代旅客購買國內外客票、託運行李。 二、接受旅客委託代辦出、入國境及簽證手續。 三、招攬或接待國內外旅客並安排旅遊、食宿及交通。 四、自行組團安排旅客國內外觀光旅遊、食宿、交通及提供有關服務。 … 綜合旅行業、甲種旅行業在國外、香港、澳門或大陸地區設立分支機構或與國外、香港、澳門或大陸地區旅行業合作於國外、香港、澳門或大陸地區經營旅行業務時，除依有關法令規定外，應報請交通部觀光署備查。"},
    {"key": "ctee-itf", "url": "https://www.ctee.com.tw/news/20261027700903-430503", "title": "ITF台灣國際旅展開展倒數！熱門飯店產品、療癒旅行與多國展演一次看 - 產業 - 工商時報", "publisher": "Commercial Times", "sourceType": "other", "excerptLang": "zh-TW", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "「2026 ITF台灣國際旅展」將於11月6日至9日在台北南港展覽館一館登場，集結123個國家及城市、1,600個攤位。"},
    {"key": "yam-itf", "url": "https://travel.yam.com/article/141251", "title": "2026 ITF台灣國際旅展11月6日南港登場：早鳥票150元、展區與時間整理-輕旅行", "publisher": "yam 輕旅行", "sourceType": "other", "excerptLang": "zh-TW", "reliability": "F", "credibility": 2, "credibilityReason": "Other independent sources in this sample also cover this topic.", "verifiedAt": "2026-11-03", "accepted": true, "rejectReason": null, "excerpt": "2026 ITF台灣國際旅展將於11月6日至9日在台北南港展覽館一館舉辦，共有123個國家與城市、1,600個攤位。10月13日至14日開賣75折早鳥票，原價200元的門票降至150元；今年日本館擴增至252攤，也有12家航空公司與國內飯店、地方旅遊單位參展。"},
  ];
}
