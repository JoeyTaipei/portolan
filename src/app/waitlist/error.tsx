"use client";

import Link from "next/link";
import { Nis } from "@/components/shell/nis";

// Waitlist error (SHELL-2): nothing was sent; retry, or open the sample.
export default function WaitlistError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="The waitlist didn't load" desc="Nothing was sent. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/d/sample" className="btn btn-ghost">
          See the sample market
        </Link>
      </div>
    </Nis>
  );
}
