// EVAL-2 (plan S24): free writing checks on a brief. No Claude call: regexes and counting only.
// Measured over the parts the A4 shows: summary, risks, requirements, routes and the 7-day plan.
import type { Brief } from "@/lib/types";

export type BriefText = Pick<Brief, "summary" | "risks" | "requirements" | "routes" | "plan">;

/** Words from the style block's "never write" list (EVAL-1). */
export const BANNED =
  /\b(delv(e|es|ed|ing)|landscapes?|navigat(e|es|ed|ing)|leverag(e|es|ed|ing)|robust|seamless(ly)?|pivotal|crucial(ly)?|dynamic|evolving|ecosystems?|tapestry|realms?|foster(s|ed|ing)?|unlock(s|ed|ing)?|game-changer|in today's|it is worth noting|it's important to note|it is important to note)\b/gi;
/** "It's not X, it's Y" and "not just X, but Y". */
export const NOT_X_BUT_Y = /\b(it'?s|it is|this is) not\b[^.;]{1,80}?,\s*(it'?s|it is|but)\b|\bnot (just|only|merely|simply)\b[^.;]{1,80}?\bbut( also)?\b/gi;
/** A sentence that opens by summing up. Matched per sentence. */
export const SUMMARY_CLOSER = /^(overall|in summary|in short|ultimately|in conclusion|to sum up|all in all|taken together)\b/i;
/** Hedge words; a sentence with two or more is a stacked hedge. */
export const HEDGE = /\b(may|might|could|potentially|possibly|perhaps|likely to|appears? to|seems? to|somewhat|relatively)\b/gi;
export const EM_DASH = /—/g;
/** Adjectives standing in for a number. */
export const INTENSIFIER = /\b(significant(ly)?|substantial(ly)?|considerabl[ey]|remarkabl[ey]|tremendous(ly)?|massive(ly)?|huge|vast(ly)?|extremely|incredibly|highly|very)\b/gi;

export interface TicReport {
  words: number;
  sentences: number;
  /** Counts, and the same per 100 words. */
  counts: { banned: number; notXButY: number; summaryClosers: number; stackedHedges: number; emDashes: number; intensifiers: number };
  per100: TicReport["counts"];
  sentenceLength: { mean: number; sd: number };
  /** The matched phrases, for reading. */
  hits: string[];
}

export function briefSentences(b: BriefText): string[] {
  const items = [
    ...b.summary,
    ...b.risks,
    ...(b.requirements ?? []),
    ...(b.routes ?? []),
    ...b.plan.prep,
    ...b.plan.contact,
    ...b.plan.event,
    ...b.plan.followUp,
  ].map((x) => x.text);
  return items.flatMap(splitSentences);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"“(0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const wordCount = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,$%-]*/gu) ?? []).length;
const matches = (re: RegExp, s: string) => s.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? [];

export function ticReport(sentences: string[]): TicReport {
  const text = sentences.join(" ");
  const words = sentences.reduce((n, s) => n + wordCount(s), 0);
  const hits: string[] = [];
  const count = (re: RegExp) => {
    const m = matches(re, text);
    hits.push(...m);
    return m.length;
  };
  const counts = {
    banned: count(BANNED),
    notXButY: count(NOT_X_BUT_Y),
    summaryClosers: sentences.filter((s) => SUMMARY_CLOSER.test(s)).length,
    stackedHedges: sentences.filter((s) => matches(HEDGE, s).length >= 2).length,
    emDashes: count(EM_DASH),
    intensifiers: count(INTENSIFIER),
  };
  const per = (n: number) => (words ? Math.round((n / words) * 10000) / 100 : 0);
  const lengths = sentences.map(wordCount);
  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const sd = lengths.length ? Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length) : 0;
  return {
    words,
    sentences: sentences.length,
    counts,
    per100: {
      banned: per(counts.banned),
      notXButY: per(counts.notXButY),
      summaryClosers: per(counts.summaryClosers),
      stackedHedges: per(counts.stackedHedges),
      emDashes: per(counts.emDashes),
      intensifiers: per(counts.intensifiers),
    },
    sentenceLength: { mean: Math.round(mean * 10) / 10, sd: Math.round(sd * 10) / 10 },
    hits,
  };
}

/** 3-word phrases of one text, lower-cased, numbers and source labels removed. */
export function trigrams(text: string): Set<string> {
  const w = text
    .toLowerCase()
    .replace(/\[s\d+[^\]]*\]/g, " ")
    .replace(/[^\p{L}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}

/**
 * Sameness across dossiers: the share of each summary's 3-word phrases that also appear in at
 * least one other dossier's summary, averaged. High = the same template for every market.
 */
export function sharedTrigramRate(summaries: string[]): number {
  if (summaries.length < 2) return 0;
  const sets = summaries.map(trigrams);
  const rates = sets.map((set, i) => {
    if (set.size === 0) return 0;
    const others = new Set(sets.flatMap((s, j) => (j === i ? [] : [...s])));
    return [...set].filter((t) => others.has(t)).length / set.size;
  });
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 1000;
}
