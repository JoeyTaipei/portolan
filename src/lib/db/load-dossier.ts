import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { isDossierId, isShareId } from "@/lib/ids";
import { sampleById, sampleByShareId } from "@/lib/sample/reader";
import type { Dossier } from "@/lib/types";
import { getDb } from "./client";
import { readByShareId, readDossier } from "./read";

// The one entry point screens use to read a dossier. Engine lane owns this from S4 on.
// Order matters for safety (spec §9): the sample never touches the database, and an id with
// the wrong format returns null before any query. Unknown ids also return null, so the page
// shows the same 404 whether or not a dossier ever existed.

export const loadDossier = cache(async (id: string): Promise<Dossier | null> => {
  const sample = sampleById(id);
  if (sample) return sample;
  if (!isDossierId(id)) return null;
  if (!getDb()) return null;
  // Per-request data: keep it out of prerendering (cacheComponents) instead of an aborted fetch.
  await connection();
  return readDossier(id);
});

/** /s/[shareId]: a sample's share id opens that sample; others are read by share id only. */
export const loadByShareId = cache(async (shareId: string): Promise<Dossier | null> => {
  const sample = sampleByShareId(shareId);
  if (sample) return sample;
  if (!isShareId(shareId)) return null;
  if (!getDb()) return null;
  await connection();
  return readByShareId(shareId);
});
