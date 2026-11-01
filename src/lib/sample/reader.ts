// The sample dossier behind /d/sample. Never touches the database (spec §5).
// Curated, sourced data from the Parallel spike (spec D1, plan S0b).
import type { Dossier } from "@/lib/types";
import { sampleDossier as curated } from "@/fixtures/sample-dossier";

export const sampleDossier: Dossier = curated;
