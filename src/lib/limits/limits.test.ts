import { describe, expect, it } from "vitest";
import type { CostProvider } from "@/lib/types";
import { LIMITS, MESSAGES, hashEmail, taipeiDay, useDossierAi, useResearch, type Bump } from "./counters";
import { reserve, type LedgerRow, type LedgerStore } from "./ledger";
import { CAPS, PARALLEL_PER_RUN } from "./prices";

/** In-memory bump_usage: add one only while under max. */
function memoryBump() {
  const counts = new Map<string, number>();
  const bump: Bump = async (day, scope, max) => {
    const k = `${day}|${scope}`;
    const c = counts.get(k) ?? 0;
    if (c >= max) return false;
    counts.set(k, c + 1);
    return true;
  };
  return { bump, counts };
}

function memoryLedger() {
  const rows: (LedgerRow & { id: string; actualUsd: number | null })[] = [];
  const store: LedgerStore = {
    async spentUsd(runId: string, provider: CostProvider) {
      return rows.filter((r) => r.runId === runId && r.provider === provider).reduce((s, r) => s + (r.actualUsd ?? r.estimatedUsd), 0);
    },
    async insert(row) {
      const id = `l${rows.length + 1}`;
      rows.push({ ...row, id, actualUsd: null });
      return id;
    },
    async settle(id, a) {
      rows.find((r) => r.id === id)!.actualUsd = a.actualUsd;
    },
  };
  return { store, rows };
}

const NOW = new Date("2026-11-01T03:00:00Z");

describe("daily research limits (spec §8)", () => {
  it("allows two per email per day, then the friendly message", async () => {
    const { bump } = memoryBump();
    const h = hashEmail("Founder@Example.com");
    expect(await useResearch(bump, h, NOW)).toEqual({ ok: true });
    expect(await useResearch(bump, hashEmail(" founder@example.com "), NOW)).toEqual({ ok: true });
    expect(await useResearch(bump, h, NOW)).toEqual({ ok: false, error: MESSAGES.email });
    expect(await useResearch(bump, hashEmail("other@example.com"), NOW)).toEqual({ ok: true });
  });

  it("caps the site at 30 per day", async () => {
    const { bump } = memoryBump();
    for (let i = 0; i < LIMITS.researchSiteWide; i++) expect((await useResearch(bump, hashEmail(`u${i}@x.com`), NOW)).ok).toBe(true);
    expect(await useResearch(bump, hashEmail("late@x.com"), NOW)).toEqual({ ok: false, error: MESSAGES.site });
  });

  it("starts a new day at 00:00 UTC+8", async () => {
    expect(taipeiDay(new Date("2026-11-01T15:59:59Z"))).toBe("2026-11-01");
    expect(taipeiDay(new Date("2026-11-01T16:00:00Z"))).toBe("2026-11-02");
    const { bump } = memoryBump();
    const h = hashEmail("a@b.com");
    await useResearch(bump, h, new Date("2026-11-01T15:00:00Z"));
    await useResearch(bump, h, new Date("2026-11-01T15:30:00Z"));
    expect((await useResearch(bump, h, new Date("2026-11-01T15:59:00Z"))).ok).toBe(false);
    expect((await useResearch(bump, h, new Date("2026-11-01T16:00:00Z"))).ok).toBe(true);
  });

  it("shares one AI counter per dossier, 10 per day", async () => {
    const { bump } = memoryBump();
    for (let i = 0; i < LIMITS.dossierAi; i++) expect((await useDossierAi(bump, "d1", NOW)).ok).toBe(true);
    expect(await useDossierAi(bump, "d1", NOW)).toEqual({ ok: false, error: MESSAGES.dossierAi });
    expect((await useDossierAi(bump, "d2", NOW)).ok).toBe(true);
  });
});

describe("cost ledger cap (spec §8)", () => {
  const row = (over: Partial<LedgerRow>): LedgerRow => ({
    runId: "run1",
    dossierId: "d1",
    provider: "parallel",
    purpose: "enrich",
    estimatedUsd: PARALLEL_PER_RUN.core,
    model: "core",
    ...over,
  });

  it("blocks the call when spent + estimate passes the Parallel cap", async () => {
    const { store, rows } = memoryLedger();
    expect((await reserve(store, row({ purpose: "discover", estimatedUsd: PARALLEL_PER_RUN.ultra }))).ok).toBe(true);
    expect((await reserve(store, row({ estimatedUsd: 60 * PARALLEL_PER_RUN.core }))).ok).toBe(true); // 0.30 + 1.50
    const over = await reserve(store, row({ estimatedUsd: 0.25 }));
    expect(over.ok).toBe(false);
    expect(rows).toHaveLength(2); // the refused call wrote nothing
  });

  it("counts actuals once known, and keeps the brief reserve from ratings", async () => {
    const { store } = memoryLedger();
    const cap = CAPS.claudeUsd - CAPS.briefReserveUsd;
    const r = await reserve(store, row({ provider: "anthropic", purpose: "rate", estimatedUsd: cap, model: "claude-sonnet-5-5" }));
    expect(r.ok).toBe(true);
    expect((await reserve(store, row({ provider: "anthropic", purpose: "rate", estimatedUsd: 0.05 }))).ok).toBe(false);
    // The brief may still use the reserve.
    expect((await reserve(store, row({ provider: "anthropic", purpose: "brief", estimatedUsd: 0.5 }))).ok).toBe(true);
    // After the actual comes in lower, room opens up again.
    if (r.ok) await store.settle(r.id, { actualUsd: 1 });
    expect((await reserve(store, row({ provider: "anthropic", purpose: "rate", estimatedUsd: 0.05 }))).ok).toBe(true);
  });
});
