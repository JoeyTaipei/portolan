// Scores come only from here; screens and prompts never compute them (spec §15).
import type { BriefMetrics, Dossier, Level } from "@/lib/types";
import { influenceFor } from "./influence";
import { dataConfidence, entryReadiness, isEligible, oppositionIndex, sourcesFor, stakeholderConfidence, windowToAct, type Scored } from "./metrics";
import { supportFor } from "./support";

export * from "./source-weight";
export * from "./influence";
export * from "./support";
export * from "./metrics";
export * from "./ranking";
export * from "./brief-status";
export * from "./verdict";

export interface ScoredStakeholder extends Scored {
  confidence: Level;
  sourceCount: number;
  eligible: boolean;
}

type ScoreInput = Pick<Dossier, "stakeholders" | "facts" | "edges" | "statements" | "sources">;

/** Influence, support and confidence for every stakeholder, recomputed on each read. */
export function scoreStakeholders(d: ScoreInput, now: Date): ScoredStakeholder[] {
  return d.stakeholders.map((s) => {
    const srcs = sourcesFor(s.id, d.facts, d.statements, d.sources);
    const influence = influenceFor(s.id, d.facts, d.edges, s.category);
    return {
      id: s.id,
      influence,
      support: supportFor(s.id, d.statements, d.sources, now),
      confidence: stakeholderConfidence(srcs, influence),
      sourceCount: srcs.length,
      eligible: isEligible(s),
    };
  });
}

/** The four strategy-brief metrics for a dossier. */
export function briefMetrics(d: ScoreInput & Pick<Dossier, "events" | "marketChecks">, now: Date): BriefMetrics {
  const scored = scoreStakeholders(d, now).filter((s) => s.eligible);
  const eligible = d.stakeholders.filter(isEligible);
  return {
    entryReadiness: entryReadiness(d.marketChecks, scored),
    opposition: oppositionIndex(scored),
    window: windowToAct(d.events, now),
    dataConfidence: dataConfidence(
      eligible.map((s) => sourcesFor(s.id, d.facts, d.statements, d.sources)),
      d.sources.filter((s) => s.accepted).length,
    ),
  };
}
