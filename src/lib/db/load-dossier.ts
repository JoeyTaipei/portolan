import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { isDossierId, isShareId, SAMPLE_DOSSIER_ID, SAMPLE_SHARE_ID } from "@/lib/ids";
import { sampleDossier } from "@/lib/sample/reader";
import type { Dossier } from "@/lib/types";
import { getDb } from "./client";
import { readByShareId, readDossier } from "./read";

// The one entry point screens use to read a dossier. Engine lane owns this from S4 on.
// Order matters for safety (spec §9): the sample never touches the database, and an id with
// the wrong format returns null before any query. Unknown ids also return null, so the page
// shows the same 404 whether or not a dossier ever existed.

export const loadDossier = cache(async (id: string): Promise<Dossier | null> => {
  if (id === SAMPLE_DOSSIER_ID) return sampleDossier;
  if (!isDossierId(id)) return null;
  if (!getDb()) return null;
  // Per-request data: keep it out of prerendering (cacheComponents) instead of an aborted fetch.
  await connection();
  return readDossier(id);
});

/** /s/[shareId]: the sample's share id opens the sample; others are read by share id only. */
export const loadByShareId = cache(async (shareId: string): Promise<Dossier | null> => {
  if (shareId === SAMPLE_SHARE_ID) return sampleDossier;
  if (!isShareId(shareId)) return null;
  if (!getDb()) return null;
  await connection();
  return readByShareId(shareId);
});
