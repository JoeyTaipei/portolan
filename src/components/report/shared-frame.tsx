import Link from "next/link";
import type { ReactNode } from "react";

// Frame for /s/[shareId] (spec §9): brand and the Sample data stamp only. No tabs, no links into
// the dossier, so a share link never leads to the tracker, debriefs, team ties or documents.
export function SharedFrame({ isSample, children }: { isSample: boolean; children: ReactNode }) {
  return (
    <div className="frame flex flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-rule-strong bg-[var(--bar)] px-[18px] py-3 text-[var(--bar-ink)] lg:h-[58px] lg:px-6 lg:py-0">
        <Link href="/" className="text-[17px] font-bold uppercase tracking-[.12em] text-[var(--bar-ink)] no-underline">
          Portolan
        </Link>
        {isSample ? <span className="sample">Sample data</span> : <span className="text-[13px] text-ink2">Shared report, read-only</span>}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
