import "server-only";
import type { PartnerQuestionEntry } from "@/lib/types";
import { db } from "./research";

/** NET-8: store a checked set; the newest row for the dossier is the one shown. */
export async function insertPartnerQuestions(dossierId: string, entries: PartnerQuestionEntry[], model: string): Promise<void> {
  const r = await db().from("partner_question_sets").insert({ dossier_id: dossierId, content: { entries }, model });
  if (r.error) throw new Error(r.error.message);
}
