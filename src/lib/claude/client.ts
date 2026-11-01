import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { reserve, type LedgerStore } from "@/lib/limits/ledger";
import { claudeActualUsd, claudeEstimateUsd, type ClaudeModel } from "@/lib/limits/prices";

// The only place the Anthropic key is read. Paid calls happen only in live research mode
// (claudeLive below); in mock mode callers use ./mock and this module refuses to call out.
// Every call: count input tokens → write the worst-case estimate to cost_ledger (refused over
// the cap) → call with structured output → record the actual usage.

export function claudeLive(): boolean {
  return process.env.RESEARCH_MODE === "live";
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Claude isn't configured on this server.");
  // The SDK retries 429/5xx/connection errors twice with exponential backoff (spec §7.3).
  client = new Anthropic({ apiKey, maxRetries: 2, timeout: 240_000 });
  return client;
}

export interface LedgerContext {
  store: LedgerStore;
  runId: string | null;
  dossierId: string;
  purpose: string;
}

export type StructuredResult<T> =
  | { ok: true; data: T; model: ClaudeModel }
  | { ok: false; reason: "budget" | "refusal" | "invalid" | "error"; detail: string };

export async function callStructured<S extends z.ZodType>(args: {
  model: ClaudeModel;
  system: string;
  user: string;
  schema: S;
  maxTokens: number;
  effort: "low" | "medium" | "high";
  ledger: LedgerContext;
}): Promise<StructuredResult<z.infer<S>>> {
  if (!claudeLive()) return { ok: false, reason: "error", detail: "Claude is off in mock mode" };
  const api = anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: args.user }];

  let inputTokens: number;
  try {
    inputTokens = (await api.messages.countTokens({ model: args.model, system: args.system, messages })).input_tokens;
  } catch (err) {
    return { ok: false, reason: "error", detail: `Token count failed: ${(err as Error).message}` };
  }
  const r = await reserve(args.ledger.store, {
    runId: args.ledger.runId,
    dossierId: args.ledger.dossierId,
    provider: "anthropic",
    purpose: args.ledger.purpose,
    estimatedUsd: claudeEstimateUsd(args.model, inputTokens, args.maxTokens),
    model: args.model,
  });
  if (!r.ok) return { ok: false, reason: "budget", detail: r.reason };

  try {
    const res = await api.messages.parse({
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      messages,
      output_config: { effort: args.effort, format: zodOutputFormat(args.schema) },
    });
    await args.ledger.store.settle(r.id, {
      actualUsd: claudeActualUsd(args.model, res.usage.input_tokens, res.usage.output_tokens),
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
    });
    if (res.stop_reason === "refusal") {
      return { ok: false, reason: "refusal", detail: res.stop_details?.category ?? "refused" };
    }
    if (res.stop_reason === "max_tokens" || res.parsed_output == null) {
      return { ok: false, reason: "invalid", detail: `No valid output (stop_reason ${res.stop_reason})` };
    }
    return { ok: true, data: res.parsed_output as z.infer<S>, model: args.model };
  } catch (err) {
    // The estimate stays in the ledger as spent: a failed call may still have been billed.
    const invalid = err instanceof Anthropic.APIError ? false : true;
    return { ok: false, reason: invalid ? "invalid" : "error", detail: (err as Error).message.slice(0, 300) };
  }
}
