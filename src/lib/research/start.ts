import "server-only";
import { insertRun, insertSteps, updateDossier } from "@/lib/db/research";
import type { RunKind } from "@/lib/types";
import { DEADLINE_MS } from "./steps";

/**
 * Start research for a dossier that already exists (used by createDossier / refreshDossier in S4):
 * a run with a 20-minute deadline and a queued discover step. Nothing paid happens here; the
 * first progress request claims the discover step (after the caller checked the daily limits).
 */
export async function startResearch(dossierId: string, kind: RunKind = "initial", now = new Date()): Promise<{ runId: string }> {
  const run = await insertRun(dossierId, kind, now, new Date(now.getTime() + DEADLINE_MS));
  await insertSteps(run.id, [{ kind: "discover" }]);
  await updateDossier(dossierId, { status: "researching", current_run_id: run.id });
  return { runId: run.id };
}
