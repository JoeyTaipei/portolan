// Admiralty grades in plain words (direction.md keeps the code; the screen leads with words).
// Reliability A–F rates the source, credibility 1–6 rates the claim.
import type { Credibility, Reliability, SourceType } from "@/lib/types";

export const RELIABILITY_WORDS: Record<Reliability, string> = {
  A: "completely reliable",
  B: "usually reliable",
  C: "fairly reliable",
  D: "not usually reliable",
  E: "unreliable",
  F: "reliability can't be judged",
};

export const CREDIBILITY_WORDS: Record<Credibility, string> = {
  1: "confirmed by other sources",
  2: "probably true",
  3: "possibly true",
  4: "doubtful",
  5: "improbable",
  6: "truth can't be judged",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  government_gazette: "Government gazette",
  legislative_record: "Legislative record",
  government_site: "Government site",
  news: "News",
  trade_press: "Trade press",
  company_site: "Company site",
  report: "Report",
  event_page: "Event page",
  database: "Database",
  debrief: "Debrief",
  other: "Other",
};

/** "usually reliable, probably true" */
export function gradeWords(r: Reliability, c: Credibility): string {
  return `${RELIABILITY_WORDS[r]}, ${CREDIBILITY_WORDS[c]}`;
}

/** "mnd.gov.tw" from a URL; null for debriefs or bad URLs. */
export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
