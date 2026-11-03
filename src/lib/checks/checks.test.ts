import { describe, expect, it } from "vitest";
import { sampleDossier } from "@/lib/sample/reader";
import { preDisplay, SPEC_IN_REASON, suggestsSpecIn } from "./pre-display";
import { claimProblems, indexSources, type CheckSource } from "./source-check";

const src = (id: string, over: Partial<CheckSource> = {}): CheckSource => ({
  id,
  label: id.toUpperCase(),
  accepted: true,
  verifiedAt: "2026-10-30",
  excerpt: "警政署進行「無人機區域聯防反制系統採購案」招標公告，廠商資格限制只能由國內廠商參加。",
  origin: "parallel_basis",
  runId: "run1",
  ...over,
});

const sources = indexSources([
  src("s1"),
  src("s2", { verifiedAt: null }),
  src("s3", { accepted: false }),
  src("s4", { excerpt: "The Armaments Bureau plans to buy 48,750 drones by 2027.", runId: "run0" }),
  src("d1", { origin: "debrief", runId: null, excerpt: "Debrief: positive meeting" }),
]);

describe("source-check loop (spec §7.7)", () => {
  it("passes a sourced claim whose quote is in the excerpt (full-width and spacing normalised)", () => {
    expect(claimProblems("npa.authority", ["s1"], "警政署進行「無人機區域聯防反制系統採購案」 招標公告", sources)).toEqual([]);
  });

  it("fails an unsourced claim and an unknown or rejected source", () => {
    expect(claimProblems("x", [], null, sources)).toEqual(["x: no source"]);
    expect(claimProblems("x", ["s99"], null, sources)).toEqual(["x: unknown source s99"]);
    expect(claimProblems("x", ["s3"], null, sources)).toEqual(["x: cites rejected source S3"]);
  });

  it("fails a quote that isn't in any cited excerpt", () => {
    expect(claimProblems("x", ["s1"], "foreign firms are welcome to bid", sources)).toEqual([
      'x: quote not in any cited excerpt: "foreign firms are welcome to bid"',
    ]);
  });

  it("fails a source without a verified date", () => {
    expect(claimProblems("x", ["s2"], null, sources)).toEqual(["x: S2 has no verified date"]);
  });

  it("only counts this run's sources (and debriefs) when a run is given", () => {
    expect(claimProblems("x", ["s4"], null, sources, { runId: "run1" })).toEqual(["x: S4 is from another research run"]);
    expect(claimProblems("x", ["d1"], null, sources, { runId: "run1" })).toEqual([]);
  });
});

describe("pre-display check (spec §11.1)", () => {
  const ctx = { sources, offMapNames: ["Zhongguancun Drone Park"], chinaPeople: ["Zhang Wei"], runId: "run1" };

  it("keeps a sourced sentence and removes the four failing kinds with reasons", () => {
    const { kept, removed } = preDisplay(
      [
        { text: "The National Police Agency limits the tender to domestic firms.", sourceIds: ["s1"] },
        { text: "Meet the buyer before the tender closes.", sourceIds: ["s99"] },
        { text: "Send the deck to [CLIENT] by [DATE].", sourceIds: ["s1"] },
        { text: "Partner with Zhongguancun Drone Park on sensors.", sourceIds: ["s1"] },
        { text: "Zhang Wei runs procurement there.", sourceIds: ["s1"] },
        { text: "The bureau will buy 50,000 drones.", sourceIds: ["s1"] },
      ],
      ctx,
    );
    expect(kept.map((k) => k.text)).toEqual(["The National Police Agency limits the tender to domestic firms."]);
    expect(removed.map((r) => r.reason)).toEqual([
      "unknown source s99",
      "Placeholder text",
      "Mentions Zhongguancun Drone Park, which is not on the map",
      "Names an individual in China (Zhang Wei)",
      "number 50,000 not in cited excerpts",
    ]);
  });
});

// BRIEF-10: Claude never suggests spec-in or 綁標 (Government Procurement Act Art. 26/88).
describe("no spec-in (spec BRIEF-10)", () => {
  const ctx = { sources, offMapNames: [], chinaPeople: [], runId: "run1" };

  it("removes sentences that suggest spec-in, in English and Chinese", () => {
    const bad = [
      "Spec-in the radar range before the tender opens.",
      "Work to get specced in with the National Police Agency.",
      "Help the bureau write the technical specification around your detection range.",
      "Offer to draft the tender requirements for the agency.",
      "Tailor the tender so your system is the only fit.",
      "Lock out rivals by setting a 5 km threshold.",
      "Get your brand named in the tender documents.",
      "Push for specifications that only your product meets.",
      "建議與警政署合作綁標。",
      "協助機關撰寫規格，加入貴公司的獨家功能。",
    ];
    const { kept, removed } = preDisplay(bad.map((text) => ({ text, sourceIds: ["s1"] })), ctx);
    expect(kept).toEqual([]);
    expect(removed.map((r) => r.reason)).toEqual(bad.map(() => SPEC_IN_REASON));
  });

  it("keeps the lawful alternative and facts about the law", () => {
    const ok = [
      "Offer performance data, test results and the international standards the agency can use to write functional requirements.",
      "Article 26 bars technical specifications that restrict competition.",
      "The National Police Agency limits the tender to domestic firms.",
      "Read the spec in the tender notice before the briefing.",
    ];
    expect(ok.filter(suggestsSpecIn)).toEqual([]);
  });

  it("matches nothing in the sample brief, next steps or facts", () => {
    const b = sampleDossier.briefs.at(-1)!;
    const texts = [
      ...b.rationale, ...b.judgments, ...b.summary, ...b.risks, ...(b.requirements ?? []),
      ...b.path.map((p) => p.why), ...b.reduceOpposition.map((r) => r.step),
      ...Object.values(b.plan).flat(),
    ].map((s) => s.text);
    const facts = sampleDossier.facts.map((f) => (typeof f.value === "string" ? f.value : ""));
    expect([...texts, ...facts].filter(suggestsSpecIn)).toEqual([]);
  });
});
