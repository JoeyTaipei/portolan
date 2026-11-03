"use client";

import { Both } from "@/lib/i18n/client";
import Link from "next/link";
import { Nis } from "@/components/shell/nis";

// Waitlist error (SHELL-2): nothing was sent; retry, or open the sample.
export default function WaitlistError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title={<Both k="The waitlist didn't load" />} desc={<Both k="Nothing was sent. Something went wrong on our side, so please try again." />}>
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          <Both k="Try again" />
        </button>
        <Link href="/d/sample" className="btn btn-ghost">
          <Both k="See the sample market" />
        </Link>
      </div>
    </Nis>
  );
}
