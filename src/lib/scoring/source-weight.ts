// docs/scoring.md §1: Admiralty source weight = reliability × credibility × recency.
// Debriefs are A1 and count double (§3.1).
import type { Credibility, Iso, Reliability, Source } from "@/lib/types";

export const RELIABILITY_WEIGHT: Record<Reliability, number> = {
  A: 1.0,
  B: 0.8,
  C: 0.6,
  D: 0.4,
  E: 0.2,
  F: 0.3,
};

export const CREDIBILITY_WEIGHT: Record<Credibility, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.6,
  4: 0.4,
  5: 0.2,
  6: 0.3,
};

export const DEBRIEF_MULTIPLIER = 2;

const DAY_MS = 86_400_000;

/** Whole days from `date` to `now` (negative = in the future). */
export function daysBetween(date: Iso, now: Date): number {
  return Math.floor((now.getTime() - new Date(date).getTime()) / DAY_MS);
}

/** ≤ 12 months ×1.0, 12–24 months ×0.6, older ×0.3. An undated source counts as old. */
export function recencyFactor(date: Iso | null, now: Date): number {
  if (!date) return 0.3;
  const days = daysBetween(date, now);
  if (days <= 365) return 1.0;
  if (days <= 730) return 0.6;
  return 0.3;
}

export function sourceWeight(
  source: Pick<Source, "reliability" | "credibility" | "publishedAt" | "verifiedAt" | "origin">,
  now: Date,
): number {
  const base =
    RELIABILITY_WEIGHT[source.reliability] *
    CREDIBILITY_WEIGHT[source.credibility] *
    recencyFactor(source.publishedAt ?? source.verifiedAt, now);
  return source.origin === "debrief" ? base * DEBRIEF_MULTIPLIER : base;
}

/** "B2 or better": reliability A–B and credibility 1–2 (scoring §4.4). */
export function isB2OrBetter(source: Pick<Source, "reliability" | "credibility">): boolean {
  return (source.reliability === "A" || source.reliability === "B") && source.credibility <= 2;
}
