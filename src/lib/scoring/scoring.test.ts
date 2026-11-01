// One example per section of docs/scoring.md (spec §17).
import { describe, expect, it } from "vitest";
import type { Edge, Fact, Rating03, Source, SupportStatement } from "@/lib/types";
import { centralityRating, influenceFor, influenceScore } from "./influence";
import { recencyFactor, sourceWeight } from "./source-weight";
import { debriefRating, supportFor } from "./support";

const NOW = new Date("2026-11-01T00:00:00Z");
const T0 = "2026-10-01T00:00:00Z";

function source(id: string, over: Partial<Source> = {}): Source {
  return {
    id,
    dossierId: "d",
    label: id,
    url: `https://example.gov.tw/${id}`,
    title: id,
    publisher: null,
    sourceType: "government_site",
    excerpt: "excerpt",
    excerptLang: "en",
    translation: null,
    reliability: "B",
    credibility: 2,
    credibilityReason: null,
    publishedAt: "2026-09-01",
    verifiedAt: "2026-10-30",
    origin: "parallel_basis",
    accepted: true,
    rejectReason: null,
    runId: null,
    createdAt: T0,
    ...over,
  };
}

function fact(stakeholderId: string, field: Fact["field"], rating: Rating03, over: Partial<Fact> = {}): Fact {
  return {
    id: `${stakeholderId}-${field}`,
    stakeholderId,
    runId: null,
    field,
    value: null,
    rating,
    quote: "q",
    sourceIds: ["S1"],
    status: "sourced",
    model: null,
    createdAt: T0,
    ...over,
  };
}

function edge(a: string, b: string, over: Partial<Edge> = {}): Edge {
  return { id: `${a}-${b}`, dossierId: "d", aId: a, bId: b, relation: "works with", sourceIds: ["S1"], status: "sourced", createdAt: T0, ...over };
}

function statement(stakeholderId: string, sourceId: string, rating: SupportStatement["rating"], over: Partial<SupportStatement> = {}): SupportStatement {
  return { id: `${stakeholderId}-${sourceId}`, stakeholderId, runId: null, debriefId: null, rating, summary: "s", quote: null, sourceId, statedAt: null, createdAt: T0, ...over };
}

describe("§1 source weight", () => {
  it("multiplies reliability × credibility × recency", () => {
    expect(sourceWeight(source("a", { reliability: "A", credibility: 1 }), NOW)).toBeCloseTo(1);
    expect(sourceWeight(source("b", { reliability: "B", credibility: 2 }), NOW)).toBeCloseTo(0.64);
    expect(sourceWeight(source("c", { reliability: "F", credibility: 6 }), NOW)).toBeCloseTo(0.09);
  });
  it("discounts older sources", () => {
    expect(recencyFactor("2026-01-01", NOW)).toBe(1);
    expect(recencyFactor("2025-03-01", NOW)).toBe(0.6);
    expect(recencyFactor("2023-01-01", NOW)).toBe(0.3);
    expect(recencyFactor(null, NOW)).toBe(0.3);
  });
});

describe("§2 influence", () => {
  it("all five factors rated → ±5", () => {
    const b = influenceScore({ authority: 3, budget: 2, access: 3, centrality: 2, recent: 1 });
    expect(b).toEqual({ score: 80, low: 75, high: 85, level: "High", basedOn: { rated: 5, of: 5 } });
  });
  it("two factors missing → ±15, capped at 100", () => {
    const b = influenceScore({ authority: 3, budget: null, access: 3, centrality: 2, recent: null });
    expect(b).toEqual({ score: 92, low: 77, high: 100, level: "High", basedOn: { rated: 3, of: 5 } });
  });
  it("nothing rated → no score", () => {
    expect(influenceScore({ authority: null, budget: null, access: null, centrality: null, recent: null })).toBeNull();
  });
  it("levels: High ≥ 70, Medium 40–69, Low < 40", () => {
    expect(influenceScore({ authority: 2, budget: 1, access: 2, centrality: 1, recent: 1 })?.level).toBe("Medium");
    expect(influenceScore({ authority: 1, budget: 0, access: 1, centrality: 0, recent: 0 })?.level).toBe("Low");
  });
  it("ignores unverified facts", () => {
    const facts = [fact("x", "authority", 3), fact("x", "budget", 3, { status: "unverified", sourceIds: [] })];
    expect(influenceFor("x", facts, [])?.basedOn).toEqual({ rated: 2, of: 5 });
  });
  it("no sourced Claude-rated factor → no score even with edges", () => {
    expect(influenceFor("x", [], [edge("x", "y")])).toBeNull();
  });
});

describe("§2.2 centrality buckets", () => {
  const ring = (n: number) => Array.from({ length: n }, (_, i) => edge("x", `n${i}`));
  it("0 → 0, 1–2 → 1, 3–5 → 2, 6+ → 3", () => {
    expect(centralityRating("x", [])).toBe(0);
    expect(centralityRating("x", ring(2))).toBe(1);
    expect(centralityRating("x", ring(3))).toBe(2);
    expect(centralityRating("x", ring(5))).toBe(2);
    expect(centralityRating("x", ring(6))).toBe(3);
  });
  it("counts distinct neighbours over sourced edges only", () => {
    const edges = [edge("x", "a"), edge("a", "x"), edge("x", "b", { status: "unverified", sourceIds: [] })];
    expect(centralityRating("x", edges)).toBe(1);
  });
});

describe("§3 support", () => {
  it("no statement → Unknown, not 0", () => {
    expect(supportFor("x", [], [source("S1")], NOW)).toEqual({ kind: "unknown" });
  });
  it("statements on rejected sources don't count", () => {
    const st = [statement("x", "S1", 2)];
    expect(supportFor("x", st, [source("S1", { accepted: false, rejectReason: "menu text" })], NOW)).toEqual({ kind: "unknown" });
  });
  it("weighted average × 50, with stance thresholds", () => {
    const sources = [source("S1", { reliability: "A", credibility: 1 }), source("S2", { reliability: "B", credibility: 2 })];
    const r = supportFor("x", [statement("x", "S1", 1), statement("x", "S2", -1)], sources, NOW);
    // 50 × (1×1 − 0.64×1) ÷ 1.64 = 10.98 → 11 → neutral
    expect(r).toEqual({ kind: "known", score: 11, stance: "neutral", basedOn: 2 });
    expect(supportFor("x", [statement("x", "S1", 1)], sources, NOW)).toMatchObject({ score: 50, stance: "supportive" });
    expect(supportFor("x", [statement("x", "S1", -1)], sources, NOW)).toMatchObject({ score: -50, stance: "resistant" });
  });
});

describe("§3.1 debrief recalculation", () => {
  it("a debrief counts as A1 × 2 and support is recalculated", () => {
    const research = source("S1", { reliability: "B", credibility: 2 });
    const before = supportFor("x", [statement("x", "S1", 1)], [research], NOW);
    expect(before).toMatchObject({ score: 50 });

    const debriefSource = source("D1", { url: null, origin: "debrief", reliability: "A", credibility: 1, publishedAt: "2026-10-31", sourceType: "debrief" });
    const debrief = statement("x", "D1", debriefRating("positive"), { debriefId: "deb1" });
    const after = supportFor("x", [statement("x", "S1", 1), debrief], [research, debriefSource], NOW);
    // 50 × (0.64×1 + 2×2) ÷ (0.64 + 2) = 87.9 → 88
    expect(after).toEqual({ kind: "known", score: 88, stance: "supportive", basedOn: 2 });

    const negative = statement("x", "D1", debriefRating("negative"), { debriefId: "deb1" });
    // 50 × (0.64 − 4) ÷ 2.64 = −63.6 → −64
    expect(supportFor("x", [statement("x", "S1", 1), negative], [research, debriefSource], NOW)).toMatchObject({ score: -64, stance: "resistant" });
  });
  it("maps Positive / Neutral / Negative to +2 / 0 / −2", () => {
    expect([debriefRating("positive"), debriefRating("neutral"), debriefRating("negative")]).toEqual([2, 0, -2]);
  });
});
