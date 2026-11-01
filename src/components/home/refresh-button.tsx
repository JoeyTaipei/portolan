"use client";

import { useState, useTransition } from "react";
import { refreshDossier } from "@/app/actions/research";

// HOME-5: refresh. Spins while running; a failure shows the reason beside it and it can be
// pressed again. The sample never refreshes (no request, no paid API).
export function RefreshButton({ dossierId, isSample }: { dossierId: string; isSample: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const reason = "The sample doesn't refresh. Your own dossiers do.";
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label={isSample ? `Refresh dossier (${reason})` : "Refresh dossier"}
        title={isSample ? reason : "Refresh dossier"}
        aria-busy={pending}
        aria-disabled={isSample}
        onClick={() => {
          if (isSample) {
            setMsg(reason);
            return;
          }
          setMsg(null);
          start(async () => {
            const r = await refreshDossier(dossierId);
            setMsg(r.ok ? "Refresh started." : r.error);
          });
        }}
        className="grid min-h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-[var(--r-m)] border border-[var(--btn-line)] bg-panel text-ink hover:bg-panel2 aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`size-5 fill-none stroke-current stroke-[1.8] ${pending ? "animate-spin" : ""}`}
        >
          <path d="M20 12a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </svg>
      </button>
      {msg && (
        <p role="status" className="m-0 max-w-[22ch] text-right text-[12.5px] text-ink2">
          {msg}
        </p>
      )}
    </div>
  );
}
