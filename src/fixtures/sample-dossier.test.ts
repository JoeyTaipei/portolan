// Source-check loop over the sample fixture (spec §7.7, §17), using the same code the
// research engine runs (src/lib/checks/source-check.ts).
import { describe, expect, it } from "vitest";
import { claimProblems, indexSources, numberProblems as numbers } from "@/lib/checks/source-check";
import { contactFirst, scoreStakeholders } from "@/lib/scoring";
import type { Brief, Sentence } from "@/lib/types";
import { sampleDossier as d } from "./sample-dossier";

const NOW = new Date("2026-11-01T00:00:00Z");

const byId = new Map(d.sources.map((s) => [s.id, s]));
const index = indexSources(d.sources);

/** Problems with one claim: ids exist, accepted, verified, and the quote is in a cited excerpt. */
const problems = (where: string, sourceIds: string[], quote: string | null) => claimProblems(where, sourceIds, quote, index);

/** Every number in a written sentence must appear in one of its cited excerpts. */
const numberProblems = (where: string, text: string, sourceIds: string[]) => numbers(where, text, sourceIds, index);

function briefSentences(b: Brief): [string, Sentence][] {
  return [
    ...b.rationale.map((x, i): [string, Sentence] => [`rationale ${i}`, x]),
    ...b.summary.map((x, i): [string, Sentence] => [`summary ${i}`, x]),
    ...b.risks.map((x, i): [string, Sentence] => [`risk ${i}`, x]),
    ...(b.requirements ?? []).map((x, i): [string, Sentence] => [`requirement ${i}`, x]),
    ...(b.routes ?? []).map((x): [string, Sentence] => [`route ${x.route}`, x]),
    ...(b.routes ?? []).flatMap((x): [string, Sentence][] => (x.money ? [[`route ${x.route} money`, { text: x.money.amount, sourceIds: x.money.sourceIds }]] : [])),
    ...b.judgments.map((j, i): [string, Sentence] => [`judgment ${i}`, j]),
    ...b.path.map((p, i): [string, Sentence] => [`path ${i}`, p.why]),
    ...b.reduceOpposition.map((r, i): [string, Sentence] => [`reduce ${i}`, r.step]),
    ...[...b.plan.prep, ...b.plan.contact, ...b.plan.event, ...b.plan.followUp].map((a, i): [string, Sentence] => [`plan ${i}`, a]),
  ];
}

describe("sample dossier", () => {
  it("≥ 20 stakeholders", () => {
    expect(d.stakeholders.length).toBeGreaterThanOrEqual(20);
  });

  it("≥ 60 accepted sources", () => {
    expect(d.sources.filter((s) => s.accepted).length).toBeGreaterThanOrEqual(60);
  });

  it("every claim is sourced or unverified", () => {
    const errs: string[] = [];
    for (const f of d.facts) {
      const where = `${f.stakeholderId}.${f.field}`;
      if (f.status === "sourced") errs.push(...problems(where, f.sourceIds, f.quote));
      else if (f.sourceIds.length > 0 || f.rating !== null) errs.push(`${where}: unverified but has a source or rating`);
      if (f.rating !== null && f.sourceIds.length === 0) errs.push(`${where}: rating without sources`);
    }
    for (const st of d.statements) errs.push(...problems(`statement ${st.id}`, [st.sourceId], st.quote));
    for (const e of d.edges) errs.push(...problems(`edge ${e.id}`, e.status === "sourced" ? e.sourceIds : ["-"], null));
    for (const e of d.events) if (e.status === "sourced") errs.push(...problems(`event ${e.id}`, e.sourceIds, null));
    for (const l of d.leads) {
      errs.push(...problems(`lead ${l.id}`, l.sourceIds, null));
      if (l.match.type === "checks") for (const c of l.match.checks) if (c.passed) errs.push(...problems(`lead ${l.id} check`, c.sourceIds, null));
    }
    for (const c of [d.marketChecks.money, d.marketChecks.licence]) if (c?.status === "sourced") errs.push(...problems("market check", c.sourceIds, c.quote));
    for (const b of d.briefs) {
      for (const [where, x] of briefSentences(b)) errs.push(...problems(where, x.sourceIds, null), ...numberProblems(where, x.text, x.sourceIds));
      for (const m of b.meet) errs.push(...problems(`meet ${m.eventId}`, m.sourceIds, null));
    }
    expect(errs).toEqual([]);
  });

  it("every stakeholder has an accepted source and a next step", () => {
    for (const s of d.stakeholders) {
      const own = d.facts.filter((f) => f.stakeholderId === s.id && f.status === "sourced");
      expect(own.length, s.id).toBeGreaterThan(0);
      expect(d.facts.some((f) => f.stakeholderId === s.id && f.field === "action"), s.id).toBe(true);
    }
  });

  it("rejected sources carry a reason and are never cited", () => {
    const cited = new Set([
      ...d.facts.flatMap((f) => f.sourceIds),
      ...d.statements.map((s) => s.sourceId),
      ...d.edges.flatMap((e) => e.sourceIds),
    ]);
    for (const s of d.sources.filter((x) => !x.accepted)) {
      expect(s.rejectReason, s.label).toBeTruthy();
      expect(cited.has(s.id), s.label).toBe(false);
    }
  });

  it("names only sourced officials; no Chinese person rows", () => {
    for (const s of d.stakeholders) expect(s.isChina && s.isPerson, s.id).toBe(false);
    for (const f of d.facts.filter((x) => x.field === "head")) {
      expect(f.status, f.id).toBe("sourced");
      expect(d.stakeholders.find((s) => s.id === f.stakeholderId)?.category, f.id).toBe("gov");
    }
  });

  it("48,750 drones only with the Armaments Bureau source", () => {
    const texts: [string, string[]][] = [
      ...d.facts.map((f): [string, string[]] => [`${f.value} ${f.quote ?? ""}`, f.sourceIds]),
      ...d.briefs.flatMap((b) => briefSentences(b).map(([, x]): [string, string[]] => [x.text, x.sourceIds])),
    ];
    for (const [text, ids] of texts.filter(([t]) => t.includes("48,750"))) {
      expect(ids.some((id) => /48,750[\s\S]*Armaments Bureau/.test(byId.get(id)?.excerpt ?? "")), text).toBe(true);
    }
  });

  it("no placeholders or removed mockup figures", () => {
    const json = JSON.stringify({ ...d, sources: [] });
    expect(json).not.toMatch(/\[(CLIENT|DATE|NAME)\]|Kestrel|Harbor Lane|5\.1 ?GHz|US\$7B/);
  });

  it("timed events are in the future or undated", () => {
    for (const e of d.events) if (e.date) expect(e.date >= "2026-11-01", e.id).toBe(true);
  });

  it("brief follows its limits and the path follows scoring §5", () => {
    const b = d.briefs.at(-1)!;
    const words = b.rationale.map((x) => x.text).join(" ").split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(120);
    expect(b.summary.map((x) => x.text).join(" ").split(/\s+/).length).toBeLessThanOrEqual(70);
    expect(b.risks.length).toBeLessThanOrEqual(3);
    expect(b.judgments.length).toBe(3);
    expect(b.path.length).toBeGreaterThanOrEqual(3);
    expect(b.path.length).toBeLessThanOrEqual(5);
    const scored = scoreStakeholders(d, NOW).filter((x) => x.eligible);
    const counts = new Map(scored.map((x) => [x.id, x.sourceCount]));
    const first = contactFirst(scored, { sourceCounts: counts }).map((p) => p.stakeholderId);
    expect(b.path.slice(0, first.length).map((p) => p.stakeholderId)).toEqual(first);
  });
});
