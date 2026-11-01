import type { Sentence } from "@/lib/types";
import { claimProblems, normaliseText, numberProblems, type SourceIndex } from "./source-check";

// Pre-display check (spec §11.1 BRIEF-6, scoring §6), per written sentence, in code:
// cited ids exist and pass §7.7; people and organisations mentioned are on the map; no
// placeholders; no individuals in China. A failing sentence is removed and logged, never
// shown with a warning.

export const PLACEHOLDER = /\[[A-Z _-]+\]|\bTBD\b|lorem/i;

export interface PreDisplayContext {
  sources: SourceIndex;
  /** Names that research found but that are not on this map (filtered out, over the limit, other runs). */
  offMapNames: string[];
  /** People in China, by name: never written about (organisation level only). */
  chinaPeople: string[];
  runId?: string | null;
}

export interface Removed {
  sentence: string;
  reason: string;
}

const mentions = (text: string, name: string) => {
  const n = normaliseText(name).toLowerCase();
  return n.length >= 2 && normaliseText(text).toLowerCase().includes(n);
};

/** Why a sentence can't be shown, or null if it passes. */
export function sentenceProblem(s: Sentence, ctx: PreDisplayContext): string | null {
  if (PLACEHOLDER.test(s.text)) return "Placeholder text";
  const china = ctx.chinaPeople.find((n) => mentions(s.text, n));
  if (china) return `Names an individual in China (${china})`;
  const off = ctx.offMapNames.find((n) => mentions(s.text, n));
  if (off) return `Mentions ${off}, which is not on the map`;
  const src = claimProblems("sentence", s.sourceIds, null, ctx.sources, { runId: ctx.runId });
  if (src.length) return src[0].replace(/^sentence: /, "");
  const nums = numberProblems("sentence", s.text, s.sourceIds, ctx.sources);
  if (nums.length) return nums[0].replace(/^sentence: /, "");
  return null;
}

export function preDisplay<T extends Sentence>(sentences: T[], ctx: PreDisplayContext): { kept: T[]; removed: Removed[] } {
  const kept: T[] = [];
  const removed: Removed[] = [];
  for (const s of sentences) {
    const reason = sentenceProblem(s, ctx);
    if (reason) removed.push({ sentence: s.text, reason });
    else kept.push(s);
  }
  return { kept, removed };
}
