// View model for 04 Network (spec §12). Built on the server from the dossier; the browser only
// gets what the cards show. No score is computed here: investor and lawyer matches are the
// sourced checks research stored (spec §16 Q4, simpler version: "3 of 4 checks", no level word).
import type { SourceRef } from "@/components/score/explain";
import { citations, type Citations } from "@/lib/citation";
import { buildPartners, PARTNER_NOTE, partnerNote, type PartnerVM } from "@/components/partners/model";
import type { Dossier, IntroRequest, Lead, LeadType, TrackerItem } from "@/lib/types";

export type NetworkTab = "partners" | "investors" | "lawyers" | "events";

/** NET-1 + NET-7: Partners is first and the default; its cards are not leads (type null). */
export const TABS: { key: NetworkTab; label: string; type: LeadType | null }[] = [
  { key: "partners", label: "Partners", type: null },
  { key: "investors", label: "Investors", type: "investor" },
  { key: "lawyers", label: "Lawyers", type: "lawyer" },
  { key: "events", label: "Events", type: "event" },
];

/** NET-2: one note per tab. */
export const TAB_NOTE: Record<NetworkTab, string> = {
  partners: PARTNER_NOTE,
  investors: "Portolan shows contact routes only. It does not broker investments or take success fees.",
  lawyers: "Matches are for introductions only. Portolan does not give legal advice.",
  events: "Ranked by how many of your mapped stakeholders are expected to attend.",
};

/** MKT-1: the tab note for a market (only Partners changes). */
export const tabNote = (tab: NetworkTab, market: Dossier["market"]): string => (tab === "partners" ? partnerNote(market) : TAB_NOTE[tab]);

/** NET-6: one line of purpose. */
export const PURPOSE_MAX = 300;

export function parseTab(v: string | string[] | undefined): NetworkTab {
  return v === "investors" || v === "lawyers" || v === "events" ? v : "partners";
}

export interface CheckVM {
  label: string;
  passed: boolean;
  refs: SourceRef[];
}

export interface LeadVM {
  id: string;
  type: LeadType;
  name: string;
  kind: string;
  /** Investors and lawyers: "3 of 4 checks". Events: "2 mapped stakeholders". */
  match: string;
  checks: CheckVM[];
  meta: string | null;
  why: { text: string; refs: SourceRef[] } | null;
  route: string | null;
  eventDate: string | null;
  refs: SourceRef[];
  /** No accepted source → shown as Unverified (product rule). */
  unverified: boolean;
  stakeholderId: string | null;
  /** NET-5: null when it can be shown on the map, else the reason it can't. */
  mapBlocked: string | null;
}

export interface NetworkVM {
  dossierId: string;
  isSample: boolean;
  name: string;
  market: Dossier["market"];
  leads: LeadVM[];
  /** NET-7: partner candidates, built by code from the map's Industry stakeholders. */
  partners: PartnerVM[];
  tracker: TrackerItem[];
  intros: IntroRequest[];
}

function leadVM(l: Lead, d: Dossier, cite: Citations): LeadVM {
  const refs = cite.anyOf(l.sourceIds);
  const checks: CheckVM[] =
    l.match.type === "checks" ? l.match.checks.map((c) => ({ label: c.label, passed: c.passed && cite.anyOf(c.sourceIds).length > 0, refs: cite.anyOf(c.sourceIds) })) : [];
  // Only sourced expected attendees who are on this map count (spec §12, NET-3).
  const attendees = l.match.type === "attendees" ? l.match.stakeholderIds.filter((id) => d.stakeholders.some((s) => s.id === id)).length : 0;
  const passed = checks.filter((c) => c.passed).length;
  const match =
    l.type === "event"
      ? attendees === 0
        ? "No mapped stakeholders confirmed yet"
        : `${attendees} mapped stakeholder${attendees === 1 ? "" : "s"}`
      : `${passed} of ${checks.length} checks`;
  const s = l.stakeholderId ? d.stakeholders.find((x) => x.id === l.stakeholderId) : undefined;
  const mapBlocked = !l.stakeholderId || !s ? "Not on this market's map yet" : s.x === null || s.y === null ? "On the list, but it has no map position yet" : null;
  return {
    id: l.id,
    type: l.type,
    name: l.name,
    kind: l.kind,
    match,
    checks,
    meta: l.meta,
    why: l.why ? { text: l.why.text, refs: cite.anyOf(l.why.sourceIds) } : null,
    route: l.route,
    eventDate: l.eventDate,
    refs,
    unverified: l.verification !== "sourced" || refs.length === 0,
    stakeholderId: l.stakeholderId,
    mapBlocked,
  };
}

/** Events: most mapped attendees first, then soonest. Others keep research order. */
function order(a: LeadVM, b: LeadVM, d: Dossier): number {
  if (a.type !== "event" || b.type !== "event") return 0;
  const count = (x: LeadVM) => {
    const l = d.leads.find((y) => y.id === x.id);
    return l?.match.type === "attendees" ? l.match.stakeholderIds.length : 0;
  };
  return count(b) - count(a) || (a.eventDate ?? "9999").localeCompare(b.eventDate ?? "9999");
}

export function buildNetworkModel(d: Dossier, now: Date): NetworkVM {
  const cite = citations(d);
  const leads = d.leads.map((l) => leadVM(l, d, cite)).sort((a, b) => order(a, b, d));
  return { dossierId: d.id, isSample: d.isSample, name: d.name, market: d.market, leads, partners: buildPartners(d, now), tracker: d.tracker, intros: d.intros };
}

/** "23 Sep 2027" from "2027-09-23" (calendar date, no time-zone shift). */
export function fmtDay(date: string | null): string | null {
  if (!date) return null;
  const [y, m, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const INTRO_LABEL: Record<IntroRequest["status"], string> = {
  received: "Intro requested",
  in_progress: "Intro in progress",
  introduced: "Introduced",
  not_possible: "Intro not possible",
};
