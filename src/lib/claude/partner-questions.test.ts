import { describe, expect, it } from "vitest";
import { buildPartners } from "@/components/partners/model";
import { bankQuestions, classifyRelationship } from "@/lib/partner-bank";
import { sampleDossier as d } from "@/lib/sample/reader";
import { checkEntry, questionCandidates, type PartnerQuestionsOutput } from "./partner-questions";

// Plan S23 (NET-8): questions are written for the pair, never ask a vendor-peer for acceptance
// results, and are kept only when they cite sources the candidate has.
const now = new Date("2026-11-05T00:00:00Z");
const first = questionCandidates(d, now)[0];
const sources = d.sources.filter((s) => s.accepted && s.verifiedAt);
const ids = new Set([...(first.role?.refs ?? []), ...first.evidence.flatMap((e) => e.refs)].map((r) => r.id));
const own = sources.filter((s) => ids.has(s.id));
const byLabel = new Map(own.map((s) => [s.label, s.id]));
const label = own[0].label;
const out = (qs: PartnerQuestionsOutput["candidates"][number]["questions"], relationship: PartnerQuestionsOutput["candidates"][number]["relationship"] = "peer_vendor") => ({
  entity_key: first.id,
  relationship,
  basis: { text: "It also sells to the same buyers.", source_ids: [label] },
  questions: qs,
});
const q = (text: string, source_ids = [label]) => ({ text, purpose: "find fit" as const, source_ids });

describe("tailored partner questions", () => {
  it("a vendor like the client is never asked for delivery or acceptance results", () => {
    for (const r of ["peer_vendor", "complement", "unclear"] as const) {
      const text = bankQuestions({ client: "Acme", partner: "Beta", relationship: r, market: "VN", flags: [] }).map((x) => x.text).join(" ");
      expect(text, r).not.toMatch(/acceptance|delivery record|which government contracts/i);
    }
    const e = checkEntry(
      d,
      first.id,
      out([q("Which government contracts have you delivered, and can we see the acceptance results?"), q("Where do your products overlap with ours?"), q("Would you consider a joint bid with us?")]),
      byLabel,
    );
    expect(e?.questions.map((x) => x.text)).toEqual(["Where do your products overlap with ours?", "Would you consider a joint bid with us?"]);
  });

  it("drops a question that cites a source the candidate does not have, and a repeat", () => {
    const e = checkEntry(d, first.id, out([q("Would you pilot with us?"), q("Would you pilot with us?"), q("Do you want a joint bid?", ["S999"]), q("Which buyers do you share with us?")]), byLabel);
    expect(e?.questions.map((x) => x.text)).toEqual(["Would you pilot with us?", "Which buyers do you share with us?"]);
    expect(e?.questions.every((x) => x.sourceIds.every((id) => byLabel.has(sources.find((s) => s.id === id)!.label)))).toBe(true);
  });

  it("stores nothing for a candidate left with fewer than 2 questions, and falls back to unclear without a basis", () => {
    expect(checkEntry(d, first.id, out([q("Only one good question?"), q("Bad one", ["S999"])]), byLabel)).toBeNull();
    const noBasis = checkEntry(d, first.id, { ...out([q("First question?"), q("Second question?")]), basis: { text: "Guess", source_ids: ["S999"] } }, byLabel);
    expect(noBasis?.relationship).toBe("unclear");
    expect(noBasis?.basis).toBeNull();
  });

  it("a stored set shows on the card with its sources; without one the card shows starter questions that differ by relationship", () => {
    const entry = checkEntry(d, first.id, out([q("First question?"), q("Second question?")]), byLabel)!;
    const card = buildPartners({ ...d, partnerQuestions: { id: "x", createdAt: now.toISOString(), model: "m", entries: [entry] } }, now).find((c) => c.id === first.id)!;
    expect(card.tailored).toBe(true);
    expect(card.questions.map((x) => x.text)).toEqual(["First question?", "Second question?"]);
    expect(card.questions.every((x) => x.refs.length > 0)).toBe(true);
    const starter = buildPartners(d, now);
    expect(starter.every((c) => !c.tailored && c.questions.length >= 4)).toBe(true);
    expect(classifyRelationship("Authorised distributor and system integrator")).toBe("channel");
    expect(classifyRelationship("Industry association")).toBe("adjacent");
  });

  it("never sends an organisation in China", () => {
    const china = { ...d, stakeholders: d.stakeholders.map((s) => (s.id === first.id ? { ...s, isChina: true as const, isPerson: false as const } : s)) };
    expect(questionCandidates(china, now).map((c) => c.id)).not.toContain(first.id);
  });
});
