import type { Sentence } from "@/lib/types";
import { claimProblems, normaliseText, numberProblems, type SourceIndex } from "./source-check";

// Pre-display check (spec §11.1 BRIEF-6, scoring §6), per written sentence, in code:
// cited ids exist and pass §7.7; people and organisations mentioned are on the map; no
// placeholders; no individuals in China; no spec-in (BRIEF-10). A failing sentence is removed and logged, never
// shown with a warning.

export const PLACEHOLDER = /\[[A-Z _-]+\]|\bTBD\b|lorem/i;

// BRIEF-10: spec-in / 綁標 (shaping a buyer's tender specifications to fit the client or shut out
// rivals) can break Government Procurement Act Art. 26 and Art. 88. The prompts forbid it; this
// fixed phrase list is the backstop. It targets advice wording, so a sourced fact about Art. 26
// or the lawful alternative (offer test data and standards for functional requirements) passes.
const SPEC = String.raw`(?:spec|specs|specification|specifications|tender requirements|technical requirements|bid requirements)`;
const RIVALS = String.raw`(?:rival|rivals|competitor|competitors|other bidders|other vendors|other suppliers)`;
const SPEC_IN: RegExp[] = [
  /\bspec-in\b|\bspec in\b(?! (?:the|this|that|a|an|its|their)\b)/i,
  /\bspecc?(?:ed|ing)[- ]in\b/i,
  /綁標|綁規格|量身(?:訂|定)做|指定廠牌|協助(?:機關)?(?:撰寫|擬定|訂定)(?:採購)?規格/,
  /\b(?:wire|wired|rig|rigged|tailor|tailored|tailoring)\b[^.;]{0,40}\b(?:tender|tenders|bid|bids|spec|specs|specification|specifications|requirements)\b/i,
  new RegExp(String.raw`\b(?:lock|locks|locking|shut|shuts|shutting|box|boxing|freeze|freezing)\s+out\b[^.;]{0,40}\b${RIVALS}`, "i"),
  new RegExp(String.raw`\bexclud(?:e|es|ing)\b[^.;]{0,30}\b${RIVALS}`, "i"),
  new RegExp(String.raw`\b(?:help|helps|helping|assist|assists|assisting|offer to|work with|working with)\b[^.;]{0,60}\b(?:write|writing|draft|drafting|shape|shaping|set|setting|define|defining)\b[^.;]{0,30}\b${SPEC}\b`, "i"),
  new RegExp(String.raw`\b(?:name|specify|write in|get)\b[^.;]{0,20}\b(?:your|the client's|our)\s+(?:brand|model|product)\b[^.;]{0,30}\b(?:in|into)\s+the\s+(?:tender|spec|specs|specification)`, "i"),
  new RegExp(String.raw`\b${SPEC}\b[^.;]{0,30}\b(?:that|which|so that)\s+only\s+(?:you|your|the client|our)\b`, "i"),
];

export const SPEC_IN_REASON = "Suggests spec-in (Government Procurement Act Art. 26/88)";

/** BRIEF-10: true when the text suggests spec-in or 綁標. */
export function suggestsSpecIn(text: string): boolean {
  return SPEC_IN.some((re) => re.test(text));
}

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

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Chinese names match anywhere; Latin names only as whole words ("AB" is not in "about"). */
const mentions = (text: string, name: string) => {
  const n = normaliseText(name).toLowerCase();
  const t = normaliseText(text).toLowerCase();
  if (n.length < 2) return false;
  if (/[\u3400-\u9fff]/.test(n)) return t.includes(n);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(n)}($|[^\\p{L}\\p{N}])`, "u").test(t);
};

/** Why a sentence can't be shown, or null if it passes. */
export function sentenceProblem(s: Sentence, ctx: PreDisplayContext): string | null {
  if (PLACEHOLDER.test(s.text)) return "Placeholder text";
  if (suggestsSpecIn(s.text)) return SPEC_IN_REASON;
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
