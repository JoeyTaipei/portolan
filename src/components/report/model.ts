// What the one-page A4 report (05) shows, for /d/[id]/report and /s/[shareId]. Server-side,
// explicit `now`. Fixed caps keep it on one page (plan S2 simpler version of REP-12): top 5
// stakeholders, 2 risks, 3 meeting places, 2 sources per table row, and the source list = the
// sources in the table. Only data that is safe to share is in here: no tracker, debriefs,
// team ties or documents (spec §9).
import { buildBriefModel, fmtDay, type BriefVM, type Cited, type MetricVM } from "@/components/brief/model";
import { buildMapModel, byInfluence, MAP_LIMIT, NO_ROUTE, type Mark } from "@/components/map/model";
import { influenceText, sourceRef, type SourceRef } from "@/components/score/explain";
import { isEligible, sourcesFor } from "@/lib/scoring";
import type { Brief, Category, Dossier, IcdTerm, Confidence } from "@/lib/types";

export const TOP_N = 5;
export const RISKS_N = 2;
/** REP-9: entry requirements shown on the A4 (option B, replaces Key risks). */
export const REQUIREMENTS_N = 4;
/** REP-12: past this many characters the last requirement is dropped so the page still fits. */
export const REQUIREMENTS_CHARS = 380;
export const MEET_N = 3;
export const ROW_SOURCES_N = 2;

export interface ExhibitNode {
  id: string;
  short: string;
  category: Category;
  mark: Mark;
  influence: number | null;
  x: number;
  y: number;
  z: number;
}

export interface ReportVM {
  isSample: boolean;
  name: string;
  /** "Prepared for …" pieces; null hides the whole line (never a placeholder). */
  preparedFor: { company: string; product: string; date: string } | null;
  confidence: MetricVM;
  stakeholderCount: number;
  summary: Cited[];
  judgment: { text: string; icd: IcdTerm; confidence: Confidence; refs: SourceRef[] } | null;
  metrics: MetricVM[];
  exhibit: { nodes: ExhibitNode[]; edges: { a: string; b: string }[]; route: string[]; sourceCount: number };
  top: { id: string; name: string; mark: Mark; first: number | null; influence: string; next: string; nextVerified: boolean; refs: SourceRef[] }[];
  path: BriefVM["path"];
  plan: { days: string; text: string; refs: SourceRef[] }[];
  meet: { title: string; date: string; mapped: number }[];
  risks: Cited[];
  /** REP-9: up to 4 sourced entry requirements; when empty, Key risks shows instead. */
  requirements: BriefVM["requirements"];
  exportCheck: boolean;
  /** The numbered list at the foot: the sources cited in the table. */
  sources: SourceRef[];
  /** Every source the report cites; /s/[shareId]/sources lists exactly these. */
  citedIds: string[];
}

export function buildReportModel(d: Dossier, brief: Brief, now: Date): ReportVM {
  const b = buildBriefModel(d, brief, now);
  const map = buildMapModel(d, now);
  const eligible = new Set(d.stakeholders.filter(isEligible).map((s) => s.id));

  // REP-6: the five scored stakeholders with the highest influence.
  const top = map.nodes
    .filter((n) => eligible.has(n.id) && n.influence !== null)
    .sort(byInfluence)
    .slice(0, TOP_N)
    .map((n) => {
      const idx = map.contactFirst.indexOf(n.id);
      return {
        id: n.id,
        name: n.short,
        mark: n.mark,
        first: idx >= 0 ? idx + 1 : null,
        influence: influenceText(n.influence),
        next: n.action.verified ? n.action.text : NO_ROUTE,
        nextVerified: n.action.verified,
        // The next move's sources first, then the stakeholder's other sources, best grade first.
        refs: dedupe([
          ...n.action.sources,
          ...sourcesFor(n.id, d.facts, d.statements, d.sources).map(sourceRef).sort(
            (x, y) => x.reliability.localeCompare(y.reliability) || x.credibility - y.credibility,
          ),
        ]).slice(0, ROW_SOURCES_N),
      };
    });

  // REP-5: the drawn map, as on screen (top 30 by influence + the contact-first three).
  const keep = new Set([...map.nodes].sort(byInfluence).slice(0, MAP_LIMIT).map((n) => n.id));
  map.contactFirst.forEach((id) => keep.add(id));
  const nodes = map.nodes
    .filter((n) => keep.has(n.id))
    .map((n) => ({ id: n.id, short: n.short, category: n.category, mark: n.mark, influence: n.influence?.score ?? null, x: n.x, y: n.y, z: n.z }));

  const eventOf = new Map(d.events.map((e) => [e.id, e]));
  const attendee = new Set(d.stakeholders.filter((s) => s.category !== "evt").map((s) => s.id));
  const meet = b.meet.slice(0, MEET_N).map((m) => ({
    title: m.title,
    date: m.date,
    // Sourced attendees only: the event's own node (category evt) is not a stakeholder there.
    mapped: Math.max(m.mapped, (eventOf.get(m.eventId)?.stakeholderIds ?? []).filter((id) => attendee.has(id)).length),
  }));

  // REP-7: one line per 7-day box, its first sourced action (or the box's empty note).
  const plan = b.plan.map((box) => {
    const a = box.actions[0];
    return a ? { days: box.days, text: `${a.text} (${a.who})`, refs: a.refs } : { days: box.days, text: box.empty, refs: [] };
  });

  // REP-9 (option B): entry requirements take the Key risks spot; older briefs keep the risks.
  const requirements = b.requirements.slice(0, REQUIREMENTS_N);
  while (requirements.length > 1 && requirements.reduce((n, x) => n + x.label.length + x.text.length, 0) > REQUIREMENTS_CHARS) requirements.pop();
  const risks = requirements.length > 0 ? [] : b.risks.slice(0, RISKS_N);
  const summary = b.summary;
  const judgment = b.judgments[0] ?? null;
  const sources = dedupe(top.flatMap((t) => t.refs));
  const citedIds = dedupe([
    ...summary.flatMap((s) => s.refs),
    ...(judgment?.refs ?? []),
    ...sources,
    ...b.path.flatMap((p) => p.why.refs),
    ...plan.flatMap((p) => p.refs),
    ...risks.flatMap((r) => r.refs),
    ...requirements.flatMap((r) => r.refs),
  ]).map((r) => r.id);

  const confidence = b.metrics.find((m) => m.key === "confidence")!;
  return {
    isSample: d.isSample,
    name: d.name,
    preparedFor:
      d.company.trim() && d.product.trim() ? { company: d.company.trim(), product: d.product.trim(), date: fmtDay(brief.createdAt) } : null,
    confidence,
    stakeholderCount: eligible.size,
    summary,
    judgment,
    metrics: b.metrics.filter((m) => m.key !== "confidence"),
    exhibit: { nodes, edges: map.edges.filter((e) => keep.has(e.a) && keep.has(e.b)), route: map.contactFirst, sourceCount: d.sources.filter((s) => s.accepted).length },
    top,
    path: b.path,
    plan,
    meet,
    risks,
    requirements,
    exportCheck: requirements.length > 0 && b.exportCheck,
    sources,
    citedIds,
  };
}

function dedupe(refs: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
