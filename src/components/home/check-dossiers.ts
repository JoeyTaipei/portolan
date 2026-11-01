"use server";

// HOME-7: which of the dossiers this browser remembers still open, with their confidence level.
// Takes only ids the browser already holds; malformed ids are dropped before any read
// (loadDossier checks the format). Returns names and levels only, never other dossier data.
import { briefMetrics } from "@/lib/scoring";
import { loadDossier } from "@/lib/db/load-dossier";
import { isDossierId } from "@/lib/ids";
import type { ActionResult, Level } from "@/lib/types";
import { z } from "zod";

const Ids = z.array(z.string().max(64)).max(20);

export interface DossierCheck {
  id: string;
  name: string;
  level: Level;
  sources: number;
}

export async function checkDossiers(ids: string[]): Promise<ActionResult<DossierCheck[]>> {
  const parsed = Ids.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "That list of dossiers couldn't be read." };
  const now = new Date();
  const out: DossierCheck[] = [];
  for (const id of new Set(parsed.data.filter(isDossierId))) {
    const d = await loadDossier(id);
    if (!d) continue;
    out.push({
      id: d.id,
      name: d.name,
      level: briefMetrics(d, now).dataConfidence.level,
      sources: d.sources.filter((s) => s.accepted).length,
    });
  }
  return { ok: true, data: out };
}
