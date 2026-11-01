// The sample dossier behind /d/sample. Never touches the database (spec §5).
// S0b swaps the import below to the curated, sourced src/fixtures/sample-dossier.ts.
import type { Dossier } from "@/lib/types";
import { standInDossier } from "./stand-in";

export const sampleDossier: Dossier = standInDossier;
