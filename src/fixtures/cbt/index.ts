// MKT-3: the 碳基 (Carbon-Based Technology) demo — one sample market per target country.
import type { Dossier } from "@/lib/types";
import type { MarketSpec } from "./build";
import { JP_SPEC, sampleCbtJp } from "./jp";
import { PL_SPEC, sampleCbtPl } from "./pl";
import { US_SPEC, sampleCbtUs } from "./us";

export const CBT_SPECS: readonly MarketSpec[] = [US_SPEC, JP_SPEC, PL_SPEC];
export const CBT_SAMPLES: readonly Dossier[] = [sampleCbtUs, sampleCbtJp, sampleCbtPl];
