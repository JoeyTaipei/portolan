"use client";

import { Nis } from "@/components/shell/nis";

// Brief error (spec §12 03): the research is saved; retry. A rewrite only runs through
// Re-brief on the brief page, which shows its cost first.
export default function BriefError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="The brief failed to generate" desc="Your research is saved. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </Nis>
  );
}
