import { describe, expect, it } from "vitest";
import { partnerNote, partnersEmptyA4 } from "@/components/partners/model";
import { bankQuestions } from "@/lib/partner-bank";
import { accessLabel } from "@/components/brief/model";
import { briefPrompt, briefSystem } from "@/lib/claude/brief";
import { noteSystem } from "@/lib/claude/briefing-note";
import { leadsSystem, rateSystem, RATE_SYSTEM, LEADS_SYSTEM, experienceCheck } from "@/lib/claude/prompts";
import { discoverInput, enrichInput } from "@/lib/research/discover";
import { gradeSource } from "@/lib/research/reliability";
import { sampleDossier } from "@/lib/sample/reader";
import { MARKETS } from "./markets";

// MKT-1 (plan S20): a Vietnam or Thailand market never sends Taiwan wording to research or Claude.

const client = { company: "Lotus Trails", product: "Small-group tours", goal: "First hotel partner in 12 months" };

describe("MKT-1 markets", () => {
  it("Parallel inputs name the chosen market", () => {
    expect(discoverInput({ ...client, market: "VN" })).toMatchObject({ market: "Vietnam" });
    expect(discoverInput(client)).toMatchObject({ market: "Taiwan" });
    const e = enrichInput({ name: "Vietnam National Authority of Tourism", category: "gov" }, { ...client, market: "TH" });
    expect(String(e.context)).toContain("market: Thailand");
    expect(String(e.context)).not.toMatch(/taiwan/i);
  });

  it("system prompts for VN and TH have no Taiwan wording", () => {
    for (const m of ["VN", "TH"] as const) {
      for (const p of [rateSystem(m), leadsSystem(m), briefSystem(MARKETS[m]), noteSystem(MARKETS[m])]) {
        expect(p).toContain(MARKETS[m].name);
        expect(p).not.toMatch(/taiwan/i);
      }
    }
  });

  it("Taiwan prompts keep their wording", () => {
    expect(RATE_SYSTEM).toContain("for a startup entering Taiwan.");
    expect(LEADS_SYSTEM).toContain("- experience: Taiwan or defence experience");
    expect(briefSystem(MARKETS.TW)).toContain("Taiwan Government Procurement Act Art. 26 and Art. 88");
    expect(briefSystem(MARKETS.TW)).toContain("made-in-Taiwan or no-China rules");
    expect(experienceCheck("VN")).toBe("Vietnam or industry experience");
  });

  it("the brief's client block names the market", () => {
    const prompt = briefPrompt({ d: { ...sampleDossier, market: "VN", twPartners: null }, now: new Date("2026-11-03T00:00:00Z"), offMapNames: [] });
    const block = prompt.slice(prompt.indexOf("<client>"), prompt.indexOf("</client>"));
    expect(block).toContain("Target market: Vietnam");
    expect(block).toContain("Existing Vietnam partners: not given");
    expect(block).not.toMatch(/taiwan/i);
  });

  it("grades Vietnam and Thailand government and national news sources like Taiwan's", () => {
    expect(gradeSource("https://vietnamtourism.gov.vn/en/post/1").reliability).toBe("A");
    expect(gradeSource("https://chinhphu.vn/news").reliability).toBe("A");
    expect(gradeSource("https://www.tat.or.th/en").reliability).toBe("F"); // .or.th is not government
    expect(gradeSource("https://www.mots.go.th/news").reliability).toBe("A");
    expect(gradeSource("https://www.bangkokpost.com/business/1").reliability).toBe("B");
    expect(gradeSource("https://e.vnexpress.net/news/1").reliability).toBe("B");
  });

  it("partner text and questions drop Taiwan-only parts outside Taiwan", () => {
    const ask = (market: "TW" | "VN") => bankQuestions({ client: "Acme", partner: "Beta", relationship: "channel", market, flags: [] });
    const vn = ask("VN");
    expect(vn.map((q) => q.text).join(" ")).not.toMatch(/taiwan|MND|NCC/);
    expect(ask("TW").length).toBe(vn.length + 3);
    expect(partnerNote("TH")).not.toMatch(/MND|TEDIBOA/);
    expect(partnersEmptyA4("VN")).toBe("No Vietnamese firm with sourced evidence yet.");
    expect(accessLabel("via_local_partner", "TH")).toBe("Through a Thai partner");
    expect(accessLabel("via_local_partner", "TW")).toBe("Through a Taiwanese partner");
  });
});
