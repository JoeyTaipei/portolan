import { describe, expect, it } from "vitest";
import { sampleDossier } from "@/lib/sample/reader";
import { buildReportModel } from "@/components/report/model";
import { buildPartners, partnerQuestions } from "./model";

// Plan S15 (NET-7): partner candidates are picked, flagged and ordered by code from sourced data.
describe("partner candidates", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  const cards = buildPartners(sampleDossier, now);

  it("lists the sample's Industry stakeholders in evidence order, contract trouble last", () => {
    expect(cards.map((c) => c.id)).toEqual(["aidc", "thunder", "ubiqconn", "itri", "mitac", "circ", "cub", "jctech", "tediboa", "tron"]);
    expect(cards[0].sourceCount).toBe(4);
    expect(cards[0].buyers).toEqual(["National Police Agency", "MND Armaments Bureau"]);
  });

  it("flags from verbatim quotes only where the source says so", () => {
    const flagged = (k: string) => cards.filter((c) => c.flags.some((f) => f.kind === k)).map((c) => c.id);
    expect(flagged("exclusive").sort()).toEqual(["jctech", "mitac"]);
    expect(flagged("contract")).toEqual(["tron"]);
    for (const c of cards) for (const f of c.flags) expect(f.refs.length).toBeGreaterThan(0);
    expect(partnerQuestions(["exclusive"])).toContain("Does your existing exclusive deal cover our product's category?");
  });

  it("cites a usable source for every evidence item", () => {
    const ok = new Set(sampleDossier.sources.filter((s) => s.accepted && s.verifiedAt).map((s) => s.id));
    for (const c of cards) for (const e of [...(c.role ? [c.role] : []), ...c.evidence]) expect(e.refs.length > 0 && e.refs.every((r) => ok.has(r.id))).toBe(true);
  });

  it("never makes a card for an organisation in China", () => {
    const d = { ...sampleDossier, stakeholders: sampleDossier.stakeholders.map((s) => (s.id === "aidc" ? { ...s, isChina: true as const, isPerson: false as const } : s)) };
    expect(buildPartners(d, now).map((c) => c.id)).not.toContain("aidc");
  });

  it("puts the top 3 on the A4, and their sources in the shared source list", () => {
    const r = buildReportModel(sampleDossier, sampleDossier.briefs.at(-1)!, now);
    expect(r.partners.map((p) => p.short)).toEqual(["AIDC", "Thunder Tiger", "Ubiqconn"]);
    for (const p of r.partners) for (const ref of p.refs) expect(r.citedIds).toContain(ref.id);
  });
});
