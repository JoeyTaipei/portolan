"use client";

import Link from "next/link";
import { Stamp } from "@/components/score/stamp";
import { useT } from "@/lib/i18n/client";
import type { EvidenceVM } from "./model";

// BRIEF-7: one cited source: its title, type, Admiralty stamp, verified date and a verbatim
// excerpt; Chinese excerpts keep the original and label any translation as machine translation.
// Grades, never a "score %". Used by the brief and the sources page.

export function EvidenceCard({ e, sourcesHref }: { e: EvidenceVM; sourcesHref?: string }) {
  const t = useT();
  const zh = e.lang.startsWith("zh");
  return (
    <article id={`ev-${e.id}`} className="scroll-mt-4 rounded-[var(--r-l)] border border-rule-strong bg-panel p-3 target:outline-2 target:outline-[var(--focus)]" data-testid="evidence-row">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-[12.5px] font-semibold text-ink2">
          {e.label} · {t.k(e.type)}
        </p>
        <Stamp reliability={e.reliability} credibility={e.credibility} />
      </div>
      <h3 className="mt-1 mb-1.5 text-[14.5px] font-bold leading-snug [overflow-wrap:anywhere]">
        {e.url ? (
          <a href={e.url} target="_blank" rel="noreferrer noopener" className="text-ink">
            {e.title}
          </a>
        ) : (
          e.title
        )}
      </h3>
      <blockquote className="m-0 border-l-2 border-rule-strong pl-2.5 text-[13.5px] leading-[1.5] [overflow-wrap:anywhere]" lang={e.lang}>
        {e.excerpt}
      </blockquote>
      {zh && (
        <p className="mt-1.5 mb-0 text-[12.5px] text-ink2">
          {e.translation ? (
            <>
              <span className="font-semibold">{t("Machine translation:")}</span> {e.translation}
            </>
          ) : (
            t("Chinese original. No translation stored yet.")
          )}
        </p>
      )}
      <p className="mt-2 mb-0 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink2" data-testid="verified">
        {e.verifiedAt ? t("Verified {date}", { date: t.date(e.verifiedAt, { utc: true }) }) : t("Date unverified")}
        {e.recheckDue && <span className="font-bold text-[var(--notice-text)]">{t("Recheck due")}</span>}
        {sourcesHref && <Link href={sourcesHref}>{t("All facts from this source")}</Link>}
      </p>
    </article>
  );
}
