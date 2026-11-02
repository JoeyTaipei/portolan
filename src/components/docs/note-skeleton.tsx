import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

// Briefing note loading: the centred 794px paper, like the A4 report.
export function NoteSkeleton() {
  return (
    <LoadingState
      label={<Both k="Opening the note…" />}
      skeleton={
        <div aria-hidden="true" className="flex justify-center px-4 pb-6">
          <div className="skel" style={{ width: "min(794px, calc(100vw - 32px))", height: 600 }} />
        </div>
      }
    />
  );
}
