import { describe, expect, it } from "vitest";
import { sampleDossier } from "@/lib/sample/reader";
import { buildBriefModel } from "@/components/brief/model";
import { buildHomeModel } from "@/components/home/model";
import type { Dossier } from "@/lib/types";
import { citations } from "./index";

// Plan S22: one rule decides whether a claim can be shown and which sources it lists.
const now = new Date("2026-11-11T00:00:00Z");

/** The sample with one rejected source added to the first judgment's citations. */
function withRejectedCitation(): Dossier {
  const rejected = { ...sampleDossier.sources[0], id: "rejected-src", label: "S-REJ", accepted: false };
  const [first, ...rest] = sampleDossier.briefs;
  const brief = { ...first, judgments: first.judgments.map((j, i) => (i === 0 ? { ...j, sourceIds: [...j.sourceIds, rejected.id] } : j)) };
  return { ...sampleDossier, sources: [...sampleDossier.sources, rejected], briefs: [brief, ...rest] };
}

describe("citation policy", () => {
  it("home and brief show the same judgments when one cites a rejected source", () => {
    const d = withRejectedCitation();
    const brief = buildBriefModel(d, d.briefs.at(-1)!, now).judgments.map((j) => j.text);
    const home = buildHomeModel(d, now).judgments.map((j) => j.text);
    expect(home).toEqual(brief.slice(0, 3));
  });
});

describe("citations(d)", () => {
  const src = sampleDossier.sources.find((s) => s.accepted && s.verifiedAt)!;
  const d = {
    sources: [
      { ...src, id: "ok" },
      { ...src, id: "rejected", accepted: false },
      { ...src, id: "undated", verifiedAt: null },
    ],
  };
  const cite = citations(d);

  it("cites only accepted sources with a verified date", () => {
    expect(cite.count).toBe(1);
    expect(cite.anyOf(["ok", "rejected", "undated", "missing", "ok"]).map((r) => r.id)).toEqual(["ok"]);
    expect(cite.allOf(["ok"])?.map((r) => r.id)).toEqual(["ok"]);
    expect(cite.allOf(["ok", "rejected"])).toBeNull();
    expect(cite.allOf([])).toBeNull();
  });

  it("shows a sentence only when every source is citable and the text is clean", () => {
    expect(cite.sentence({ text: "A sourced claim.", sourceIds: ["ok"] })?.refs).toHaveLength(1);
    expect(cite.sentence({ text: "A sourced claim.", sourceIds: ["ok", "undated"] })).toBeNull();
    expect(cite.sentence({ text: "A sourced claim.", sourceIds: [] })).toBeNull();
    expect(cite.sentence({ text: `Meet ${"[CL" + "IENT]"} soon.`, sourceIds: ["ok"] })).toBeNull();
    expect(cite.sentence({ text: "Help the buyer write the tender specifications for your product.", sourceIds: ["ok"] })).toBeNull();
  });
});
