import Link from "next/link";
import { Stamp } from "@/components/score/stamp";
import type { SourceRef } from "@/components/score/explain";
import type { PartnerVM } from "./model";

// NET-7 partner candidate card. Every line is sourced text from the dossier; the flags show the
// quote that raised them; the questions are a fixed list. Saving and intros happen on the map.

function Cite({ dossierId, refs }: { dossierId: string; refs: SourceRef[] }) {
  return (
    <span className="whitespace-nowrap text-[0.86em]">
      {refs.map((r) => (
        <Link key={r.id} href={`/d/${dossierId}/sources?id=${encodeURIComponent(r.id)}`} className="ml-0.5 font-semibold text-ink no-underline hover:underline" title={`${r.label}: ${r.title}`}>
          [{r.label}]
        </Link>
      ))}
    </span>
  );
}

export function PartnerCard({ p, rank, dossierId }: { p: PartnerVM; rank: number; dossierId: string }) {
  const best = [...(p.role?.refs ?? []), ...p.evidence.flatMap((e) => e.refs)].sort(
    (a, b) => a.reliability.localeCompare(b.reliability) || a.credibility - b.credibility,
  )[0];
  return (
    <article className="flex flex-col gap-2.5 rounded-[var(--r-l)] border border-rule bg-panel p-4" data-testid="partner-card" aria-labelledby={`partner-${p.id}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12.5px] font-semibold text-ink2">
            <span className="num">{rank}</span> · Candidate
          </p>
          <h3 id={`partner-${p.id}`} className="m-0 mt-0.5 text-[18px] font-bold leading-tight">
            {p.name}
          </h3>
          {p.nameZh && <p className="m-0 text-[13px] text-ink2">{p.nameZh}</p>}
        </div>
        <p className="m-0 text-right text-[12.5px] text-ink2">
          <span className="num text-[22px] font-semibold text-ink">{p.sourceCount}</span>
          <br />
          source{p.sourceCount === 1 ? "" : "s"}
        </p>
      </header>

      {p.role && (
        <p className="m-0 text-[14.5px] leading-[1.45]">
          {p.role.text}
          <Cite dossierId={dossierId} refs={p.role.refs} />
        </p>
      )}

      {p.flags.map((f) => (
        <p key={f.kind} className="m-0 rounded-[var(--r-m)] border border-dashed border-rule-strong px-3 py-2 text-[13.5px] leading-[1.4]" data-testid={`flag-${f.kind}`}>
          <b>{f.label}.</b> <span className="text-ink2">The source says: “{f.quote}”</span>
          <Cite dossierId={dossierId} refs={f.refs} />
        </p>
      ))}

      {p.evidence.length > 0 && (
        <div>
          <p className="m-0 mb-1 text-[13px] font-bold">Public evidence</p>
          <ul className="m-0 flex flex-col gap-1 pl-4 text-[13.5px] leading-[1.4]">
            {p.evidence.map((e) => (
              <li key={e.text}>
                {e.text}
                <Cite dossierId={dossierId} refs={e.refs} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={`m-0 flex gap-2 rounded-[var(--r-m)] border-l-4 border-[var(--route)] bg-panel2 px-3 py-2 text-[13.5px] ${p.next.verified ? "" : "text-ink2"}`}>
        <span aria-hidden="true" className="text-[var(--route)]">→</span>
        <span>
          <span className="sr-only">Next step: </span>
          {p.next.text}
          {p.next.verified ? <Cite dossierId={dossierId} refs={p.next.refs} /> : <b className="ml-1 text-ink">Unverified</b>}
        </span>
      </p>

      <details className="group text-[13.5px]">
        <summary className="cursor-pointer list-none font-semibold text-[var(--link)] underline underline-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Questions to ask them ({p.questions.length})</span>
          <span className="hidden group-open:inline">Hide the questions</span>
        </summary>
        <ol className="m-0 mt-1.5 flex flex-col gap-1 pl-5 leading-[1.4]">
          {p.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </details>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        {best && (
          <p className="m-0 flex items-center gap-2 text-[12.5px] text-ink2">
            <Stamp reliability={best.reliability} credibility={best.credibility} />
            best source {best.label}
          </p>
        )}
        <Link href={`/d/${dossierId}/map?s=${encodeURIComponent(p.id)}`} className="btn btn-ghost btn-s">
          Show on map
        </Link>
      </div>
    </article>
  );
}
