// docs/scoring.md §8: the entry verdict (Go / Conditional go / No-go), a fixed rule in code,
// never Claude. Each reason is fixed text tied to a readiness check, which carries its sources.
import type { BriefMetrics, MarketChecks, Rating03 } from "@/lib/types";

export type VerdictKind = "go" | "conditional" | "no_go" | "none";

export interface VerdictReason {
  key: "money" | "licence" | "support" | "opposition" | "contact" | "confidence";
  text: string;
  /** Sources behind the check (money and licence); empty for reasons computed from scores. */
  sourceIds: string[];
}

export interface EntryVerdict {
  kind: VerdictKind;
  label: string;
  /** Conditional: what keeps it from Go. No-go: what blocks it. Go and none: empty. */
  reasons: VerdictReason[];
}

export const VERDICT_LABEL: Record<VerdictKind, string> = {
  go: "Go",
  conditional: "Conditional go",
  no_go: "No-go",
  none: "No verdict yet",
};

const MONEY: Record<Exclude<Rating03, 3>, string> = {
  0: "Sources show no budget for this product.",
  1: "Only a policy direction so far, with no budget.",
  2: "Related budget exists, but no open tender clearly covers this product.",
};
const LICENCE: Record<Exclude<Rating03, 3>, string> = {
  0: "Foreign firms are barred by law.",
  1: "The licence or approval path for foreign firms is unclear.",
  2: "Licence path needs a local partner or a separate approval.",
};
const SUPPORT: Record<Exclude<Rating03, 3>, string> = {
  0: "Supporters hold under 10% of influence.",
  1: "Supporters hold 10–25% of influence.",
  2: "Supporters hold 25–50% of influence.",
};

/**
 * No-go: licence 0 (barred by law), readiness Low, or opposition High.
 * Go: readiness High, opposition Low, money 3, licence 3, a contact-first pick, data confidence not Low.
 * Otherwise Conditional go. Readiness or opposition not computable → no verdict yet.
 */
export function entryVerdict(m: BriefMetrics, checks: MarketChecks, contactFirstCount: number): EntryVerdict {
  const r = m.entryReadiness;
  const o = m.opposition;
  if (!r || !o) return { kind: "none", label: VERDICT_LABEL.none, reasons: [] };

  const src = (k: "money" | "licence") => checks[k]?.sourceIds ?? [];
  const reasons: VerdictReason[] = [];
  const { money, licence, support } = r.checks;
  if (licence !== 3) {
    reasons.push({ key: "licence", text: licence === null ? "No sourced finding yet on a licence path for foreign firms." : LICENCE[licence], sourceIds: licence === null ? [] : src("licence") });
  }
  if (money !== 3) {
    reasons.push({ key: "money", text: money === null ? "No sourced finding yet on a budget for this product." : MONEY[money], sourceIds: money === null ? [] : src("money") });
  }
  if (support !== null && support < 2) reasons.push({ key: "support", text: SUPPORT[support as 0 | 1], sourceIds: [] });
  if (o.level !== "Low") {
    reasons.push({ key: "opposition", text: o.level === "High" ? "Resistant stakeholders hold over 40% of influence." : "Resistant stakeholders hold 20–40% of influence.", sourceIds: [] });
  }
  if (contactFirstCount === 0) reasons.push({ key: "contact", text: "No stakeholder is ready to contact first yet.", sourceIds: [] });
  if (m.dataConfidence.level === "Low") reasons.push({ key: "confidence", text: "Data confidence is Low: few stakeholders rest on two independent sources.", sourceIds: [] });

  if (licence === 0 || r.level === "Low" || o.level === "High") {
    const blocking = reasons.filter((x) => (x.key === "licence" && licence === 0) || (x.key === "opposition" && o.level === "High") || (r.level === "Low" && (x.key === "money" || x.key === "support")));
    return { kind: "no_go", label: VERDICT_LABEL.no_go, reasons: blocking.length ? blocking : reasons };
  }
  if (r.level === "High" && reasons.length === 0) return { kind: "go", label: VERDICT_LABEL.go, reasons: [] };
  return { kind: "conditional", label: VERDICT_LABEL.conditional, reasons };
}
