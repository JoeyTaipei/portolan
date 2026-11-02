// docs/scoring.md §4: the four strategy-brief metrics, plus per-stakeholder confidence.
import type {
  Banded,
  DataConfidenceResult,
  Fact,
  Level,
  MarketChecks,
  OppositionResult,
  Rating03,
  ReadinessResult,
  Source,
  Stakeholder,
  SupportResult,
  SupportStatement,
  TimedEvent,
  WindowResult,
} from "@/lib/types";
import { isB2OrBetter } from "./source-weight";

/** A stakeholder with its computed scores; the input to every metric. */
export interface Scored {
  id: string;
  influence: Banded | null;
  support: SupportResult;
}

type Known = Scored & { influence: Banded; support: Extract<SupportResult, { kind: "known" }> };

/** Stakeholders that enter the metrics: scored, not still being researched, not events. */
export function isEligible(s: Pick<Stakeholder, "status" | "category">): boolean {
  return s.category !== "evt" && (s.status === "active" || s.status === "not_found_latest");
}

function known(scored: Scored[]): Known[] {
  return scored.filter((s): s is Known => s.influence !== null && s.support.kind === "known");
}

// ─── §4.1 Opposition index ───────────────────────────────────────────────────

export function oppositionLevel(fraction: number): Level {
  return fraction > 0.4 ? "High" : fraction >= 0.2 ? "Medium" : "Low";
}

/**
 * Influence of resistant stakeholders ÷ influence of everyone whose support is known.
 * Unknown support is left out ("based on N of M"). Range: resistant at their low bound vs
 * others at their high bound, and the reverse.
 */
export function oppositionIndex(scored: Scored[]): OppositionResult | null {
  const k = known(scored);
  if (k.length === 0) return null;
  const res = k.filter((s) => s.support.stance === "resistant");
  const rest = k.filter((s) => s.support.stance !== "resistant");
  const sum = (xs: Known[], f: (b: Banded) => number) => xs.reduce((a, s) => a + f(s.influence), 0);
  const ratio = (num: number, other: number) => (num + other === 0 ? 0 : num / (num + other));
  const value = ratio(sum(res, (b) => b.score), sum(rest, (b) => b.score));
  return {
    value,
    low: ratio(sum(res, (b) => b.low), sum(rest, (b) => b.high)),
    high: ratio(sum(res, (b) => b.high), sum(rest, (b) => b.low)),
    level: oppositionLevel(value),
    basedOn: { known: k.length, of: scored.length },
  };
}

// ─── §4.2 Entry readiness ────────────────────────────────────────────────────

/** Supporters' share of known influence: ≥ 50% → 3, 25–50% → 2, 10–25% → 1, < 10% → 0. */
export function supportCheck(scored: Scored[]): Rating03 | null {
  const k = known(scored);
  const total = k.reduce((a, s) => a + s.influence.score, 0);
  if (k.length === 0 || total === 0) return null;
  const share = k.filter((s) => s.support.stance === "supportive").reduce((a, s) => a + s.influence.score, 0) / total;
  return share >= 0.5 ? 3 : share >= 0.25 ? 2 : share >= 0.1 ? 1 : 0;
}

export function readinessLevel(score: number): Level {
  return score >= 67 ? "High" : score >= 34 ? "Medium" : "Low";
}

/** 100 × Σ ratings ÷ (3 × rated checks). Unsourced checks don't count. */
export function entryReadiness(checks: MarketChecks, scored: Scored[]): ReadinessResult | null {
  const sourced = (c: MarketChecks["money"]) =>
    c && c.status === "sourced" && c.sourceIds.length > 0 ? c.rating : null;
  const ratings = { money: sourced(checks.money), licence: sourced(checks.licence), support: supportCheck(scored) };
  const rated = Object.values(ratings).filter((r): r is Rating03 => r !== null);
  if (rated.length === 0) return null;
  const score = Math.round((100 * rated.reduce<number>((a, r) => a + r, 0)) / (3 * rated.length));
  return { score, level: readinessLevel(score), checks: ratings, basedOn: { rated: rated.length, of: 3 } };
}

// ─── §4.3 Window to act ──────────────────────────────────────────────────────

export const DEADLINE_KINDS = new Set<TimedEvent["kind"]>(["budget_vote", "tender_close", "committee_review"]);

/** Taipei (UTC+8) calendar date of an instant, "YYYY-MM-DD". */
export function taipeiDay(at: Date): string {
  return new Date(at.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
}

/** Days until the next sourced, goal-related deadline; none → "No sourced deadline found". */
export function windowToAct(events: TimedEvent[], now: Date): WindowResult {
  const today = taipeiDay(now);
  const next = events
    .filter(
      (e): e is TimedEvent & { date: string } =>
        e.status === "sourced" &&
        e.sourceIds.length > 0 &&
        e.relevantToGoal &&
        DEADLINE_KINDS.has(e.kind) &&
        e.date !== null &&
        e.date.slice(0, 10) >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return { found: false, text: "No sourced deadline found" };
  const days = Math.round((Date.parse(next.date.slice(0, 10)) - Date.parse(today)) / 86_400_000);
  return { found: true, days, eventId: next.id, title: next.title, date: next.date };
}

// ─── §4.4 Data confidence ────────────────────────────────────────────────────

/** Accepted sources cited by a stakeholder's sourced facts and its statements. */
export function sourcesFor(stakeholderId: string, facts: Fact[], statements: SupportStatement[], sources: Source[]): Source[] {
  const ids = new Set<string>();
  for (const f of facts) if (f.stakeholderId === stakeholderId && f.status === "sourced") f.sourceIds.forEach((i) => ids.add(i));
  for (const s of statements) if (s.stakeholderId === stakeholderId) ids.add(s.sourceId);
  return sources.filter((s) => s.accepted && ids.has(s.id));
}

/** Independent = different publishers (host name when no publisher is recorded). */
function independentCount(sources: Source[]): number {
  const key = (s: Source) => {
    if (s.publisher) return s.publisher.toLowerCase();
    if (!s.url) return `id:${s.id}`;
    try {
      return new URL(s.url).hostname.replace(/^www\./, "");
    } catch {
      return s.url;
    }
  };
  return new Set(sources.map(key)).size;
}

/** ≥ 2 independent sources, at least one B2 or better. */
export function wellSourced(sources: Source[]): boolean {
  return independentCount(sources) >= 2 && sources.some(isB2OrBetter);
}

export function dataConfidence(stakeholderSources: Source[][], acceptedSourceCount: number): DataConfidenceResult {
  const of = stakeholderSources.length;
  const qualifying = stakeholderSources.filter(wellSourced).length;
  const share = of === 0 ? 0 : qualifying / of;
  const level: Level = share >= 0.7 ? "High" : share >= 0.4 ? "Medium" : "Low";
  return { level, sourceCount: acceptedSourceCount, qualifying, of };
}

/**
 * One stakeholder: High = well sourced and all 5 influence factors rated; Low = at most one
 * source or 3+ factors missing; otherwise Medium.
 */
export function stakeholderConfidence(sources: Source[], influence: Banded | null): Level {
  const rated = influence?.basedOn.rated ?? 0;
  if (sources.length <= 1 || rated <= 2) return "Low";
  if (wellSourced(sources) && rated === 5) return "High";
  return "Medium";
}
