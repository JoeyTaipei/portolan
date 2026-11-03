// Turns scoring results (src/lib/scoring) into what SCORE-X shows. No score is computed here:
// these functions only label numbers the scoring module already produced.
import type {
  Banded,
  DataConfidenceResult,
  FactorBreakdown,
  InfluenceFactor,
  Level,
  Rating03,
  Source,
  SupportResult,
  SupportStatement,
} from "@/lib/types";
import { hostOf, SOURCE_TYPE_LABEL } from "./grade";

export interface SourceRef {
  id: string;
  label: string;
  title: string;
  reliability: Source["reliability"];
  credibility: Source["credibility"];
  verifiedAt: string | null;
  /** For a debrief: the meeting date (TRK-11). */
  publishedAt: string | null;
  url: string | null;
  /** "mnd.gov.tw"; null without a URL. */
  host: string | null;
  /** "Government site", "News"… */
  type: string;
  credibilityReason: string | null;
}

export interface ExplainFactor {
  label: string;
  weight: string | null;
  rating: string;
  sources: SourceRef[];
}

export interface Explanation {
  title: string;
  result: string;
  basedOn: string | null;
  factors: ExplainFactor[];
  summary: string;
}

export function sourceRef(s: Source): SourceRef {
  return {
    id: s.id,
    label: s.label,
    title: s.title,
    reliability: s.reliability,
    credibility: s.credibility,
    verifiedAt: s.verifiedAt,
    publishedAt: s.publishedAt,
    url: s.url,
    host: hostOf(s.url),
    type: SOURCE_TYPE_LABEL[s.sourceType],
    credibilityReason: s.credibilityReason,
  };
}

/** Accepted sources only: rejected or missing ids never appear as evidence. */
export function refsFor(ids: string[], byId: ReadonlyMap<string, SourceRef>): SourceRef[] {
  const out: SourceRef[] = [];
  for (const id of new Set(ids)) {
    const r = byId.get(id);
    if (r) out.push(r);
  }
  return out;
}

const FACTOR_LABEL: Record<InfluenceFactor, string> = {
  authority: "Formal authority",
  budget: "Budget control",
  access: "Access to decision makers",
  centrality: "Network centrality",
  recent: "Recent action",
};

const pct = (w: number) => `${Math.round(w * 100)}%`;
const rating = (r: Rating03 | null) => (r === null ? "No sourced rating" : `${r} of 3`);

/** "1 Nov", fixed to UTC so the server and the browser print the same day. */
const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** TRK-11: "From your meeting, 1 Nov" when a meeting memo set this factor; null otherwise. */
export function fromMeetingText(f: FactorBreakdown, refs: SourceRef[]): string | null {
  if (!f.fromMeeting) return null;
  const days = refs.filter((r) => r.type === SOURCE_TYPE_LABEL.debrief && r.publishedAt).map((r) => r.publishedAt as string).sort();
  const last = days.at(-1);
  return last ? `From your meeting, ${shortDay(last)}` : "From your meeting";
}

export function influenceText(b: Banded | null): string {
  return b ? `${b.level} · ${b.low}–${b.high}` : "Unverified";
}

export function influenceExplanation(
  name: string,
  b: Banded | null,
  breakdown: FactorBreakdown[],
  byId: ReadonlyMap<string, SourceRef>,
): Explanation {
  return {
    title: `Influence: ${name}`,
    result: b ? `${b.level} · ${b.low}–${b.high}` : "Unverified: no sourced factor yet",
    basedOn: b ? `Based on ${b.basedOn.rated} of ${b.basedOn.of} factors` : "Based on 0 of 5 factors",
    factors: breakdown.map((f) => {
      const sources = refsFor(f.sourceIds, byId);
      const meeting = fromMeetingText(f, sources);
      return { label: FACTOR_LABEL[f.factor], weight: pct(f.weight), rating: meeting ? `${rating(f.rating)} · ${meeting}` : rating(f.rating), sources };
    }),
    summary:
      "Influence is power over your goal, from 0 to 100. Four factors are rated 0–3 from cited sources; network centrality counts sourced ties. Factors with no source are left out rather than counted as 0, and each missing factor widens the range by 5. Your team's meeting answers replace the research rating for a factor.",
  };
}

export function supportText(s: SupportResult): string {
  if (s.kind === "unknown") return "Unknown";
  const sign = s.score > 0 ? "+" : s.score < 0 ? "−" : "±";
  return `${sign}${Math.abs(s.score)}`;
}

export const STANCE_LABEL = {
  supportive: "Supportive",
  neutral: "Neutral",
  resistant: "Resistant",
  unknown: "Unknown",
  event: "Event",
} as const;

export function supportExplanation(
  name: string,
  s: SupportResult,
  statements: SupportStatement[],
  byId: ReadonlyMap<string, SourceRef>,
): Explanation {
  const counted = statements.filter((st) => byId.has(st.sourceId));
  return {
    title: `Support: ${name}`,
    result:
      s.kind === "unknown"
        ? "No sourced statement found yet"
        : `${STANCE_LABEL[s.stance]} · ${supportText(s)} on a −100 to +100 scale`,
    basedOn: s.kind === "known" ? `Based on ${s.basedOn} statement${s.basedOn === 1 ? "" : "s"}` : null,
    factors: counted.map((st) => ({
      label: st.summary,
      weight: null,
      rating: `${st.rating > 0 ? "+" : st.rating < 0 ? "−" : "±"}${Math.abs(st.rating)} of ±2`,
      sources: refsFor([st.sourceId], byId),
    })),
    summary:
      "Support is what this stakeholder said or did about foreign firms like yours. Each statement is rated −2 to +2 and weighted by its source's Admiralty grade and age. +20 or more is supportive, −20 or less is resistant. With no statement it stays Unknown, never 0.",
  };
}

export function confidenceExplanation(
  name: string,
  level: Level,
  sources: SourceRef[],
  influence: Banded | null,
): Explanation {
  return {
    title: `Confidence: ${name}`,
    result: `${level} · ${sources.length} source${sources.length === 1 ? "" : "s"}`,
    basedOn: `${influence?.basedOn.rated ?? 0} of 5 influence factors rated`,
    factors: [{ label: "Cited sources", weight: null, rating: `${sources.length}`, sources }],
    summary:
      "High needs two or more independent sources, at least one graded B2 or better, and all five influence factors rated. One source or three missing factors is Low. Everything else is Medium.",
  };
}

export function dataConfidenceText(c: DataConfidenceResult): string {
  return `${c.level} · ${c.sourceCount} source${c.sourceCount === 1 ? "" : "s"}`;
}

export function dataConfidenceExplanation(c: DataConfidenceResult): Explanation {
  return {
    title: "Data confidence",
    result: dataConfidenceText(c),
    basedOn: `${c.qualifying} of ${c.of} stakeholders are well sourced`,
    factors: [],
    summary:
      "A stakeholder is well sourced when two or more independent sources back it and at least one is graded B2 or better. High means 70% or more of the mapped stakeholders are well sourced, Medium 40–69%, Low under 40%.",
  };
}
