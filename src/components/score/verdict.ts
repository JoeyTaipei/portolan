// The entry verdict as screens show it (docs/scoring.md §8): code's rule, with the money and
// licence reasons citing their check's accepted sources.
import { briefMetrics, entryVerdict, type VerdictKind } from "@/lib/scoring";
import type { Dossier } from "@/lib/types";
import { citations, type Citations } from "@/lib/citation";
import type { SourceRef } from "./explain";

export interface VerdictVM {
  kind: VerdictKind;
  label: string;
  /** "To move to Go:" or "Blocked by:"; null when there are no reasons. */
  lead: string | null;
  reasons: { text: string; refs: SourceRef[] }[];
}

export function buildVerdict(d: Dossier, now: Date, contactFirstCount: number, cite: Citations = citations(d)): VerdictVM {
  const v = entryVerdict(briefMetrics(d, now), d.marketChecks, contactFirstCount);
  const lead = v.reasons.length === 0 ? null : v.kind === "no_go" ? "Blocked by:" : "To move to Go:";
  return { kind: v.kind, label: v.label, lead, reasons: v.reasons.map((r) => ({ text: r.text, refs: cite.anyOf(r.sourceIds) })) };
}
