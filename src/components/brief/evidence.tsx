import Link from "next/link";
import { Stamp } from "@/components/score/stamp";
import { fmtDay, type EvidenceVM } from "./model";

// BRIEF-7: the evidence dossier. Each cited source shows its title, type, Admiralty stamp,
// verified date and a verbatim excerpt; Chinese excerpts keep the original and label any
// translation as machine translation. Grades, never a "score %".

export function EvidenceCard({ e, sourcesHref }: { e: EvidenceVM; sourcesHref?: string }) {
  const zh = e.lang.startsWith("zh");
  return (
    <article id={`ev-${e.id}`} className="scroll-mt-4 rounded-[var(--r-l)] border border-rule-strong bg-panel p-3 target:outline-2 target:outline-[var(--focus)]" data-testid="evidence-row">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-[12.5px] font-semibold text-ink2">
          {e.label} · {e.type}
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
              <span className="font-semibold">Machine translation:</span> {e.translation}
            </>
          ) : (
            "Chinese original. No translation stored yet."
          )}
        </p>
      )}
      <p className="mt-2 mb-0 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink2" data-testid="verified">
        {e.verifiedAt ? `Verified ${fmtDay(e.verifiedAt)}` : "Date unverified"}
        {e.recheckDue && <span className="font-bold text-[var(--notice-text)]">Recheck due</span>}
        {sourcesHref && <Link href={sourcesHref}>All facts from this source</Link>}
      </p>
    </article>
  );
}

export function Evidence({
  items,
  total,
  dossierId,
}: {
  items: EvidenceVM[];
  total: number;
  dossierId: string;
}) {
  return (
    <section aria-labelledby="evi-h" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="evi-h" className="m-0 text-[15px] font-bold">
          Evidence
        </h2>
        <p className="m-0 text-[13px] text-ink2">
          <span className="num">{items.length}</span> of <span className="num">{total}</span> ·{" "}
          <Link href={`/d/${dossierId}/sources`}>Show all</Link>
        </p>
      </div>
      {items.length === 0 ? (
        <p className="m-0 text-[14px] text-ink2">This brief cites no source yet, so nothing is shown as fact.</p>
      ) : (
        items.map((e) => <EvidenceCard key={e.id} e={e} sourcesHref={`/d/${dossierId}/sources?id=${e.label}`} />)
      )}
    </section>
  );
}
