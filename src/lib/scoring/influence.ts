// docs/scoring.md §2: influence 0–100 from five factors; Claude rates four, code computes centrality.
import type {
  Banded,
  Category,
  Edge,
  Fact,
  FactorBreakdown,
  InfluenceFactor,
  InfluenceRatings,
  Level,
  Rating03,
  RatedFactor,
} from "@/lib/types";

export const INFLUENCE_WEIGHTS = {
  authority: 0.3,
  budget: 0.25,
  access: 0.2,
  centrality: 0.15,
  recent: 0.1,
} as const satisfies Record<InfluenceFactor, number>;

const FACTORS = Object.keys(INFLUENCE_WEIGHTS) as InfluenceFactor[];
const RATED: RatedFactor[] = ["authority", "budget", "access", "recent"];

/** Map labels shown by default at this influence or more (design mockup). */
export const LABEL_THRESHOLD = 78;

export function influenceLevel(score: number): Level {
  return score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
}

/** §2.3: score, range ±(5 + 5 × missing factors) and level. Null when nothing is rated. */
export function influenceScore(r: InfluenceRatings): Banded | null {
  const rated = FACTORS.filter((k) => r[k] !== null);
  if (rated.length === 0) return null;
  const num = rated.reduce((s, k) => s + INFLUENCE_WEIGHTS[k] * (r[k] as number), 0);
  const den = 3 * rated.reduce((s, k) => s + INFLUENCE_WEIGHTS[k], 0);
  const score = Math.round((100 * num) / den);
  const missing = FACTORS.length - rated.length;
  const half = 5 + 5 * missing;
  return {
    score,
    low: Math.max(0, score - half),
    high: Math.min(100, score + half),
    level: influenceLevel(score),
    basedOn: { rated: rated.length, of: FACTORS.length },
  };
}

/** §2.2: distinct neighbours over sourced edges only. 0 → 0, 1–2 → 1, 3–5 → 2, 6+ → 3. */
export function centralityRating(stakeholderId: string, edges: Edge[]): Rating03 {
  const neighbours = new Set<string>();
  for (const e of edges) {
    if (e.status !== "sourced" || e.sourceIds.length === 0) continue;
    if (e.aId === stakeholderId) neighbours.add(e.bId);
    else if (e.bId === stakeholderId) neighbours.add(e.aId);
  }
  const n = neighbours.size;
  return n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3;
}

/**
 * The sourced, rated fact used for each Claude-rated factor. Unverified facts never count.
 * §3.2 "memo wins": a fact from a meeting memo beats research; among the same kind, the newest.
 */
export function ratedFacts(stakeholderId: string, facts: Fact[]): Partial<Record<RatedFactor, Fact>> {
  const out: Partial<Record<RatedFactor, Fact>> = {};
  for (const f of facts) {
    if (f.stakeholderId !== stakeholderId) continue;
    if (f.status !== "sourced" || f.sourceIds.length === 0 || f.rating === null) continue;
    const field = f.field as RatedFactor;
    if (!RATED.includes(field)) continue;
    const prev = out[field];
    const memo = Boolean(f.debriefId);
    const prevMemo = Boolean(prev?.debriefId);
    if (!prev || (memo && !prevMemo) || (memo === prevMemo && f.createdAt > prev.createdAt)) out[field] = f;
  }
  return out;
}

/** §2.3 (decision 0004): categories with no formal authority over, or control of, government budgets. */
const STRUCTURAL_ZERO: Partial<Record<Category, RatedFactor[]>> = {
  ind: ["authority", "budget"],
  cap: ["authority", "budget"],
  leg: ["authority", "budget"],
};

/** §2.3 (decision 0004): fewer sourced Claude-rated factors than this → no score. */
export const MIN_SOURCED_FACTORS = 2;

/** Factors set to 0 by the category rule (no sourced rating), for SCORE-X to label "by category rule". */
export function structuralZeros(stakeholderId: string, facts: Fact[], category?: Category): RatedFactor[] {
  const rf = ratedFacts(stakeholderId, facts);
  return (category ? STRUCTURAL_ZERO[category] ?? [] : []).filter((k) => !rf[k]);
}

/**
 * The five ratings for one stakeholder. With fewer than MIN_SOURCED_FACTORS sourced Claude-rated
 * factors, every factor is null (centrality and category zeros aren't evidence), so there is no score.
 */
export function influenceRatings(
  stakeholderId: string,
  facts: Fact[],
  edges: Edge[],
  category?: Category,
): InfluenceRatings {
  const rf = ratedFacts(stakeholderId, facts);
  const sourced = RATED.filter((k) => rf[k]).length;
  if (sourced < MIN_SOURCED_FACTORS) {
    return { authority: null, budget: null, access: null, recent: null, centrality: null };
  }
  const zeros = structuralZeros(stakeholderId, facts, category);
  const pick = (k: RatedFactor): Rating03 | null => rf[k]?.rating ?? (zeros.includes(k) ? 0 : null);
  return {
    authority: pick("authority"),
    budget: pick("budget"),
    access: pick("access"),
    recent: pick("recent"),
    centrality: centralityRating(stakeholderId, edges),
  };
}

/** For SCORE-X: each factor's rating, weight and the sources it cites. */
export function influenceBreakdown(
  stakeholderId: string,
  facts: Fact[],
  edges: Edge[],
  category?: Category,
): FactorBreakdown[] {
  const rf = ratedFacts(stakeholderId, facts);
  const ratings = influenceRatings(stakeholderId, facts, edges, category);
  return FACTORS.map((factor) => {
    let sourceIds: string[] = [];
    let fromMeeting = false;
    if (factor === "centrality") {
      const mine = edges.filter((e) => e.status === "sourced" && (e.aId === stakeholderId || e.bId === stakeholderId));
      sourceIds = [...new Set(mine.flatMap((e) => e.sourceIds))];
      fromMeeting = mine.some((e) => e.debriefId);
    } else {
      sourceIds = rf[factor]?.sourceIds ?? [];
      fromMeeting = Boolean(rf[factor]?.debriefId);
    }
    return { factor, weight: INFLUENCE_WEIGHTS[factor], rating: ratings[factor], sourceIds, ...(fromMeeting ? { fromMeeting } : {}) };
  });
}

export function influenceFor(stakeholderId: string, facts: Fact[], edges: Edge[], category?: Category): Banded | null {
  return influenceScore(influenceRatings(stakeholderId, facts, edges, category));
}
