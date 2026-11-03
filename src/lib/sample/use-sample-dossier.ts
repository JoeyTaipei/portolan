"use client";

import { useEffect, useState } from "react";
import type { Dossier } from "@/lib/types";
import { applyOverlay, hasOverlay, OVERLAY_EVENT, readOverlay } from "./overlay";

/**
 * TRK-11 / SHELL-3: the sample with this browser's changes laid over it, or null until the
 * page has hydrated and only when there are changes (so the server's first render stands).
 * Re-reads whenever another component writes the overlay.
 */
export function useSampleDossier(base: Dossier | null): Dossier | null {
  const [live, setLive] = useState<Dossier | null>(null);
  useEffect(() => {
    if (!base) return;
    const read = () => {
      const o = readOverlay();
      setLive(hasOverlay(o) ? applyOverlay(base, o) : null);
    };
    read();
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [base]);
  return live;
}
