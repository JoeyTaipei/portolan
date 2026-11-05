// The sample dossiers. Never touch the database (spec §5).
// /d/sample: curated, sourced data from the Parallel spike (spec D1, plan S0b).
import type { Dossier } from "@/lib/types";
import { sampleDossier as curated } from "@/fixtures/sample-dossier";
import { sampleVietnam as vietnam } from "@/fixtures/sample-vietnam";
import { CBT_SAMPLES } from "@/fixtures/cbt";

export const sampleDossier: Dossier = curated;

/** MKT-2: the Vietnam sample behind /d/sample-vn. */
export const sampleVietnam: Dossier = vietnam;

/** Every sample, in a fixed order (MKT-3 adds the four 碳基 markets). */
export const ALL_SAMPLES: readonly Dossier[] = [curated, vietnam, ...CBT_SAMPLES];

export const sampleById = (id: string): Dossier | null => ALL_SAMPLES.find((d) => d.id === id) ?? null;
export const sampleByShareId = (shareId: string): Dossier | null => ALL_SAMPLES.find((d) => d.shareId === shareId) ?? null;
