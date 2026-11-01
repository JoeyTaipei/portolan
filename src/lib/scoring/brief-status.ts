// docs/scoring.md §7: a brief is Out of date after a new debrief, a changed stakeholder, or a
// cited source verified more than 90 days ago. Nothing is rewritten automatically.
import type { Brief, BriefStatus, Dossier } from "@/lib/types";
import { daysBetween } from "./source-weight";

export const STALE_SOURCE_DAYS = 90;

export function citedSourceIds(brief: Brief): Set<string> {
  const ids = new Set<string>();
  const add = (xs: string[]) => xs.forEach((i) => ids.add(i));
  [...brief.rationale, ...brief.summary, ...brief.risks].forEach((s) => add(s.sourceIds));
  brief.judgments.forEach((j) => add(j.sourceIds));
  brief.path.forEach((p) => add(p.why.sourceIds));
  brief.reduceOpposition.forEach((r) => add(r.step.sourceIds));
  [brief.plan.prep, brief.plan.contact, brief.plan.event, brief.plan.followUp].forEach((actions) => actions.forEach((a) => add(a.sourceIds)));
  brief.meet.forEach((m) => add(m.sourceIds));
  return ids;
}

export function briefStatus(
  brief: Brief,
  d: Pick<Dossier, "debriefs" | "stakeholders" | "facts" | "statements" | "sources">,
  now: Date,
): BriefStatus {
  const after = (at: string) => at > brief.inputsAt;
  const reasons: string[] = [];

  if (d.debriefs.some((x) => after(x.createdAt))) reasons.push("A debrief was saved after this brief was written.");

  const researchStatements = d.statements.filter((s) => s.debriefId === null);
  if (d.stakeholders.some((s) => after(s.createdAt)) || d.facts.some((f) => after(f.createdAt)) || researchStatements.some((s) => after(s.createdAt))) {
    reasons.push("Stakeholders changed after this brief was written.");
  }

  const cited = citedSourceIds(brief);
  const stale = d.sources.filter((s) => cited.has(s.id) && s.verifiedAt && daysBetween(s.verifiedAt, now) > STALE_SOURCE_DAYS);
  if (stale.length > 0) {
    reasons.push(`${stale.length} cited source${stale.length === 1 ? " was" : "s were"} verified more than ${STALE_SOURCE_DAYS} days ago.`);
  }

  return { outOfDate: reasons.length > 0, reasons };
}
