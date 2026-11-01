import type { CostProvider } from "@/lib/types";
import { CAPS } from "./prices";

// Cost ledger (spec §8; risky change: paid APIs). Before every paid call: write the estimate;
// if spent + estimate would pass the run's cap, refuse and don't call. After the call: record
// the actual. "Spent" counts the actual where known, else the estimate (so a crash mid-call
// still counts against the cap).

export interface LedgerRow {
  runId: string | null;
  dossierId: string;
  provider: CostProvider;
  purpose: string;
  estimatedUsd: number;
  model: string | null;
}

export interface LedgerStore {
  /** Sum over the run of coalesce(actual, estimate) for one provider. */
  spentUsd(runId: string, provider: CostProvider): Promise<number>;
  insert(row: LedgerRow): Promise<string>;
  settle(id: string, actual: { actualUsd: number; tokensIn?: number | null; tokensOut?: number | null }): Promise<void>;
}

export type Reservation = { ok: true; id: string } | { ok: false; reason: string };

/** The cap that applies to one call. Claude calls other than the brief leave the brief reserve. */
export function capFor(provider: CostProvider, purpose: string): number {
  if (provider === "parallel") return CAPS.parallelUsd;
  return purpose === "brief" ? CAPS.claudeUsd : CAPS.claudeUsd - CAPS.briefReserveUsd;
}

/**
 * Check the cap and write the estimate. Calls outside a research run (RE-BRIEF, documents)
 * have no run cap here; their daily counters limit them.
 */
export async function reserve(store: LedgerStore, row: LedgerRow): Promise<Reservation> {
  if (!Number.isFinite(row.estimatedUsd) || row.estimatedUsd < 0) return { ok: false, reason: "Bad cost estimate" };
  if (row.runId) {
    const spent = await store.spentUsd(row.runId, row.provider);
    const cap = capFor(row.provider, row.purpose);
    if (spent + row.estimatedUsd > cap + 1e-9) {
      return {
        ok: false,
        reason: `${row.provider === "parallel" ? "Parallel" : "Claude"} budget for this research is used up (US$${spent.toFixed(2)} of US$${cap.toFixed(2)})`,
      };
    }
  }
  return { ok: true, id: await store.insert(row) };
}

/** How many runs of one price still fit under the cap (used to size the enrich group). */
export async function affordableRuns(store: LedgerStore, runId: string, provider: CostProvider, purpose: string, unitUsd: number): Promise<number> {
  const room = capFor(provider, purpose) - (await store.spentUsd(runId, provider));
  return Math.max(0, Math.floor((room + 1e-9) / unitUsd));
}
