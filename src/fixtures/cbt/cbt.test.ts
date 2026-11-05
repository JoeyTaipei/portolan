// Source-check loop over the four 碳基 sample markets (spec MKT-3, §7.7), with the same checks
// as sample-dossier.test.ts, plus id uniqueness across every sample and same digits in 繁中.
import { describe, expect, it } from "vitest";
import { claimProblems, indexSources, numberProblems } from "@/lib/checks/source-check";
import { ALL_SAMPLES } from "@/lib/sample/reader";
import type { Brief, Dossier, Sentence } from "@/lib/types";
import { CBT_SAMPLES } from "./index";

function briefSentences(b: Brief): [string, Sentence][] {
  return [
    ...b.rationale.map((x, i): [string, Sentence] => [`rationale ${i}`, x]),
    ...b.summary.map((x, i): [string, Sentence] => [`summary ${i}`, x]),
    ...b.risks.map((x, i): [string, Sentence] => [`risk ${i}`, x]),
    ...b.requirements.map((x, i): [string, Sentence] => [`requirement ${i}`, x]),
    ...b.judgments.map((j, i): [string, Sentence] => [`judgment ${i}`, j]),
    ...b.path.map((p, i): [string, Sentence] => [`path ${i}`, p.why]),
    ...[...b.plan.prep, ...b.plan.contact, ...b.plan.event, ...b.plan.followUp].map((a, i): [string, Sentence] => [`plan ${i}`, a]),
  ];
}

function problems(d: Dossier): string[] {
  const index = indexSources(d.sources);
  const claim = (where: string, ids: string[], quote: string | null) => claimProblems(`${d.id} ${where}`, ids, quote, index);
  const errs: string[] = [];
  for (const f of d.facts) {
    const where = `${f.stakeholderId}.${f.field}`;
    if (f.status === "sourced") errs.push(...claim(where, f.sourceIds, f.quote));
    else if (f.sourceIds.length > 0 || f.rating !== null) errs.push(`${where}: unverified but has a source or rating`);
  }
  for (const st of d.statements) errs.push(...claim(`statement ${st.id}`, [st.sourceId], st.quote));
  for (const e of d.edges) errs.push(...claim(`edge ${e.id}`, e.sourceIds, null));
  for (const e of d.events) errs.push(...claim(`event ${e.id}`, e.sourceIds, null));
  for (const l of d.leads) {
    errs.push(...claim(`lead ${l.id}`, l.sourceIds, null));
    if (l.why) errs.push(...numberProblems(`${d.id} lead ${l.id}`, l.why.text, l.why.sourceIds, index));
  }
  for (const c of [d.marketChecks.money, d.marketChecks.licence]) if (c?.status === "sourced") errs.push(...claim("market check", c.sourceIds, c.quote));
  for (const b of d.briefs)
    for (const [where, x] of briefSentences(b)) errs.push(...claim(where, x.sourceIds, null), ...numberProblems(`${d.id} ${where}`, x.text, x.sourceIds, index));
  return errs;
}

const numbers = (s: string) => (s.match(/\d[\d,.]*\d|\d/g) ?? []).map((n) => n.replace(/,/g, ""));

describe("碳基 sample markets", () => {
  it.each(CBT_SAMPLES.map((d) => [d.id, d] as const))("%s: every claim is sourced", (_id, d) => {
    expect(problems(d)).toEqual([]);
  });

  it.each(CBT_SAMPLES.map((d) => [d.id, d] as const))("%s: every stakeholder has a sourced fact and a next step", (_id, d) => {
    for (const s of d.stakeholders) {
      expect(d.facts.some((f) => f.stakeholderId === s.id && f.status === "sourced"), s.id).toBe(true);
      expect(d.facts.some((f) => f.stakeholderId === s.id && f.field === "action" && f.status === "sourced"), `${s.id} action`).toBe(true);
    }
  });

  // Every number in the English is in the 繁中 (which may add digits for month names).
  it.each(CBT_SAMPLES.map((d) => [d.id, d] as const))("%s: 繁中 keeps every number", (_id, d) => {
    const bad = Object.entries(d.briefs[0].zh ?? {}).filter(([en, zh]) => numbers(en).some((n) => !numbers(zh).includes(n)));
    expect(bad).toEqual([]);
  });

  it.each(CBT_SAMPLES.map((d) => [d.id, d] as const))("%s: no Chinese organisation and no person", (_id, d) => {
    expect(d.stakeholders.filter((s) => s.isChina || s.isPerson)).toEqual([]);
  });

  it("stakeholder, tracker and source ids are unique across every sample", () => {
    for (const key of ["stakeholders", "tracker", "sources"] as const) {
      const ids = ALL_SAMPLES.flatMap((d) => d[key].map((x) => x.id));
      expect(ids.length, key).toBe(new Set(ids).size);
    }
  });
});
