"use client";

import { useSearchParams } from "next/navigation";
import { Both } from "@/lib/i18n/client";

// SHELL-1: tabs pressed with no dossier selected land on / with this notice.
export function PickFirstNotice() {
  const params = useSearchParams();
  if (params.get("pick") !== "1") return null;
  return (
    <p role="status" className="m-0 border-l-4 border-[var(--notice)] py-0.5 pl-3 text-[15px] font-semibold text-[var(--notice-text)]">
      <Both k="Pick a market first." />
    </p>
  );
}
