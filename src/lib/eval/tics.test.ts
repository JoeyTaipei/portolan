// EVAL-2: the free writing checks (plan S24).
import { describe, expect, it } from "vitest";
import { ALL_SAMPLES } from "@/lib/sample/reader";
import { briefSentences, sharedTrigramRate, ticReport } from "./tics";

const one = (s: string) => ticReport([s]).counts;

describe("tic checks", () => {
  it("flags banned words and passes plain ones", () => {
    expect(one("We delve into the evolving landscape and leverage a robust ecosystem.").banned).toBe(6);
    expect(one("Foreign firms cannot bid, so partner with a Taiwanese integrator.").banned).toBe(0);
  });

  it("flags 'not X but Y' and 'it's not X, it's Y'", () => {
    expect(one("It's not a product, it's a platform.").notXButY).toBe(1);
    expect(one("This is not just a tender but a programme.").notXButY).toBe(1);
    expect(one("The Army will not buy foreign drones.").notXButY).toBe(0);
  });

  it("flags summary closers, stacked hedges, em dashes and empty intensifiers", () => {
    expect(ticReport(["The ministry buys drones.", "Overall, the market is open."]).counts.summaryClosers).toBe(1);
    expect(one("This may potentially affect the bid.").stackedHedges).toBe(1);
    expect(one("This may affect the bid.").stackedHedges).toBe(0);
    expect(one("The budget grew — fast.").emDashes).toBe(1);
    expect(one("Significant funding and very large demand.").intensifiers).toBe(2);
    expect(one("NT$210bn for 2026.").intensifiers).toBe(0);
  });

  it("measures sentence length and sameness across summaries", () => {
    const r = ticReport(["One two three.", "One two three four five six seven."]);
    expect(r.sentenceLength).toEqual({ mean: 5, sd: 2 });
    expect(sharedTrigramRate(["the army buys drones", "the army buys boats"])).toBeGreaterThan(0);
    expect(sharedTrigramRate(["the army buys drones", "poland signs contracts today"])).toBe(0);
  });

  it("the hand-written sample briefs have no banned words and no em dashes", () => {
    for (const d of ALL_SAMPLES) {
      const r = ticReport(briefSentences(d.briefs[0]));
      expect([d.id, r.counts.banned, r.counts.emDashes, r.hits.filter((h) => /—/.test(h) || BANNED_HIT.test(h))]).toEqual([d.id, 0, 0, []]);
    }
  });
});

const BANNED_HIT = /delv|landscape|navigat|leverag|robust|seamless|pivotal|crucial|dynamic|evolving|ecosystem|tapestry|realm|foster|unlock|game-changer|worth noting|important to note/i;
