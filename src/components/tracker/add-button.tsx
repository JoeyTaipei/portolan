"use client";

import { useState } from "react";
import { addToTracker } from "@/app/d/[id]/tracker/actions";
import { useT } from "@/lib/i18n/client";

// MAP-10 "Add to tracker" on a real dossier: the Server Action stores it (the sample uses the
// browser-only overlay in components/map/add-to-tracker.tsx).
export function AddToTrackerButton({
  dossierId,
  stakeholderId,
  alreadyTracked,
}: {
  dossierId: string;
  stakeholderId: string;
  alreadyTracked: boolean;
}) {
  const [state, setState] = useState<{ for: string; status: "idle" | "busy" | "added"; error: string | null }>({
    for: stakeholderId,
    status: "idle",
    error: null,
  });
  // A different stakeholder was selected: start fresh.
  const s = state.for === stakeholderId ? state : { for: stakeholderId, status: "idle" as const, error: null };
  const added = alreadyTracked || s.status === "added";
  const t = useT();

  async function add() {
    if (added || s.status === "busy") return;
    setState({ for: stakeholderId, status: "busy", error: null });
    const r = await addToTracker(dossierId, { stakeholderId, leadId: null, origin: "map" });
    setState(r.ok ? { for: stakeholderId, status: "added", error: null } : { for: stakeholderId, status: "idle", error: r.error });
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={add}
        aria-live="polite"
        aria-busy={s.status === "busy"}
        className={`btn w-full ${added ? "border-[var(--done)] bg-[var(--done)] text-[var(--done-ink)]" : "btn-main"}`}
      >
        {added ? t("Added to tracker") : s.status === "busy" ? t("Adding…") : t("Add to tracker")}
      </button>
      {s.error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[var(--res-text)]">
          {t.x(s.error)}
        </p>
      )}
    </div>
  );
}
