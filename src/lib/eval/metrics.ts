// Report evaluation (docs/spec.md §17): pure functions, no network. `npm run eval` runs them over
// the cases in evals/cases/. Layer 1 = coverage, layer 2 = ranking, layer 3 = claim-support
// agreement. Layer 4 (client outcomes) needs new debrief fields and is a later slice.
import { normaliseName } from "@/lib/research/filter";
import type { Stakeholder } from "@/lib/types";

/** One organisation the expert expects, with every name it may appear under (English, 中文, short). */
export interface Expected {
  label: string;
  names: string[];
}

export type SupportLabel = "supports" | "partial" | "not";

export interface LabeledClaim {
  text: string;
  sourceId: string;
  /** The founder's label: the ground truth. */
  human: SupportLabel;
  /** The model judge's label, once a judge run has filled it in. */
  judge?: SupportLabel;
}

export interface EvalCase {
  id: string;
  goal: string;
  /** "sample" → src/fixtures/sample-dossier.ts; otherwise a path to an exported Dossier JSON. */
  dossier: string;
  /** Scores depend on recency, so every case is scored as of a fixed date. */
  asOf: string;
  /** "draft" lists still need the founder's check. */
  status: "draft" | "confirmed";
  mustInclude: Expected[];
  /** Most to least influential for the case's goal, as ranked by the expert. */
  expertRanking: Expected[];
  rankingSource: string;
  labeledClaims: LabeledClaim[];
}

type Named = Pick<Stakeholder, "id" | "name" | "nameZh" | "short">;

/** The stakeholder whose name, Chinese name or short name equals one of `names` after normalising. */
export function findStakeholder(names: string[], stakeholders: Named[]): Named | null {
  const wanted = new Set(names.map(normaliseName));
  return (
    stakeholders.find((s) => [s.name, s.nameZh, s.short].some((n) => n != null && wanted.has(normaliseName(n)))) ??
    null
  );
}

export interface Coverage {
  found: number;
  total: number;
  rate: number;
  missing: string[];
}

/** Layer 1: how many of the organisations the expert expects are on the map at all. */
export function coverage(expected: Expected[], stakeholders: Named[]): Coverage {
  const missing = expected.filter((e) => !findStakeholder(e.names, stakeholders)).map((e) => e.label);
  const total = expected.length;
  const found = total - missing.length;
  return { found, total, rate: total ? found / total : 0, missing };
}

/** Ranks starting at 1, higher value = better rank; ties share the average rank. */
function ranksDesc(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const ranks = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) ranks[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return ranks;
}

/** Spearman rank correlation (Pearson on ranks, so ties are handled). Null below 3 pairs. */
export function spearman(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 3) return null;
  const ra = ranksDesc(a);
  const rb = ranksDesc(b);
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

export interface Ranking {
  /** Expert order vs our influence scores, over the expert's organisations that are on the map. */
  spearman: number | null;
  compared: number;
  /** How many of the expert's top 3 are in our top 5 (whole map, by influence). */
  top3In5: number;
  notOnMap: string[];
  /** Our five highest influence scores, short names. */
  ourTop5: string[];
}

/** Layer 2. A stakeholder with no influence score counts as the lowest. */
export function ranking(
  expert: Expected[],
  stakeholders: Named[],
  influence: ReadonlyMap<string, number | null>,
): Ranking {
  const score = (id: string) => influence.get(id) ?? -1;
  const matched = expert.map((e) => ({ e, s: findStakeholder(e.names, stakeholders) }));
  const onMap = matched.filter((m): m is { e: Expected; s: Named } => m.s != null);
  const expertScore = onMap.map((_, i) => onMap.length - i);
  const ours = onMap.map((m) => score(m.s.id));

  const ourTop = [...stakeholders]
    .filter((s) => influence.get(s.id) != null)
    .sort((a, b) => score(b.id) - score(a.id))
    .slice(0, 5);
  const top5 = new Set(ourTop.map((s) => s.id));
  const top3In5 = matched.slice(0, 3).filter((m) => m.s && top5.has(m.s.id)).length;

  return {
    spearman: spearman(expertScore, ours),
    compared: onMap.length,
    top3In5,
    notOnMap: matched.filter((m) => !m.s).map((m) => m.e.label),
    ourTop5: ourTop.map((s) => s.short ?? s.name),
  };
}

export interface ClaimAgreement {
  judged: number;
  agree: number;
  rate: number | null;
}

/** Layer 3 calibration: how often the model judge gives the founder's label. */
export function claimAgreement(claims: LabeledClaim[]): ClaimAgreement {
  const judged = claims.filter((c) => c.judge);
  const agree = judged.filter((c) => c.judge === c.human).length;
  return { judged: judged.length, agree, rate: judged.length ? agree / judged.length : null };
}
