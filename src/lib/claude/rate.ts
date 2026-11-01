import "server-only";
import { claimProblems, type CheckSource } from "@/lib/checks/source-check";
import { MODELS } from "@/lib/limits/prices";
import type { Credibility, FactField, FactStatus, Rating03, StatementRating } from "@/lib/types";
import { callStructured, claudeLive, type LedgerContext } from "./client";
import { mockRate } from "./mock";
import { RATE_SYSTEM, ratePrompt, type PromptClient } from "./prompts";
import { RatingOutput } from "./schemas";

// The `rate` step (spec §7.2) with the source-check loop (§7.7) folded in. Live: three Sonnet
// passes over the same sources, and each influence factor takes the majority answer
// (docs/scoring.md §0, decision 0004): "none" counts as an answer, and so does a rating that
// fails the source check; three different answers → the middle value. The cited source and
// quote come from a pass in the majority. The three passes take the place of the single §7.7
// re-ask (at most 3 calls per entity, spec §7.8). Code drops claims citing ids we didn't
// supply and checks every claim; what fails is stored Unverified. A failed or refused pass
// casts no vote; no successful pass → every rating Unverified. Mock: one pass over S0b.
// Structural zeros and the 2-factor minimum are scoring rules (src/lib/scoring), not here.

export const NO_ROUTE = "Find a sourced contact route first";
export const NO_RATING = "No sourced rating";
// Adaptive thinking counts against max_tokens, so leave room beyond the JSON (a pass uses about
// 1k output tokens at medium effort). Kept moderate because the ledger reserves the worst case
// until the actual comes in: 8 entities × 3 passes in flight ≈ 24 × US$0.07 ≈ US$1.8, under
// the US$2.9 rating cap.
const MAX_TOKENS = 6000;
const FACTORS = ["authority", "budget", "access", "recent"] as const;
/** Live passes per entity (decision 0004). Each pass writes its own cost-ledger estimate. */
export const RATE_PASSES = 3;

/**
 * Majority over the passes' answers (null = "none"). No majority → the middle value, with
 * "none" ordered below 0; with two different answers, the lower one.
 */
export function vote(answers: (Rating03 | null)[]): Rating03 | null {
  if (!answers.length) return null;
  const count = new Map<Rating03 | null, number>();
  for (const a of answers) count.set(a, (count.get(a) ?? 0) + 1);
  const [top, n] = [...count].sort((a, b) => b[1] - a[1])[0];
  if (n > answers.length / 2) return top;
  const sorted = [...answers].sort((a, b) => (a ?? -1) - (b ?? -1));
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export interface RateSource extends CheckSource {
  label: string;
  url: string | null;
  title: string;
  excerptLang: string;
}

export interface RateEntity {
  key: string;
  name: string;
  nameZh: string | null;
  category: string;
  whyRelevant: string;
  isChina: boolean;
}

export interface FactDraft {
  field: FactField;
  value: string;
  rating: Rating03 | null;
  quote: string | null;
  sourceIds: string[];
  status: FactStatus;
}

export interface StatementDraft {
  rating: StatementRating;
  summary: string;
  quote: string;
  sourceId: string;
  statedAt: string | null;
}

export interface RateResult {
  facts: FactDraft[];
  statements: StatementDraft[];
  credibility: { sourceId: string; credibility: Credibility; reason: string }[];
  translations: { sourceId: string; text: string }[];
  /** Why claims were dropped or left Unverified (logged, shown on the progress page). */
  log: string[];
  model: string | null;
}

type Raw = RatingOutput;

const isInt = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
const isDate = (s: string | null) => s !== null && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Claims from one answer, with labels mapped to source ids. Unknown labels and bad ranges are dropped. */
function collect(raw: Raw, entity: RateEntity, byLabel: Map<string, RateSource>, log: string[]) {
  const ids = (labels: string[], where: string) => {
    const known = labels.filter((l) => byLabel.has(l));
    for (const l of labels) if (!byLabel.has(l)) log.push(`${where}: dropped unknown source id ${l}`);
    return known.map((l) => byLabel.get(l)!.id);
  };
  const claims: { where: string; fact?: FactDraft; statement?: StatementDraft }[] = [];
  const fact = (field: FactField, c: { value: string; source_ids: string[]; quote: string } | null, rating: Rating03 | null = null) => {
    if (!c) return;
    const sourceIds = ids(c.source_ids, field);
    if (sourceIds.length === 0) return;
    claims.push({ where: field, fact: { field, value: c.value.trim(), rating, quote: c.quote, sourceIds, status: "sourced" } });
  };
  fact("role", raw.role);
  // Names only for sourced public officials (spec §16 Q6); China is organisation level only.
  if (entity.category === "gov" && !entity.isChina) fact("head", raw.head);
  fact("action", raw.next_step);
  for (const f of FACTORS) {
    const r = raw.ratings?.[f];
    if (!r || r.rating === "none") continue;
    fact(f, r, Number(r.rating) as Rating03);
  }
  for (const s of raw.statements) {
    if (!isInt(s.rating, -2, 2)) {
      log.push(`statement: dropped rating out of range (${s.rating})`);
      continue;
    }
    const [sourceId] = ids([s.source_id], "statement");
    if (!sourceId) continue;
    claims.push({
      where: "statement",
      statement: { rating: s.rating as StatementRating, summary: s.summary.trim(), quote: s.quote, sourceId, statedAt: isDate(s.stated_at) ? s.stated_at : null },
    });
  }
  return claims;
}

function check(claims: ReturnType<typeof collect>, sources: Map<string, RateSource>, runId: string | null) {
  const passed: typeof claims = [];
  const failed: { claim: (typeof claims)[number]; problems: string[] }[] = [];
  for (const c of claims) {
    const p = c.fact
      ? claimProblems(c.where, c.fact.sourceIds, c.fact.quote, sources, { runId })
      : claimProblems(c.where, [c.statement!.sourceId], c.statement!.quote, sources, { runId });
    if (p.length) failed.push({ claim: c, problems: p });
    else passed.push(c);
  }
  return { passed, failed };
}

export async function rateEntity(args: {
  entity: RateEntity;
  client: PromptClient;
  /** Accepted sources for this entity, labelled S1… per dossier. */
  sources: RateSource[];
  runId: string | null;
  ledger: LedgerContext;
  today: string;
}): Promise<RateResult> {
  const log: string[] = [];
  const byLabel = new Map(args.sources.map((s) => [s.label, s]));
  const byId = new Map(args.sources.map((s) => [s.id, s]));
  const live = claudeLive();
  let model: string | null = live ? MODELS.sonnet : "mock";

  const ask = async (): Promise<Raw | null> => {
    if (!live) return mockRate(args.entity, args.sources);
    const r = await callStructured({
      model: MODELS.sonnet,
      system: RATE_SYSTEM,
      user: ratePrompt({ client: args.client, entity: args.entity, sources: args.sources, today: args.today }),
      schema: RatingOutput,
      maxTokens: MAX_TOKENS,
      effort: "medium",
      ledger: args.ledger,
    });
    if (r.ok) return r.data;
    log.push(`Claude ${r.reason}: ${r.detail}`);
    return null;
  };

  const raws = args.sources.length
    ? (await Promise.all(Array.from({ length: live ? RATE_PASSES : 1 }, ask))).filter((x): x is Raw => x !== null)
    : [];
  const passes = raws.map((raw, i) => {
    const { passed, failed } = check(collect(raw, args.entity, byLabel, log), byId, args.runId);
    for (const f of failed) log.push(...f.problems.map((p) => `Unverified (pass ${i + 1}): ${p}`));
    return { raw, passed };
  });
  if (!passes.length) {
    model = null;
    log.push(args.sources.length ? "No valid rating pass: everything Unverified" : "No accepted sources: everything Unverified");
  }
  const factOf = (p: (typeof passes)[number], field: FactField) => p.passed.find((c) => c.fact?.field === field)?.fact ?? null;

  const byField = new Map<FactField, FactDraft>();
  for (const f of FACTORS) {
    const answers = passes.map((p) => factOf(p, f));
    const winner = vote(answers.map((a) => a?.rating ?? null));
    const pick = winner === null ? null : answers.find((a) => a?.rating === winner);
    if (pick) byField.set(f, pick);
    if (passes.length > 1 && new Set(answers.map((a) => a?.rating ?? "none")).size > 1) {
      log.push(`${f}: passes said ${answers.map((a) => a?.rating ?? "none").join(", ")} → ${winner ?? "none"}`);
    }
  }
  // Role, head and next step: the first pass that has a checked one.
  for (const field of ["role", "head", "action"] as const) {
    const hit = passes.map((p) => factOf(p, field)).find((x) => x !== null);
    if (hit) byField.set(field, hit);
  }
  // Statements, credibility and translations from one pass only, so nothing counts three times.
  const main = passes.find((p) => p.passed.some((c) => c.statement)) ?? passes[0];
  const raw = main?.raw ?? null;
  const passed = main?.passed ?? [];

  // One fact per field; missing ones are stored Unverified so screens can say "based on 3 of 5".
  const facts: FactDraft[] = [];
  const unverified = (field: FactField, value: string): FactDraft => ({ field, value, rating: null, quote: null, sourceIds: [], status: "unverified" });
  facts.push(byField.get("role") ?? unverified("role", args.entity.whyRelevant || args.entity.name));
  if (byField.has("head")) facts.push(byField.get("head")!);
  if (args.entity.category !== "evt") for (const f of FACTORS) facts.push(byField.get(f) ?? unverified(f, NO_RATING));
  facts.push(byField.get("action") ?? unverified("action", NO_ROUTE));

  const statements = passed.flatMap((c) => (c.statement ? [c.statement] : []));
  const usedIds = new Set([...facts.flatMap((f) => f.sourceIds), ...statements.map((s) => s.sourceId)]);
  const credibility = (raw?.credibility ?? []).flatMap((c) => {
    const s = byLabel.get(c.source_id);
    return s && usedIds.has(s.id) && isInt(c.credibility, 1, 6)
      ? [{ sourceId: s.id, credibility: c.credibility as Credibility, reason: c.reason.trim() }]
      : [];
  });
  const translations = (raw?.translations ?? []).flatMap((t) => {
    const s = byLabel.get(t.source_id);
    return s && s.excerptLang !== "en" && t.text.trim() ? [{ sourceId: s.id, text: t.text.trim() }] : [];
  });
  return { facts, statements, credibility, translations, log, model };
}
