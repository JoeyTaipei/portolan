"use client";

import { Both } from "@/lib/i18n/client";
import Link from "next/link";
import { Nis } from "@/components/shell/nis";

// Home error: data is safe, try again, and the sample always opens (SHELL-2).
export default function HomeError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Nis kind="error" title={<Both k="Markets didn't load" />} desc={<Both k="Your data is safe. Something went wrong on our side, so please try again." />}>
      <div className="acts">
        <button type="button" className="btn btn-main" onClick={() => retry()}>
          <Both k="Try again" />
        </button>
        <Link href="/d/sample" className="btn btn-ghost">
          <Both k="Open the sample dossier" />
        </Link>
      </div>
    </Nis>
  );
}
