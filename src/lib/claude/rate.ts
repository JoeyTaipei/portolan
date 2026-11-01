import "server-only";
import { claimProblems, type CheckSource } from "@/lib/checks/source-check";
import { MODELS } from "@/lib/limits/prices";
import type { Credibility, FactField, FactStatus, Rating03, StatementRating } from "@/lib/types";
import { callStructured, claudeLive, type LedgerContext } from "./client";
import { mockRate } from "./mock";
import { RATE_SYSTEM, ratePrompt, type PromptClient } from "./prompts";
import { RatingOutput } from "./schemas";

// The `rate` step (spec §7.2) with the source-check loop (§7.7) folded in: one Sonnet call per
// entity; code drops claims citing ids we didn't supply (§7.8), checks every remaining claim,
// sends failures back once with the reasons, and stores what still fails as Unverified.
// Refusal or invalid output (after at most 2 retries) → every rating for the entity Unverified.

export const NO_ROUTE = "Find a sourced contact route first";
export const NO_RATING = "No sourced rating";
const MAX_TOKENS = 8000;
const RATED: FactField[] = ["authority", "budget", "access", "recent"];

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
  // China is organisation level only: never a named individual.
  if (!entity.isChina) fact("head", raw.head);
  fact("action", raw.next_step);
  const seen = new Set<string>();
  for (const r of raw.ratings) {
    if (!isInt(r.rating, 0, 3)) {
      log.push(`${r.factor}: dropped rating out of range (${r.rating})`);
      continue;
    }
    if (seen.has(r.factor)) continue;
    seen.add(r.factor);
    fact(r.factor, r, r.rating as Rating03);
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

  const ask = async (failures?: string[]): Promise<Raw | null> => {
    if (!live) return mockRate(args.entity, args.sources);
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await callStructured({
        model: MODELS.sonnet,
        system: RATE_SYSTEM,
        user: ratePrompt({ client: args.client, entity: args.entity, sources: args.sources, today: args.today, failures }),
        schema: RatingOutput,
        maxTokens: MAX_TOKENS,
        effort: "medium",
        ledger: args.ledger,
      });
      if (r.ok) return r.data;
      log.push(`Claude ${r.reason}: ${r.detail}`);
      if (r.reason === "budget") return null;
    }
    return null;
  };

  const passed: ReturnType<typeof collect> = [];
  let raw = args.sources.length ? await ask() : null;
  if (raw) {
    const first = check(collect(raw, args.entity, byLabel, log), byId, args.runId);
    passed.push(...first.passed);
    // §7.7: failures go back to Claude once with the reasons (live only; the mock is curated).
    if (first.failed.length && live) {
      raw = await ask(first.failed.flatMap((f) => f.problems));
      if (raw) {
        const again = check(collect(raw, args.entity, byLabel, log), byId, args.runId);
        const key = (c: (typeof passed)[number]) => c.fact?.field ?? `st:${c.statement!.sourceId}:${c.statement!.quote}`;
        const have = new Set(passed.map(key));
        passed.push(...again.passed.filter((c) => !have.has(key(c))));
        for (const f of again.failed) log.push(...f.problems.map((p) => `Unverified after retry: ${p}`));
      }
    } else {
      for (const f of first.failed) log.push(...f.problems.map((p) => `Unverified: ${p}`));
    }
  } else {
    model = null;
    if (args.sources.length === 0) log.push("No accepted sources: everything Unverified");
  }

  // One fact per field; missing ones are stored Unverified so screens can say "based on 3 of 5".
  const facts: FactDraft[] = [];
  const byField = new Map<FactField, FactDraft>();
  for (const c of passed) if (c.fact && !byField.has(c.fact.field)) byField.set(c.fact.field, c.fact);
  const unverified = (field: FactField, value: string): FactDraft => ({ field, value, rating: null, quote: null, sourceIds: [], status: "unverified" });
  facts.push(byField.get("role") ?? unverified("role", args.entity.whyRelevant || args.entity.name));
  if (byField.has("head")) facts.push(byField.get("head")!);
  if (args.entity.category !== "evt") for (const f of RATED) facts.push(byField.get(f) ?? unverified(f, NO_RATING));
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
