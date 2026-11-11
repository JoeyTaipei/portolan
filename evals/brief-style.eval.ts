// EVAL-4 (plan S24): brief writing A/B. Run with `npm run eval:brief`; never part of `npm test`.
//
//   npm run eval:brief                                   free checks on the six samples' current briefs
//   EVAL_DOSSIERS=id1,id2 npm run eval:brief             same, on real dossiers (.env.local, Supabase)
//   EVAL_PAID=yes RESEARCH_MODE=live npm run eval:brief  prints the estimate and stops
//   … EVAL_CONFIRM=<that amount> npm run eval:brief      writes A and B briefs, grades each pair twice
//
// Paid calls go through callStructured (token count → ledger → call). EVAL_MAX_USD (default 20)
// stops the run before a call that would pass it. Output: evals/out/<time>/ (git-ignored).
import { randomInt } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { BRIEF_TYPICAL_USD, writeBrief, type BriefStyle } from "@/lib/claude/brief";
import { callStructured, claudeLive, type LedgerContext } from "@/lib/claude/client";
import { combineVerdicts, GRADER_SYSTEM, GraderOutput, graderUser, reportBlock, type PairResult } from "@/lib/eval/grader";
import { briefSentences, sharedTrigramRate, ticReport, type BriefText, type TicReport } from "@/lib/eval/tics";
import type { LedgerStore } from "@/lib/limits/ledger";
import { MODELS } from "@/lib/limits/prices";
import { ALL_SAMPLES, sampleById } from "@/lib/sample/reader";
import type { Dossier } from "@/lib/types";

const GRADER_USD = 0.05; // per call, Sonnet 5.5 (estimate; the ledger records the actual)
const MAX_USD = Number(process.env.EVAL_MAX_USD ?? 20);

async function loadDossiers(): Promise<Dossier[]> {
  const ids = (process.env.EVAL_DOSSIERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return [...ALL_SAMPLES];
  const out: Dossier[] = [];
  for (const id of ids) {
    const s = sampleById(id);
    if (s) out.push(s);
    else {
      const { readDossier } = await import("@/lib/db/read");
      const d = await readDossier(id);
      if (!d) throw new Error(`No dossier ${id} (check .env.local and the id)`);
      out.push(d);
    }
  }
  return out;
}

/** In-memory ledger: the eval writes nothing to the database. */
function memoryLedger() {
  const rows = new Map<string, { est: number; actual: number | null }>();
  let n = 0;
  const store: LedgerStore = {
    async spentUsd() {
      return total();
    },
    async insert(row) {
      const id = `eval-${++n}`;
      rows.set(id, { est: row.estimatedUsd, actual: null });
      return id;
    },
    async settle(id, a) {
      const r = rows.get(id);
      if (r) r.actual = a.actualUsd;
    },
  };
  const total = () => [...rows.values()].reduce((s, r) => s + (r.actual ?? r.est), 0);
  return { store, total };
}

const textOf = (b: BriefText) => b.summary.map((x) => x.text).join(" ");
const fmt = (r: TicReport) =>
  `${r.words} words · banned ${r.per100.banned} · not-X-but-Y ${r.per100.notXButY} · closers ${r.per100.summaryClosers} · stacked hedges ${r.per100.stackedHedges} · em dashes ${r.per100.emDashes} · intensifiers ${r.per100.intensifiers} (per 100 words) · sentence length ${r.sentenceLength.mean} ± ${r.sentenceLength.sd}`;

it("brief style A/B", { timeout: 60 * 60 * 1000 }, async () => {
  const dossiers = await loadDossiers();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join("evals", "out", stamp);
  mkdirSync(dir, { recursive: true });
  const lines: string[] = [`# Brief writing eval · ${stamp}`, ""];

  // Free checks on each dossier's current (stored) brief.
  lines.push("## Free checks on the current briefs", "");
  const current = dossiers.filter((d) => d.briefs.length > 0);
  for (const d of current) lines.push(`- **${d.name}**: ${fmt(ticReport(briefSentences(d.briefs.at(-1)!)))}`);
  lines.push("", `Shared 3-word phrases across summaries: ${sharedTrigramRate(current.map((d) => textOf(d.briefs.at(-1)!)))}`, "");

  const paid = process.env.EVAL_PAID === "yes";
  const estimate = (dossiers.length * 2 * BRIEF_TYPICAL_USD + dossiers.length * 2 * GRADER_USD).toFixed(2);
  if (!paid || !claudeLive() || process.env.EVAL_CONFIRM !== estimate) {
    lines.push(
      "## Paid A/B: not run",
      "",
      `Estimate for ${dossiers.length} dossiers: US$${estimate} (${dossiers.length} × 2 briefs at ~US$${BRIEF_TYPICAL_USD} + ${dossiers.length * 2} grader calls at ~US$${GRADER_USD}).`,
      `To run it: EVAL_PAID=yes RESEARCH_MODE=live EVAL_CONFIRM=${estimate} npm run eval:brief${process.env.EVAL_DOSSIERS ? ` (with the same EVAL_DOSSIERS)` : ""}`,
    );
    writeFileSync(join(dir, "summary.md"), lines.join("\n") + "\n");
    console.log(lines.join("\n"));
    return;
  }

  const { store, total } = memoryLedger();
  const ledger = (dossierId: string, purpose: string): LedgerContext => ({ store, runId: null, dossierId, purpose });
  const guard = (next: number) => {
    if (total() + next > MAX_USD) throw new Error(`Stopped: the next call would pass EVAL_MAX_USD (US$${MAX_USD}); spent US$${total().toFixed(2)}.`);
  };
  const now = new Date();
  const results: {
    dossierId: string;
    name: string;
    removed: Record<BriefStyle, number>;
    tics: Record<BriefStyle, TicReport>;
    verdicts: [string, string];
    result: PairResult;
    briefs: Record<BriefStyle, BriefText>;
    grader: [GraderOutput, GraderOutput];
  }[] = [];
  const failures: string[] = [];

  for (const d of dossiers) {
    const briefs = {} as Record<BriefStyle, BriefText>;
    const removed = {} as Record<BriefStyle, number>;
    let failed = false;
    for (const style of ["A", "B"] as const) {
      guard(BRIEF_TYPICAL_USD);
      const r = await writeBrief({ d, now, offMapNames: [], ledger: ledger(d.id, "brief"), style });
      if (!r.ok) {
        failures.push(`${d.id} ${style}: ${r.reason}`);
        failed = true;
        break;
      }
      briefs[style] = r.brief.draft;
      removed[style] = r.brief.removed.length;
    }
    if (failed) continue;
    const grades: GraderOutput[] = [];
    for (const [first, second] of [["A", "B"], ["B", "A"]] as const) {
      guard(GRADER_USD);
      const g = await callStructured({
        model: MODELS.sonnet,
        system: GRADER_SYSTEM,
        user: graderUser(d, briefs[first], briefs[second]),
        schema: GraderOutput,
        maxTokens: 4000,
        effort: "medium",
        ledger: ledger(d.id, "eval_grader"),
      });
      if (!g.ok) {
        failures.push(`${d.id} grader ${first}-first: ${g.reason} ${g.detail}`);
        break;
      }
      grades.push(g.data);
    }
    if (grades.length < 2) continue;
    results.push({
      dossierId: d.id,
      name: d.name,
      removed,
      tics: { A: ticReport(briefSentences(briefs.A)), B: ticReport(briefSentences(briefs.B)) },
      verdicts: [grades[0].winner, grades[1].winner],
      result: combineVerdicts(grades[0].winner, grades[1].winner),
      briefs,
      grader: [grades[0], grades[1]],
    });
  }

  const count = (x: PairResult) => results.filter((r) => r.result === x).length;
  const removedA = results.reduce((s, r) => s + r.removed.A, 0);
  const removedB = results.reduce((s, r) => s + r.removed.B, 0);
  lines.push(
    "## Paid A/B",
    "",
    `Pairs graded: ${results.length} of ${dossiers.length}. B wins ${count("B")}, ties ${count("tie")}, A wins ${count("A")}.`,
    `Sentences the pre-display check removed: A ${removedA}, B ${removedB}.`,
    `Shared 3-word phrases across summaries: A ${sharedTrigramRate(results.map((r) => textOf(r.briefs.A)))}, B ${sharedTrigramRate(results.map((r) => textOf(r.briefs.B)))}.`,
    `Ship B? ${count("B") + count("tie") > results.length / 2 && removedB <= removedA ? "The rule is met (wins or ties on most pairs, no more removals)." : "No: the rule is not met."} Check the grader against the human sheet first.`,
    `Spent: US$${total().toFixed(2)}.`,
    "",
    ...results.flatMap((r) => [`### ${r.name}`, `- Result: ${r.result} (A first: ${r.verdicts[0]}, B first: ${r.verdicts[1]}) · removed A ${r.removed.A}, B ${r.removed.B}`, `- A: ${fmt(r.tics.A)}`, `- B: ${fmt(r.tics.B)}`, ""]),
    ...(failures.length ? ["## Failures", "", ...failures.map((f) => `- ${f}`)] : []),
  );

  // Blind sheet for Erin and Joey: up to 10 pairs, sides shuffled; the key is a separate file.
  const sheet: string[] = ["# Blind review: which report would you rather send a founder?", "", "For each pair write 1, 2 or tie. Don't open key.json until you're done.", ""];
  const key: Record<string, { report1: BriefStyle; report2: BriefStyle }> = {};
  for (const [i, r] of results.slice(0, 10).entries()) {
    const d = dossiers.find((x) => x.id === r.dossierId)!;
    const first: BriefStyle = randomInt(2) === 0 ? "A" : "B";
    const second: BriefStyle = first === "A" ? "B" : "A";
    key[`pair ${i + 1}`] = { report1: first, report2: second };
    sheet.push(`## Pair ${i + 1} · ${r.name}`, "", "### Report 1", "", reportBlock(r.briefs[first], d), "", "### Report 2", "", reportBlock(r.briefs[second], d), "", "Your pick: ____", "");
  }

  writeFileSync(join(dir, "summary.md"), lines.join("\n") + "\n");
  writeFileSync(join(dir, "results.json"), JSON.stringify({ results, failures, spentUsd: total() }, null, 2));
  writeFileSync(join(dir, "human-review.md"), sheet.join("\n"));
  writeFileSync(join(dir, "key.json"), JSON.stringify(key, null, 2));
  console.log(lines.join("\n"));
});
