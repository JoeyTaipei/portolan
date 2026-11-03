"use client";

import { Both } from "@/lib/i18n/client";
import { Nis } from "@/components/shell/nis";

// Map error: data is safe, try again (SHELL-2). The message never shows a stack trace.
export default function MapError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title={<Both k="The map didn't load" />} desc={<Both k="Your data is safe. Something went wrong on our side, so please try again." />}>
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          <Both k="Try again" />
        </button>
      </div>
    </Nis>
  );
}
