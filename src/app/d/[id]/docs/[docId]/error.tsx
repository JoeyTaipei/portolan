"use client";

import { Nis } from "@/components/shell/nis";

// Briefing note error (SHELL-2): the document is not lost; retry.
export default function NoteError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="This document didn't open" desc="Your data is safe. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </Nis>
  );
}
