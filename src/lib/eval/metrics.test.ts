import { describe, expect, it } from "vitest";
import { sampleDossier } from "@/lib/sample/reader";
import { claimAgreement, coverage, ranking, spearman, type Expected } from "./metrics";

const ex = (label: string, ...names: string[]): Expected => ({ label, names: [label, ...names] });

describe("spearman", () => {
  it("is 1 for the same order, −1 for the reverse, and handles ties", () => {
    expect(spearman([3, 2, 1], [30, 20, 10])).toBeCloseTo(1);
    expect(spearman([3, 2, 1], [10, 20, 30])).toBeCloseTo(-1);
    expect(spearman([4, 3, 2, 1], [9, 9, 1, 0])).toBeCloseTo(0.9487, 3);
    expect(spearman([2, 1], [1, 2])).toBeNull();
  });
});

describe("coverage", () => {
  const required = [ex("國防部"), ex("中華民國陸軍"), ex("中華民國海軍", "ROC Navy"), ex("中華民國空軍"), ex("NCSIST")];

  it("matches English, 中文 or short names", () => {
    expect(coverage(required, sampleDossier.stakeholders)).toMatchObject({ found: 5, total: 5, rate: 1, missing: [] });
  });

  it("drops when the armed services are missing from the map", () => {
    const withoutServices = sampleDossier.stakeholders.filter((s) => !["army", "navy", "af"].includes(s.id));
    expect(coverage(required, withoutServices)).toMatchObject({ found: 2, rate: 0.4, missing: ["中華民國陸軍", "中華民國海軍", "中華民國空軍"] });
  });

  it("doesn't count a parent ministry as its bureau", () => {
    expect(coverage([ex("Armaments Bureau")], [{ id: "mnd", name: "Ministry of National Defense", nameZh: "國防部", short: null }]).found).toBe(0);
  });
});

describe("ranking", () => {
  const people = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, name: id.toUpperCase(), nameZh: null, short: null }));
  const influence = new Map<string, number | null>([["a", 90], ["b", 80], ["c", 70], ["d", 60], ["e", 50], ["f", null]]);

  it("counts the expert's top 3 in our top 5 and lists what isn't on the map", () => {
    const r = ranking([ex("F"), ex("A"), ex("B"), ex("Z")], people, influence);
    expect(r.top3In5).toBe(2);
    expect(r.notOnMap).toEqual(["Z"]);
    expect(r.compared).toBe(3);
    expect(r.ourTop5).toEqual(["A", "B", "C", "D", "E"]);
  });
});

describe("claimAgreement", () => {
  it("only counts claims the judge has labelled", () => {
    expect(
      claimAgreement([
        { text: "x", sourceId: "s1", human: "supports", judge: "supports" },
        { text: "y", sourceId: "s2", human: "partial", judge: "supports" },
        { text: "z", sourceId: "s3", human: "not" },
      ]),
    ).toEqual({ judged: 2, agree: 1, rate: 0.5 });
  });
});
