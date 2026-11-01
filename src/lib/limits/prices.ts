// Prices and caps for paid calls (spec §8). Change prices here only.
// Parallel: docs.parallel.ai pricing (Task API, per run). Claude: claude-api skill model table
// (US$ per million tokens, cached 2026-10-06).

export const PARALLEL_PER_RUN = { ultra: 0.3, core: 0.025 } as const;

export const MODELS = {
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
} as const;

export type ClaudeModel = (typeof MODELS)[keyof typeof MODELS];

export const CLAUDE_PER_MTOK: Record<ClaudeModel, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

/** Per research run. */
export const CAPS = {
  parallelUsd: 2,
  claudeUsd: 3.5,
  /** Kept back from the Claude cap so the brief is still written when ratings run out. */
  briefReserveUsd: 0.6,
} as const;

/** Worst case for a Claude call: all input tokens plus the full max_tokens of output. */
export function claudeEstimateUsd(model: ClaudeModel, inputTokens: number, maxTokens: number): number {
  const p = CLAUDE_PER_MTOK[model];
  return (inputTokens * p.input + maxTokens * p.output) / 1_000_000;
}

export function claudeActualUsd(model: ClaudeModel, inputTokens: number, outputTokens: number): number {
  const p = CLAUDE_PER_MTOK[model];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
