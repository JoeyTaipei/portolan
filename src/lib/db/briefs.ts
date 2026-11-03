import "server-only";
import type { Brief, Json } from "@/lib/types";
import { db } from "./research";

// Strategy brief versions and the pre-display check log (spec §11.1). Every run or RE-BRIEF
// adds a row (v1, v2…); older versions are kept. Sentences removed by the check go to
// brief_check_log, never to the screen.

export type BriefDraft = Omit<Brief, "id" | "dossierId" | "version" | "createdAt">;

type Row = Record<string, unknown>;

export async function latestVersion(dossierId: string): Promise<number> {
  const r = await db().from("briefs").select("version").eq("dossier_id", dossierId).order("version", { ascending: false }).limit(1);
  if (r.error) throw new Error(`latest brief: ${r.error.message}`);
  return ((r.data as Row[])[0]?.version as number) ?? 0;
}

/**
 * Insert the next version. The unique (dossier, version) constraint settles a race between two
 * writers: the loser takes the following number.
 */
export async function insertBrief(dossierId: string, draft: BriefDraft, removed: { sentence: string; reason: string }[]): Promise<number> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const version = (await latestVersion(dossierId)) + 1;
    const r = await db()
      .from("briefs")
      .insert({
        dossier_id: dossierId,
        version,
        metrics: draft.metrics as unknown as Json,
        rationale: draft.rationale as unknown as Json,
        judgments: draft.judgments as unknown as Json,
        path: draft.path as unknown as Json,
        reduce_opposition: draft.reduceOpposition as unknown as Json,
        plan: draft.plan as unknown as Json,
        summary: draft.summary as unknown as Json,
        risks: draft.risks as unknown as Json,
        requirements: draft.requirements as unknown as Json,
        routes: draft.routes as unknown as Json,
        meet: draft.meet as unknown as Json,
        needs: draft.needs,
        changes_note: draft.changesNote,
        inputs_at: draft.inputsAt,
      })
      .select("id")
      .single();
    if (r.error?.code === "23505") continue;
    if (r.error) throw new Error(`insert brief: ${r.error.message}`);
    const briefId = (r.data as Row).id as string;
    if (removed.length) {
      const log = await db()
        .from("brief_check_log")
        .insert(removed.map((x) => ({ brief_id: briefId, sentence: x.sentence.slice(0, 2000), reason: x.reason.slice(0, 500) })));
      if (log.error) throw new Error(`brief check log: ${log.error.message}`);
    }
    return version;
  }
  throw new Error("insert brief: version clash");
}

/** I18N-9: store the checked translations for one version, plus the pairs that fell back to English. */
export async function saveBriefZh(dossierId: string, version: number, zh: Record<string, string>, failed: { sentence: string; reason: string }[]): Promise<void> {
  const r = await db().from("briefs").update({ zh: zh as unknown as Json }).eq("dossier_id", dossierId).eq("version", version).select("id").single();
  if (r.error) throw new Error(`save brief zh: ${r.error.message}`);
  if (failed.length) {
    const briefId = (r.data as Row).id as string;
    const log = await db()
      .from("brief_check_log")
      .insert(failed.map((x) => ({ brief_id: briefId, sentence: x.sentence.slice(0, 2000), reason: `zh: ${x.reason}`.slice(0, 500) })));
    if (log.error) throw new Error(`brief zh log: ${log.error.message}`);
  }
}
