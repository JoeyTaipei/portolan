"use client";

import { useEffect, useState } from "react";
import { Both } from "@/lib/i18n/client";
import { resetOverlay } from "@/lib/sample/overlay";

// SHELL-3: on /d/sample, say that changes stay in this browser, with Reset sample.
export function SampleBar() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule bg-panel px-[18px] py-1.5 text-[13px] text-ink2 lg:px-6">
      <span>
        <Both k="Changes to the sample stay in this browser." />
      </span>
      <button
        type="button"
        aria-live="polite"
        className="ml-auto min-h-11 cursor-pointer border-0 bg-transparent px-1 text-[13px] font-semibold text-[var(--link)] underline underline-offset-2 lg:min-h-8"
        onClick={() => {
          resetOverlay();
          setDone(true);
        }}
      >
        {done ? <Both k="Sample reset" /> : <Both k="Reset sample" />}
      </button>
    </div>
  );
}
