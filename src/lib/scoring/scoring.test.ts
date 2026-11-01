// One example per section of docs/scoring.md (spec §17).
import { describe, expect, it } from "vitest";
import type { Banded, Brief, Edge, Fact, MarketCheck, Rating03, Source, SupportResult, SupportStatement, TimedEvent } from "@/lib/types";
import { briefStatus } from "./brief-status";
import { centralityRating, influenceFor, influenceScore } from "./influence";
import { dataConfidence, entryReadiness, oppositionIndex, stakeholderConfidence, windowToAct, type Scored } from "./metrics";
import { contactFirst, quadrant, resistant } from "./ranking";
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
    const facts = [fact("x", "authority", 3), fact("x", "access", 2), fact("x", "budget", 3, { status: "unverified", sourceIds: [] })];
    expect(influenceFor("x", facts, [])?.basedOn).toEqual({ rated: 3, of: 5 });
  });
  it("decision 0004: fewer than 2 sourced factors → no score (no more \"Low 0\")", () => {
    expect(influenceFor("x", [fact("x", "authority", 0)], [edge("x", "y")], "leg")).toBeNull();
  });
  it("decision 0004: ind/cap/leg get authority and budget 0 by category rule; sourced ratings win", () => {
    const facts = [fact("x", "access", 1), fact("x", "recent", 2), fact("x", "budget", 1)];
    expect(influenceFor("x", facts, [], "ind")?.basedOn).toEqual({ rated: 5, of: 5 });
    expect(influenceFor("x", facts, [], "gov")?.basedOn).toEqual({ rated: 4, of: 5 });
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

// ─── §4–§7 ───────────────────────────────────────────────────────────────────

function band(score: number, half = 5): Banded {
  return { score, low: Math.max(0, score - half), high: Math.min(100, score + half), level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low", basedOn: { rated: 5, of: 5 } };
}
function sup(score: number): SupportResult {
  return { kind: "known", score, stance: score >= 20 ? "supportive" : score <= -20 ? "resistant" : "neutral", basedOn: 1 };
}
const UNKNOWN: SupportResult = { kind: "unknown" };
const sc = (id: string, infl: number | null, support: SupportResult): Scored => ({ id, influence: infl === null ? null : band(infl), support });

describe("§4.1 opposition index", () => {
  it("resistant influence ÷ known influence, with range and based on N of M", () => {
    const scored = [sc("a", 80, sup(-40)), sc("b", 60, sup(30)), sc("c", 60, sup(0)), sc("u", 90, UNKNOWN)];
    const r = oppositionIndex(scored);
    expect(r?.value).toBeCloseTo(80 / 200);
    expect(r?.low).toBeCloseTo(75 / (75 + 130));
    expect(r?.high).toBeCloseTo(85 / (85 + 110));
    expect(r?.level).toBe("Medium");
    expect(r?.basedOn).toEqual({ known: 3, of: 4 });
  });
  it("levels: Low < 20%, High > 40%; nobody known → null", () => {
    expect(oppositionIndex([sc("a", 10, sup(-40)), sc("b", 90, sup(30))])?.level).toBe("Low");
    expect(oppositionIndex([sc("a", 90, sup(-40)), sc("b", 10, sup(30))])?.level).toBe("High");
    expect(oppositionIndex([sc("u", 90, UNKNOWN)])).toBeNull();
  });
});

describe("§4.2 entry readiness", () => {
  const check = (rating: Rating03, status: MarketCheck["status"] = "sourced"): MarketCheck => ({ rating, quote: "q", sourceIds: status === "sourced" ? ["S1"] : [], status });
  it("averages the three checks; support share ≥ 50% → 3", () => {
    const scored = [sc("a", 80, sup(40)), sc("b", 40, sup(-30))];
    const r = entryReadiness({ money: check(2), licence: check(1) }, scored);
    expect(r?.checks).toEqual({ money: 2, licence: 1, support: 3 });
    expect(r?.score).toBe(67);
    expect(r?.level).toBe("High");
  });
  it("unsourced checks don't count and are reported", () => {
    const r = entryReadiness({ money: check(3, "unverified"), licence: null }, [sc("a", 60, sup(-30)), sc("b", 40, sup(40))]);
    expect(r).toMatchObject({ score: 67, checks: { money: null, licence: null, support: 2 }, basedOn: { rated: 1, of: 3 } });
  });
  it("nothing rated → null", () => {
    expect(entryReadiness({ money: null, licence: null }, [])).toBeNull();
  });
});

describe("§4.3 window to act", () => {
  const ev = (id: string, date: string | null, over: Partial<TimedEvent> = {}): TimedEvent => ({ id, dossierId: "d", title: id, kind: "committee_review", date, stakeholderIds: [], sourceIds: ["S1"], status: "sourced", relevantToGoal: true, createdAt: T0, ...over });
  it("days to the next sourced, goal-related deadline", () => {
    const r = windowToAct([ev("late", "2026-12-01"), ev("next", "2026-11-15"), ev("past", "2026-10-01")], NOW);
    expect(r).toEqual({ found: true, days: 14, eventId: "next", title: "next", date: "2026-11-15" });
  });
  it("unsourced, unrelated or plain events don't count → No sourced deadline found", () => {
    const r = windowToAct([ev("a", "2026-11-05", { status: "unverified", sourceIds: [] }), ev("b", "2026-11-05", { relevantToGoal: false }), ev("c", "2026-11-05", { kind: "event" }), ev("d", null)], NOW);
    expect(r).toEqual({ found: false, text: "No sourced deadline found" });
  });
});

describe("§4.4 data confidence", () => {
  const gov = source("g", { url: "https://www.mnd.gov.tw/a", reliability: "A", credibility: 2 });
  const news = source("n", { url: "https://focustaiwan.tw/b", reliability: "C", credibility: 3 });
  const news2 = source("n2", { url: "https://focustaiwan.tw/c", reliability: "C", credibility: 3 });
  it("share of stakeholders with 2+ independent sources incl. one B2 or better", () => {
    expect(dataConfidence([[gov, news], [gov, news], [news]], 126)).toEqual({ level: "Medium", sourceCount: 126, qualifying: 2, of: 3 });
    expect(dataConfidence([[gov, news]], 10).level).toBe("High");
    expect(dataConfidence([[news, news2], [gov]], 10).level).toBe("Low");
  });
  it("per stakeholder: High needs 5 factors; Low with one source or 3+ missing", () => {
    expect(stakeholderConfidence([gov, news], band(80))).toBe("High");
    expect(stakeholderConfidence([gov, news], { ...band(80), basedOn: { rated: 4, of: 5 } })).toBe("Medium");
    expect(stakeholderConfidence([gov], band(80))).toBe("Low");
    expect(stakeholderConfidence([gov, news], { ...band(80), basedOn: { rated: 2, of: 5 } })).toBe("Low");
  });
});

describe("§5 contact-first three and quadrants", () => {
  it("ranks influence ≥ 50 with known support > −20; warm path adds 15", () => {
    const scored = [sc("a", 90, sup(10)), sc("b", 80, sup(40)), sc("c", 70, sup(0)), sc("d", 60, sup(30))];
    expect(contactFirst(scored).map((p) => p.stakeholderId)).toEqual(["a", "b", "c"]);
    const warm = contactFirst(scored, { warmPathIds: new Set(["d"]) });
    expect(warm.map((p) => p.stakeholderId)).toEqual(["a", "b", "d"]);
    expect(warm[2]).toMatchObject({ rankScore: 75, warmPath: true });
  });
  it("never picks blockers or Unknown; fills from Allies to grow", () => {
    const scored = [sc("block", 95, sup(-30)), sc("unk", 95, UNKNOWN), sc("a", 70, sup(20)), sc("ally1", 45, sup(30)), sc("ally2", 30, sup(5)), sc("mon", 40, sup(-5))];
    const picks = contactFirst(scored);
    expect(picks.map((p) => p.stakeholderId)).toEqual(["a", "ally1", "ally2"]);
    expect(picks.map((p) => p.fromAllies)).toEqual([false, true, true]);
    expect(resistant(scored).map((s) => s.id)).toEqual(["block"]);
  });
  it("ties go to the stakeholder with more sources", () => {
    const picks = contactFirst([sc("few", 70, sup(0)), sc("many", 70, sup(0))], { sourceCounts: new Map([["few", 1], ["many", 4]]) });
    expect(picks[0].stakeholderId).toBe("many");
  });
  it("Power Matrix quadrants; Unknown sits beside the matrix", () => {
    expect(quadrant(sc("a", 50, sup(0)))).toBe("champions");
    expect(quadrant(sc("a", 50, sup(-1)))).toBe("blockers");
    expect(quadrant(sc("a", 49, sup(0)))).toBe("allies");
    expect(quadrant(sc("a", 49, sup(-1)))).toBe("monitor");
    expect(quadrant(sc("a", 80, UNKNOWN))).toBeNull();
  });
});

describe("§7 brief Out of date", () => {
  const brief: Brief = {
    id: "b1", dossierId: "d", version: 1,
    metrics: { entryReadiness: null, opposition: null, window: { found: false, text: "No sourced deadline found" }, dataConfidence: { level: "Low", sourceCount: 0, qualifying: 0, of: 0 } },
    rationale: [{ text: "t", sourceIds: ["S1"] }], judgments: [], path: [], reduceOpposition: [],
    plan: { prep: [], contact: [], event: [], followUp: [] }, summary: [], risks: [], meet: [], needs: [], changesNote: [],
    inputsAt: "2026-10-20T00:00:00Z", createdAt: "2026-10-20T00:00:00Z",
  };
  const base = { debriefs: [], stakeholders: [], facts: [], statements: [], sources: [source("S1", { verifiedAt: "2026-10-15" })] };
  it("fresh when nothing changed", () => {
    expect(briefStatus(brief, base, NOW)).toEqual({ outOfDate: false, reasons: [] });
  });
  it("a newer debrief, a changed stakeholder or a cited source older than 90 days → Out of date", () => {
    const debrief = { id: "x", trackerItemId: "t", stakeholderId: "s", meetingAt: null, reporter: null, overall: "positive" as const, nextStepAgreed: true, notes: null, supportBefore: 10, supportAfter: 40, stageBefore: "contacted" as const, stageAfter: "met" as const, addedNextStep: null, playbookOutcomeId: null, createdAt: "2026-10-30T00:00:00Z" };
    expect(briefStatus(brief, { ...base, debriefs: [debrief] }, NOW).reasons).toHaveLength(1);
    expect(briefStatus(brief, { ...base, facts: [fact("s", "authority", 2, { createdAt: "2026-10-25T00:00:00Z" })] }, NOW).outOfDate).toBe(true);
    const old = briefStatus(brief, { ...base, sources: [source("S1", { verifiedAt: "2026-07-01" })] }, NOW);
    expect(old.reasons).toEqual(["1 cited source was verified more than 90 days ago."]);
  });
});
