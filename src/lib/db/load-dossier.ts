import "server-only";
import { cache } from "react";
import { isDossierId, isShareId, SAMPLE_DOSSIER_ID, SAMPLE_SHARE_ID } from "@/lib/ids";
import { sampleDossier } from "@/lib/sample/reader";
import type { Dossier } from "@/lib/types";

// The one entry point screens use to read a dossier. Engine lane owns this from S4 on.
// Order matters for safety (spec §9): the sample never touches the database, and an id with
// the wrong format returns null before any query.

export const loadDossier = cache(async (id: string): Promise<Dossier | null> => {
  if (id === SAMPLE_DOSSIER_ID) return sampleDossier;
  if (!isDossierId(id)) return null;
  // Real dossiers are read from the database in S4. Until then, nothing else exists.
  return null;
});

/** /s/[shareId]: the sample's share id opens the sample; real share ids arrive in S4. */
export const loadByShareId = cache(async (shareId: string): Promise<Dossier | null> => {
  if (shareId === SAMPLE_SHARE_ID) return sampleDossier;
  if (!isShareId(shareId)) return null;
  return null;
});
