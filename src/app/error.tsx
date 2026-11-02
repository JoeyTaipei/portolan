"use client";

import Link from "next/link";
import { Nis } from "@/components/shell/nis";

// Home error: data is safe, try again, and the sample always opens (SHELL-2).
export default function HomeError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title="Markets didn't load" desc="Your data is safe. Something went wrong on our side, so please try again.">
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/d/sample" className="btn btn-ghost">
          Open the sample dossier
        </Link>
      </div>
    </Nis>
  );
}
