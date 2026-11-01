// docs/scoring.md §3: support −100…+100 from rated statements, weighted by source.
import type { DebriefOverall, Source, StatementRating, SupportResult, SupportStatement } from "@/lib/types";
import { sourceWeight } from "./source-weight";

export const SUPPORTIVE_AT = 20;
export const RESISTANT_AT = -20;

/** §3.1: Positive = +2, Neutral = 0, Negative = −2. */
export function debriefRating(overall: DebriefOverall): StatementRating {
  return overall === "positive" ? 2 : overall === "negative" ? -2 : 0;
}

/**
 * Support = 50 × Σ(weight × rating) ÷ Σ weight. Only statements whose source exists and was
 * accepted count. No statement → Unknown (never 0, never neutral).
 */
export function supportFor(
  stakeholderId: string,
  statements: SupportStatement[],
  sources: Source[],
  now: Date,
): SupportResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  let num = 0;
  let den = 0;
  let n = 0;
  for (const st of statements) {
    if (st.stakeholderId !== stakeholderId) continue;
    const src = byId.get(st.sourceId);
    if (!src || !src.accepted) continue;
    const w = sourceWeight(src, now);
    num += w * st.rating;
    den += w;
    n += 1;
  }
  if (n === 0 || den === 0) return { kind: "unknown" };
  const score = Math.round((50 * num) / den);
  const stance = score >= SUPPORTIVE_AT ? "supportive" : score <= RESISTANT_AT ? "resistant" : "neutral";
  return { kind: "known", score, stance, basedOn: n };
}
