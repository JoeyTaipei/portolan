"use client";

import { useEffect, useState } from "react";
import { OVERLAY_EVENT, readOverlay, writeOverlay } from "@/lib/sample/overlay";
import type { TrackerItem } from "@/lib/types";

// MAP-10 "Add to tracker". On the sample it writes only to this browser's localStorage
// (SHELL-3): no request leaves the page. Real dossiers get their tracker action in S5.

function sampleTracker(base: TrackerItem[]): TrackerItem[] {
  return readOverlay().tracker ?? base;
}

export function AddToTracker({
  dossierId,
  isSample,
  stakeholderId,
  baseTracker,
}: {
  dossierId: string;
  isSample: boolean;
  stakeholderId: string;
  baseTracker: TrackerItem[];
}) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const read = () =>
      setAdded(
        (isSample ? sampleTracker(baseTracker) : baseTracker).some((t) => t.stakeholderId === stakeholderId),
      );
    read();
    if (!isSample) return;
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [isSample, stakeholderId, baseTracker]);

  function add() {
    if (added) return;
    if (!isSample) {
      setError("Adding to the tracker isn't switched on yet.");
      return;
    }
    const item: TrackerItem = {
      id: `trk-${crypto.randomUUID()}`,
      dossierId,
      stakeholderId,
      leadId: null,
      stage: "found",
      nextStep: null,
      dueDate: null,
      meetingAt: null,
      origin: "map",
      createdAt: new Date().toISOString(),
    };
    if (writeOverlay("tracker", [...sampleTracker(baseTracker), item])) setAdded(true);
    else setError("This browser won't save changes. Allow site storage and try again.");
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={add}
        aria-live="polite"
        className={`btn w-full ${added ? "border-[var(--done)] bg-[var(--done)] text-[var(--done-ink)]" : "btn-main"}`}
      >
        {added ? "Added to tracker" : "Add to tracker"}
      </button>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[var(--res-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
