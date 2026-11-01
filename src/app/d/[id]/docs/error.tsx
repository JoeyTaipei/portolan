"use client";

import { Nis } from "@/components/shell/nis";

// Documents error (SHELL-2): requests and drafts are not lost; retry.
export default function DocsError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="Your documents didn't load" desc="Your data is safe. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </Nis>
  );
}
