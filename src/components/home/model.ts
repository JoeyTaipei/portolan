// What the home screen (01 Markets) shows for the selected dossier. Server-side, explicit `now`.
// Scores come only from src/lib/scoring; judgments and alerts are shown only with accepted sources.
import { zhMap, type ZhMap } from "@/lib/i18n/dossier";
import { buildMapModel, byInfluence, type Mark } from "@/components/map/model";
import { dataConfidenceExplanation, refsFor, sourceRef, type Explanation, type SourceRef } from "@/components/score/explain";
import { buildVerdict, type VerdictVM } from "@/components/score/verdict";
import { marketInfo } from "@/lib/markets";
import { briefMetrics, taipeiDay } from "@/lib/scoring";
import type { DataConfidenceResult, DossierStatus, IcdTerm, Confidence, Dossier } from "@/lib/types";

export interface PlacedStakeholder {
  id: string;
  short: string;
  mark: Mark;
  lat: number;
  lng: number;
  city: string | null;
}

export interface HomeModel {
  id: string;
  isSample: boolean;
  name: string;
  country: string;
  market: Dossier["market"];
  status: DossierStatus;
  verified: boolean;
  refreshedAt: string | null;
  counts: { stakeholders: number; sources: number; alerts: number };
  confidence: DataConfidenceResult;
  confidenceX: Explanation;
  /** HOME-3: the entry verdict (scoring §8) beside the bottom line. */
  verdict: VerdictVM;
  judgments: { text: string; icd: IcdTerm; confidence: Confidence; sources: SourceRef[] }[];
  alert: { title: string; days: number; date: string; sources: SourceRef[]; url: string | null } | null;
  /** HOME-9: contact-first three, then by influence; events skipped. */
  moves: { id: string; name: string; nameZh: string | null; step: string; verified: boolean; sources: SourceRef[] }[];
  /** I18N-9: checked 繁中 for this dossier's sentences and names. */
  zh: ZhMap;
  placed: PlacedStakeholder[];
  mapShown: number;
  nav: { mapTotal: number; nextSteps: number; leads: number; documents: number; briefVersion: number | null };
}


export function buildHomeModel(d: Dossier, now: Date): HomeModel {
  const accepted = d.sources.filter((s) => s.accepted);
  const byId = new Map(accepted.map((s) => [s.id, sourceRef(s)]));
  const metrics = briefMetrics(d, now);
  const map = buildMapModel(d, now);
  const today = taipeiDay(now);
  const sourced = (ids: string[]) => refsFor(ids, byId);

  // Simpler version of HOME-3 alerts: future timed events that have a source.
  const future = d.events.filter((e) => e.date !== null && e.date.slice(0, 10) >= today && sourced(e.sourceIds).length > 0);

  // HOME-6: the next sourced goal-related deadline within 30 days.
  const w = metrics.window;
  let alert: HomeModel["alert"] = null;
  if (w.found && w.days <= 30) {
    const ev = d.events.find((e) => e.id === w.eventId);
    const refs = ev ? sourced(ev.sourceIds) : [];
    const first = refs[0] ? accepted.find((s) => s.id === refs[0].id) : undefined;
    if (refs.length > 0) alert = { title: w.title, days: w.days, date: w.date, sources: refs, url: first?.url ?? null };
  }

  const brief = d.briefs.at(-1) ?? null;
  const judgments = (brief?.judgments ?? [])
    .map((j) => ({ text: j.text, icd: j.icd, confidence: j.confidence, sources: sourced(j.sourceIds) }))
    .filter((j) => j.sources.length > 0)
    .slice(0, 3);

  const placed = map.nodes
    .filter((n) => n.lat !== null && n.lng !== null)
    .map((n) => ({ id: n.id, short: n.short, mark: n.mark, lat: n.lat!, lng: n.lng!, city: n.city }));

  const people = map.nodes.filter((n) => n.category !== "evt");
  const first = map.contactFirst.map((id) => people.find((n) => n.id === id)).filter((n) => n !== undefined);
  const rest = people.filter((n) => !map.contactFirst.includes(n.id)).sort(byInfluence);
  const moves = [...first, ...rest].slice(0, 5).map((n) => ({
    id: n.id,
    name: n.name,
    nameZh: n.nameZh,
    step: n.action.text,
    verified: n.action.verified,
    sources: n.action.sources,
  }));

  return {
    id: d.id,
    isSample: d.isSample,
    name: d.name,
    zh: zhMap(d, brief),
    country: marketInfo(d.market).country,
    market: d.market,
    status: d.status,
    verified: d.status === "ready" && metrics.dataConfidence.level !== "Low",
    refreshedAt: d.refreshedAt,
    counts: {
      stakeholders: d.stakeholders.filter((s) => s.category !== "evt").length,
      sources: accepted.length,
      alerts: future.length,
    },
    confidence: metrics.dataConfidence,
    confidenceX: dataConfidenceExplanation(metrics.dataConfidence),
    verdict: buildVerdict(d, now, map.contactFirst.length),
    judgments,
    alert,
    moves,
    placed,
    mapShown: Math.min(map.nodes.length, 30),
    nav: {
      mapTotal: map.nodes.length,
      nextSteps: d.tracker.filter((t) => t.nextStep).length,
      leads: d.leads.length,
      documents: d.documents.length,
      briefVersion: brief?.version ?? null,
    },
  };
}
