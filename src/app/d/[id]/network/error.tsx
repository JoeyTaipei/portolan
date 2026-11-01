"use client";

import { Nis } from "@/components/shell/nis";

// Network error (SHELL-2): saved leads and intro requests are not lost; retry.
export default function NetworkError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="The network didn't load" desc="Your data is safe. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </Nis>
  );
}
