"use client";

import { Nis } from "@/components/shell/nis";

// Tracker error (SHELL-2): nothing tracked or debriefed is lost; retry.
export default function TrackerError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="The tracker didn't load" desc="Your data is safe. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </Nis>
  );
}
