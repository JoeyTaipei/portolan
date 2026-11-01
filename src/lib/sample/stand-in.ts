// DEV STAND-IN (plan P-15). Maps the design mockup (src/fixtures/taiwan-uas.ts) into the real
// Dossier shape so S1/S2 screens can be built before S0b's curated, sourced sample lands.
// Never the shipped sample: S0b replaces it in reader.ts.
//
// The mockup has no sources, so every fact, edge, event and lead here is Unverified and
// nothing scores (influence shows Unverified, support shows Unknown). Placeholders are
// stripped: [DATE] fields, "5.1 GHz", the fictional funds (Kestrel, Harbor Lane) and their
// edges, leads, ties and tracker rows.
import {
  PORTOLAN_EDGES,
  PORTOLAN_LEADS,
  PORTOLAN_NODES,
  PORTOLAN_TEAM,
  PORTOLAN_TIES,
  PORTOLAN_TRACK,
} from "@/fixtures/taiwan-uas";
import { SAMPLE_DOSSIER_ID, SAMPLE_SHARE_ID } from "@/lib/ids";
import type {
  Category,
  Contact,
  Dossier,
  Edge,
  Fact,
  Lead,
  Stakeholder,
  TeamMember,
  Tie,
  TimedEvent,
  TrackerItem,
  TrackerStage,
} from "@/lib/types";

const D = SAMPLE_DOSSIER_ID;
const AT = "2026-10-30T00:00:00Z";
const DROPPED = new Set(["c1", "c2"]); // fictional funds
const NO_ROUTE = "Find a sourced contact route first";

const clean = (s: string) => s.replace(/\s*\[[A-Z _-]+\]/g, "").trim();
const placeholderFree = (s: string) => !/\[[A-Z _-]+\]|5\.1 ?GHz/.test(s);

const nodes = PORTOLAN_NODES.filter((n) => !DROPPED.has(n.id));

const stakeholders: Stakeholder[] = nodes.map((n) => ({
  id: n.id,
  dossierId: D,
  name: clean(n.name),
  nameZh: null,
  short: n.short,
  category: n.cat as Category,
  isChina: false,
  isPerson: false,
  role: clean(n.role),
  city: null,
  lat: null,
  lng: null,
  x: n.x,
  y: n.y,
  z: n.z,
  status: "active",
  firstRunId: null,
  lastRunId: null,
  createdAt: AT,
}));

const facts: Fact[] = nodes.flatMap((n): Fact[] => {
  const unverified = (field: Fact["field"], value: string): Fact => ({
    id: `${n.id}-${field}`,
    stakeholderId: n.id,
    runId: null,
    field,
    value,
    rating: null,
    quote: null,
    sourceIds: [],
    status: "unverified",
    model: null,
    createdAt: AT,
  });
  return [
    unverified("role", clean(n.role)),
    unverified("action", placeholderFree(n.action) ? n.action : NO_ROUTE),
  ];
});

const edges: Edge[] = PORTOLAN_EDGES.filter(([a, b]) => !DROPPED.has(a) && !DROPPED.has(b)).map(([a, b]) => ({
  id: `${a}-${b}`,
  dossierId: D,
  aId: a,
  bId: b,
  relation: "linked",
  sourceIds: [],
  status: "unverified",
  createdAt: AT,
}));

const events: TimedEvent[] = nodes
  .filter((n) => n.cat === "evt")
  .map((n) => ({
    id: `ev-${n.id}`,
    dossierId: D,
    title: clean(n.name),
    kind: "event",
    date: null, // date unverified
    stakeholderIds: [n.id],
    sourceIds: [],
    status: "unverified",
    relevantToGoal: true,
    createdAt: AT,
  }));

const leadGroups = [
  ["investor", PORTOLAN_LEADS.inv.items],
  ["lawyer", PORTOLAN_LEADS.law.items],
  ["event", PORTOLAN_LEADS.evt.items],
] as const;

const leads: Lead[] = leadGroups.flatMap(([type, items]) =>
  items
    .filter((it) => !DROPPED.has(it.id))
    .map(
      (it): Lead => ({
        id: `lead-${it.id}`,
        dossierId: D,
        type,
        stakeholderId: it.id,
        name: clean(it.name),
        kind: it.kind.charAt(0) + it.kind.slice(1).toLowerCase(),
        match: type === "event" ? { type: "attendees", stakeholderIds: [] } : { type: "checks", checks: [], level: "Low" },
        meta: placeholderFree(it.meta) ? it.meta : clean(it.meta.replace(/\s*·\s*\[[A-Z _-]+\]/g, "")),
        why: { text: it.why, sourceIds: [] },
        route: it.route,
        eventDate: null,
        sourceIds: [],
        verification: "unverified",
        status: "new",
        createdAt: AT,
      }),
    ),
);

// Team (plan P-2): first names only, illustrative, contact names withheld.
const team: TeamMember[] = PORTOLAN_TEAM.map((m) => ({
  id: m.id,
  dossierId: D,
  name: m.name.split(" ")[0],
  role: m.role,
  status: m.status === "CONNECTED" ? "connected" : "invited",
  consentedAt: m.status === "CONNECTED" ? AT : null,
  withdrawnAt: null,
  illustrative: true,
  createdAt: AT,
}));

const keptTies = PORTOLAN_TIES.filter((t) => !DROPPED.has(t.org));
const orgName = (id: string) => stakeholders.find((s) => s.id === id)?.name ?? id;

const contacts: Contact[] = keptTies.map((t, i) => ({
  id: `ct-${i + 1}`,
  memberId: t.m,
  name: null,
  title: t.contact.replace(/^\[Name\],\s*/, ""),
  orgText: orgName(t.org),
  linkedinUrl: null,
  origin: "manual",
  illustrative: true,
  createdAt: AT,
}));

const ties: Tie[] = keptTies.map((t, i) => ({
  id: `tie-${i + 1}`,
  contactId: `ct-${i + 1}`,
  stakeholderId: t.org,
  strength: t.s,
  how: t.how,
  match: "exact",
  illustrative: true,
  createdAt: AT,
}));

const TRACK_TO_STAKEHOLDER: Record<string, string> = {
  alliance: "i1",
  mnd: "g1",
  prime: "i2",
  counsel: "l1",
  ncc: "g5",
  ncsist: "g2",
  tadte: "e1",
};

const tracker: TrackerItem[] = PORTOLAN_TRACK.filter((t) => t.id in TRACK_TO_STAKEHOLDER).map((t) => ({
  id: `trk-${t.id}`,
  dossierId: D,
  stakeholderId: TRACK_TO_STAKEHOLDER[t.id],
  leadId: null,
  stage: t.stage as TrackerStage,
  nextStep: placeholderFree(t.next) ? t.next : "Propose a joint field test",
  dueDate: null, // mockup dates are unverified
  meetingAt: null,
  origin: "map",
  createdAt: AT,
}));

export const standInDossier: Dossier = {
  id: D,
  shareId: SAMPLE_SHARE_ID,
  isSample: true,
  name: "Taiwan UAS Defense Grid",
  company: "Skyward Robotics (fictional)",
  product: "Counter-UAS sensor kit",
  market: "TW",
  goal: "First government pilot within 12 months",
  certifications: null,
  priceRange: null,
  twPartners: null,
  clientDeadline: null,
  status: "ready",
  marketChecks: { money: null, licence: null },
  refreshedAt: AT,
  currentRunId: null,
  createdAt: AT,
  run: null,
  sources: [],
  stakeholders,
  facts,
  statements: [],
  edges,
  events,
  briefs: [],
  leads,
  tracker,
  debriefs: [],
  documentRequests: [],
  documents: [],
  intros: [],
  team,
  contacts,
  ties,
  introDrafts: [],
  aliases: [],
};
