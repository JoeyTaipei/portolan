// `npm run eval`: scores every case in evals/cases/ (docs/spec.md §17.1). No paid call: it reads
// stored research results. A score below evals/baseline.json fails the run, so a prompt or
// scoring change that makes reports worse doesn't get merged.
// After a deliberate improvement, `EVAL_UPDATE=1 npm run eval` writes the new baseline.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { claimAgreement, coverage, ranking, type EvalCase } from "@/lib/eval/metrics";
import { scoreStakeholders } from "@/lib/scoring";
import { sampleDossier } from "@/lib/sample/reader";
import type { Dossier } from "@/lib/types";

const DIR = join(process.cwd(), "evals");
const BASELINE = join(DIR, "baseline.json");

type Scores = { coverage: number; spearman: number | null; top3In5: number; claimAgreement: number | null };

const cases: EvalCase[] = readdirSync(join(DIR, "cases"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(DIR, "cases", f), "utf8")));

const loadDossier = (ref: string): Dossier =>
  ref === "sample" ? sampleDossier : JSON.parse(readFileSync(join(process.cwd(), ref), "utf8"));

const baseline: Record<string, Scores> = JSON.parse(readFileSync(BASELINE, "utf8"));
const results: Record<string, Scores> = {};
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const r2 = (x: number | null) => (x == null ? "—" : x.toFixed(2));

for (const c of cases) {
  test(`${c.id} (${c.status})`, () => {
    const d = loadDossier(c.dossier);
    const scored = scoreStakeholders(d, new Date(c.asOf));
    const influence = new Map(scored.map((s) => [s.id, s.influence?.score ?? null]));
    const cov = coverage(c.mustInclude, d.stakeholders);
    const rank = ranking(c.expertRanking, d.stakeholders, influence);
    const claims = claimAgreement(c.labeledClaims);
    const now: Scores = { coverage: cov.rate, spearman: rank.spearman, top3In5: rank.top3In5, claimAgreement: claims.rate };
    results[c.id] = now;

    console.log(
      [
        `\n${c.id} — ${c.goal}${c.status === "draft" ? "  [draft: founder to confirm the lists]" : ""}`,
        `  1 Coverage        ${cov.found}/${cov.total} (${pct(cov.rate)})${cov.missing.length ? `  missing: ${cov.missing.join("、")}` : ""}`,
        `  2 Ranking         Spearman ${r2(rank.spearman)} over ${rank.compared}; expert top 3 in our top 5: ${rank.top3In5}/3${rank.notOnMap.length ? `  not on map: ${rank.notOnMap.join("、")}` : ""}`,
        `                    our top 5: ${rank.ourTop5.join(", ")}`,
        `  3 Claim support   ${claims.judged ? `${claims.agree}/${claims.judged} judge = founder (${pct(claims.rate)})` : "no judged claims yet"}`,
      ].join("\n"),
    );

    const before = baseline[c.id];
    if (before && !process.env.EVAL_UPDATE) {
      expect(now.coverage, "coverage dropped").toBeGreaterThanOrEqual(before.coverage);
      expect(now.top3In5, "top-3 hits dropped").toBeGreaterThanOrEqual(before.top3In5);
      if (before.spearman != null) expect(now.spearman ?? -1, "Spearman dropped").toBeGreaterThanOrEqual(before.spearman - 0.005);
      if (before.claimAgreement != null) expect(now.claimAgreement ?? 0, "judge agreement dropped").toBeGreaterThanOrEqual(before.claimAgreement);
    }
  });
}

test.runIf(process.env.EVAL_UPDATE)("write baseline", () => {
  const rounded = Object.fromEntries(
    Object.entries(results).map(([id, s]) => [id, { ...s, spearman: s.spearman == null ? null : Math.round(s.spearman * 1000) / 1000 }]),
  );
  writeFileSync(BASELINE, JSON.stringify({ ...baseline, ...rounded }, null, 2) + "\n");
});
