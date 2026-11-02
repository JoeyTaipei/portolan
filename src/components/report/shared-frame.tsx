import Link from "next/link";
import type { ReactNode } from "react";
import { LangSwitch } from "@/components/shell/lang-switch";
import { Both } from "@/lib/i18n/client";

// Frame for /s/[shareId] (spec §9): brand and the Sample data stamp only. No tabs, no links into
// the dossier, so a share link never leads to the tracker, debriefs, team ties or documents.
export function SharedFrame({ isSample, children }: { isSample: boolean; children: ReactNode }) {
  return (
    <div className="frame flex flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-rule-strong bg-[var(--bar)] px-[18px] py-3 text-[var(--bar-ink)] lg:h-[58px] lg:px-6 lg:py-0">
        <Link href="/" className="text-[17px] font-bold uppercase tracking-[.12em] text-[var(--bar-ink)] no-underline">
          Portolan
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch />
          {isSample ? (
            <span className="sample">
              <Both k="Sample data" />
            </span>
          ) : (
            <span className="text-[13px] text-ink2">
              <Both k="Shared report, read-only" />
            </span>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
