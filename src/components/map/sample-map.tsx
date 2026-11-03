"use client";

import { useMemo } from "react";
import { useSampleDossier } from "@/lib/sample/use-sample-dossier";
import type { Dossier, TrackerItem } from "@/lib/types";
import { MapView } from "./map-view";
import { buildMapModel, type MapModel } from "./model";

// TRK-11: on the sample, scores follow this browser's saved debriefs and meeting memos
// (SHELL-3). The server's model renders first; the browser's copy replaces it after hydration.
export function SampleMap({ dossier, model, tracker }: { dossier: Dossier; model: MapModel; tracker: TrackerItem[] }) {
  const live = useSampleDossier(dossier);
  const liveModel = useMemo(() => (live ? buildMapModel(live, new Date()) : null), [live]);
  return <MapView model={liveModel ?? model} tracker={live?.tracker ?? tracker} />;
}
