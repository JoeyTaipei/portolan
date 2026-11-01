// View model for 07 Documents and 08 Briefing note (spec §11.3, §12). Labels follow §11.3:
// approved by an expert → Expert approved; by the founder → "Reviewed by <name>" (never
// "expert"); in review → expected finish; AI drafts say they are not reviewed.
import { sourceRef, type SourceRef } from "@/components/score/explain";
import type { Dossier, DocumentStatus, DocumentType, PortolanDocument, TrackerItem } from "@/lib/types";

export const TYPE_INFO: Record<DocumentType, { label: string; pages: string; desc: string }> = {
  briefing_note: { label: "Briefing note", pages: "3 pages", desc: "For one meeting" },
  risk_deck: { label: "Risk deck", pages: "4 pages", desc: "For leadership" },
  watch_list: { label: "Watch-list update", pages: "1–2 pages", desc: "Monthly" },
};

export const NOT_REVIEWED = "AI draft · not reviewed — check names and dates before sharing";

export type Tone = "draft" | "review" | "approved" | "progress" | "failed" | "ready";

export interface StatusLabel {
  text: string;
  tone: Tone;
}

/** "8 Nov 2026" from "2026-11-08" (calendar date, no time-zone shift). */
export function fmtDay(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function statusLabel(doc: Pick<PortolanDocument, "status" | "type" | "reviewerKind" | "reviewerName" | "nextUpdateAt">): StatusLabel {
  const s: DocumentStatus = doc.status;
  switch (s) {
    case "approved":
      return doc.reviewerKind === "expert" ? { text: "Expert approved", tone: "approved" } : { text: `Reviewed by ${doc.reviewerName ?? "your team"}`, tone: "approved" };
    case "in_review":
      return { text: "In expert review", tone: "review" };
    case "changes_needed":
      return { text: "In expert review · changes requested", tone: "review" };
    case "draft_ready":
      return { text: "AI draft · not reviewed", tone: "draft" };
    case "drafting":
      return { text: "Drafting", tone: "progress" };
    case "requested":
      return { text: "Request received", tone: "progress" };
    case "in_progress":
      return { text: "Team working on it", tone: "progress" };
    case "failed":
      return { text: "Draft failed", tone: "failed" };
    case "ready":
      return doc.type === "watch_list" && doc.nextUpdateAt ? { text: `Next: ${fmtDay(doc.nextUpdateAt)}`, tone: "ready" } : { text: "Ready", tone: "ready" };
  }
}

export interface DocVM {
  id: string;
  type: DocumentType;
  title: string;
  pages: number | null;
  status: DocumentStatus;
  label: StatusLabel;
  /** One line under the title: reviewer and facts-checked date, or what happens next. */
  detail: string;
  trackerItemId: string | null;
  hasContent: boolean;
  hasFile: boolean;
}

export interface MeetingOption {
  id: string;
  name: string;
}

export interface WatchItem {
  id: string;
  title: string;
  date: string | null;
  refs: SourceRef[];
}

/** Just enough to name a tracker item in the browser. */
export interface Targets {
  stakeholders: { id: string; name: string; short: string | null }[];
  leads: { id: string; name: string; stakeholderId: string | null }[];
}

export interface DocsVM {
  dossierId: string;
  isSample: boolean;
  name: string;
  etaText: string;
  hasBrief: boolean;
  /** Raw rows: the sample lays this browser's changes over them before building cards. */
  documents: PortolanDocument[];
  documentRequests: Dossier["documentRequests"];
  tracker: TrackerItem[];
  targets: Targets;
  watch: WatchItem[];
  nextUpdate: string | null;
}

export function docDetail(doc: PortolanDocument, etaText: string): string {
  const checked = fmtDay(doc.factsCheckedAt);
  switch (doc.status) {
    case "approved":
      return [doc.reviewerName && `Reviewed by ${doc.reviewerName}`, checked && `facts checked ${checked}`].filter(Boolean).join(" · ");
    case "in_review":
      return `AI draft done · expected finish ${etaText}`;
    case "changes_needed":
      return `The reviewer asked for changes · expected finish ${etaText}`;
    case "draft_ready":
      return checked ? `${NOT_REVIEWED} · facts checked ${checked}` : NOT_REVIEWED;
    case "drafting":
      return "AI draft in about 10 minutes";
    case "requested":
      return "The Portolan team starts it and uploads the PDF here";
    case "in_progress":
      return "The Portolan team is preparing it; the PDF appears here when ready";
    case "failed":
      return "Your request is safe. Try again, or ask us by email.";
    case "ready":
      return checked ? `Facts checked ${checked}` : "Uploaded by the Portolan team";
  }
}

export function docVM(doc: PortolanDocument, requests: Dossier["documentRequests"], etaText: string): DocVM {
  return {
    id: doc.id,
    type: doc.type,
    title: doc.title,
    pages: doc.pages,
    status: doc.status,
    label: statusLabel(doc),
    detail: docDetail(doc, etaText),
    trackerItemId: requests.find((r) => r.id === doc.requestId)?.trackerItemId ?? null,
    hasContent: doc.content !== null,
    hasFile: doc.storagePath !== null,
  };
}

function itemName(d: Targets, t: TrackerItem): string {
  if (t.stakeholderId) {
    const s = d.stakeholders.find((x) => x.id === t.stakeholderId);
    if (s) return s.short ?? s.name;
  }
  return d.leads.find((l) => l.id === t.leadId)?.name ?? "Tracked item";
}

/** DOC-4: tracker items that a briefing note can be about (a mapped stakeholder behind them). */
export function meetingOptions(d: Targets, tracker: TrackerItem[]): MeetingOption[] {
  return tracker
    .filter((t) => t.stakeholderId || d.leads.find((l) => l.id === t.leadId)?.stakeholderId)
    .map((t) => ({ id: t.id, name: itemName(d, t) }));
}

/** DOC-13: future events research found, next 180 days first; undated ones say so. */
export function watchItems(d: Dossier, now: Date): WatchItem[] {
  const byId = new Map(d.sources.filter((s) => s.accepted).map((s) => [s.id, sourceRef(s)]));
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now.getTime() + 180 * 86_400_000).toISOString().slice(0, 10);
  return d.events
    .filter((e) => e.status === "sourced" && (e.date === null || (e.date >= today && e.date <= horizon)))
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
    .map((e) => ({ id: e.id, title: e.title, date: e.date, refs: e.sourceIds.flatMap((x) => byId.get(x) ?? []) }));
}

export function buildDocsModel(d: Dossier, etaText: string, now: Date): DocsVM {
  const latestWatch = d.documents.filter((x) => x.type === "watch_list" && x.nextUpdateAt).at(-1);
  return {
    dossierId: d.id,
    isSample: d.isSample,
    name: d.name,
    etaText,
    hasBrief: d.briefs.length > 0,
    documents: d.documents,
    documentRequests: d.documentRequests,
    tracker: d.tracker,
    targets: {
      stakeholders: d.stakeholders.map((x) => ({ id: x.id, name: x.name, short: x.short })),
      leads: d.leads.map((x) => ({ id: x.id, name: x.name, stakeholderId: x.stakeholderId })),
    },
    watch: watchItems(d, now),
    nextUpdate: latestWatch?.nextUpdateAt ?? null,
  };
}
