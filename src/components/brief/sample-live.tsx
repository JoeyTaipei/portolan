"use client";

import { useMemo } from "react";
import { useSampleDossier } from "@/lib/sample/use-sample-dossier";
import type { Dossier } from "@/lib/types";
import { buildBriefModel, pickBrief, type BriefVM } from "./model";
import { Versions } from "./versions";

// TRK-11: on the sample, the brief's Out of date state follows this browser's saved debriefs and
// meeting memos (SHELL-3). The server's model renders first. (Metrics stay server-rendered.)
function useLive(dossier: Dossier, v: string | null): BriefVM | null {
  const live = useSampleDossier(dossier);
  return useMemo(() => {
    const brief = live ? pickBrief(live, v) : null;
    return live && brief ? buildBriefModel(live, brief, new Date()) : null;
  }, [live, v]);
}

export function SampleVersions({ dossier, v, m }: { dossier: Dossier; v: string | null; m: BriefVM }) {
  const live = useLive(dossier, v) ?? m;
  return <Versions dossierId={live.dossierId} isSample={live.isSample} version={live.version} versions={live.versions} status={live.status} />;
}
