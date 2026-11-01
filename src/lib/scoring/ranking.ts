// docs/scoring.md §5: contact-first three (fixed rule, not Claude) and Power Matrix quadrants.
import type { ContactPick, Quadrant } from "@/lib/types";
import type { Scored } from "./metrics";
import { RESISTANT_AT } from "./support";

export const WARM_PATH_BONUS = 15;
export const INFLUENCE_CUTOFF = 50;

/** Unknown support (or no influence) → null: listed beside the matrix, not in it. */
export function quadrant(s: Scored): Quadrant | null {
  if (!s.influence || s.support.kind !== "known") return null;
  const high = s.influence.score >= INFLUENCE_CUTOFF;
  const positive = s.support.score >= 0;
  return high ? (positive ? "champions" : "blockers") : positive ? "allies" : "monitor";
}

/** Resistant stakeholders (≤ −20), most influential first: they get "how to reduce opposition". */
export function resistant(scored: Scored[]): Scored[] {
  return scored
    .filter((s) => s.influence && s.support.kind === "known" && s.support.score <= RESISTANT_AT)
    .sort((a, b) => (b.influence?.score ?? 0) - (a.influence?.score ?? 0));
}

/**
 * 1. Candidates: influence ≥ 50 and known support > −20.
 * 2. Rank = influence + 15 with a warm path (≤ 2 hops); ties → more sources first.
 * 3. Top 3; fewer → fill from Allies to grow (influence < 50, support ≥ 0).
 * 4. Resistant stakeholders are never picked.
 */
export function contactFirst(
  scored: Scored[],
  opts: { warmPathIds?: ReadonlySet<string>; sourceCounts?: ReadonlyMap<string, number> } = {},
): ContactPick[] {
  const warm = opts.warmPathIds ?? new Set<string>();
  const count = (id: string) => opts.sourceCounts?.get(id) ?? 0;
  const pick = (s: Scored, fromAllies: boolean): ContactPick => ({
    stakeholderId: s.id,
    rankScore: (s.influence?.score ?? 0) + (warm.has(s.id) ? WARM_PATH_BONUS : 0),
    warmPath: warm.has(s.id),
    fromAllies,
  });
  const order = (a: ContactPick, b: ContactPick) =>
    b.rankScore - a.rankScore || count(b.stakeholderId) - count(a.stakeholderId);

  const candidates = scored
    .filter((s) => s.influence && s.influence.score >= INFLUENCE_CUTOFF && s.support.kind === "known" && s.support.score > RESISTANT_AT)
    .map((s) => pick(s, false))
    .sort(order);
  const top = candidates.slice(0, 3);
  if (top.length < 3) {
    const allies = scored
      .filter((s) => quadrant(s) === "allies")
      .map((s) => pick(s, true))
      .sort(order);
    top.push(...allies.slice(0, 3 - top.length));
  }
  return top;
}
