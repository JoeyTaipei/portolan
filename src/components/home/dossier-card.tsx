import Link from "next/link";
import { dataConfidenceText } from "@/components/score/explain";
import { ScoreX } from "@/components/score/score-x";
import type { HomeModel } from "./model";
import { RefreshButton } from "./refresh-button";
import { RelativeTime } from "./relative-time";
import { TaiwanChart } from "./taiwan-chart";
import { NORTH } from "./taiwan-coast";

// HOME-3 card, HOME-4 confidence (opens SCORE-X, no %), HOME-5 refresh.
export function DossierCard({ m }: { m: HomeModel }) {
  const nums = [
    { n: m.counts.stakeholders, l: "Stakeholders" },
    { n: m.counts.sources, l: "Cited sources" },
    { n: m.counts.alerts, l: "Upcoming events", alert: true },
  ];
  return (
    <section aria-labelledby="d-h" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-[var(--r-s)] px-2 py-[3px] text-[12px] font-bold ${
            m.verified ? "bg-[var(--tag-bg)] text-[var(--tag-ink)]" : "border border-rule-strong text-ink"
          }`}
        >
          {m.verified ? "Verified dossier" : "Partial"}
        </span>
        {m.isSample && <span className="sample">Sample data</span>}
      </div>
      <div>
        <h2 id="d-h" className="my-0.5 text-[31px] font-extrabold leading-none tracking-[-.01em]">
          {m.name}
        </h2>
        <p className="m-0 text-[14px] text-ink2">
          {m.country}
          {m.refreshedAt && (
            <>
              , refreshed <RelativeTime iso={m.refreshedAt} />
            </>
          )}
        </p>
      </div>
      <figure className="m-0 overflow-hidden rounded-[var(--r-l)] border border-rule-strong bg-[var(--water0)] lg:hidden">
        <div className="aspect-[354/226]">
          <TaiwanChart
            dossierId={m.id}
            placed={m.placed}
            bounds={NORTH}
            w={354}
            h={226}
            rose={[120.2, 24.72]}
            roseR={30}
            label="Sketch chart of northern Taiwan with the stakeholders that have a sourced address"
          />
        </div>
        <figcaption className="border-t border-rule bg-panel px-2.5 py-[7px] text-[12px] text-ink2">
          {m.placed.length} of {m.nav.mapTotal} stakeholders placed by a sourced address
        </figcaption>
      </figure>
      <div className="flex items-start gap-2.5">
        <ScoreX
          explanation={m.confidenceX}
          dossierId={m.id}
          label={`Confidence ${dataConfidenceText(m.confidence)}. Show how it is scored`}
          className="flex flex-1 items-center justify-between gap-2.5 rounded-[var(--r-m)] border border-rule-strong bg-panel px-3 py-2.5 text-left font-[inherit] text-ink hover:bg-panel2"
        >
          <span>
            <b className="block text-[16px] font-extrabold text-[var(--good)]">Confidence: {dataConfidenceText(m.confidence)}</b>
            <small className="mt-0.5 block text-[12.5px] text-ink2">
              {m.confidence.qualifying} of {m.confidence.of} stakeholders rest on two or more independent sources.
            </small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] shrink-0 fill-none stroke-current stroke-[1.8]">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7.5v.01" />
          </svg>
        </ScoreX>
        <RefreshButton dossierId={m.id} isSample={m.isSample} />
      </div>
      <dl className="m-0 grid grid-cols-3 border-y border-rule-strong">
        {nums.map((c, i) => (
          <div key={c.l} className={`pt-2.5 pb-2 ${i > 0 ? "border-l border-rule pl-3" : ""}`}>
            <dd className={`num m-0 text-[34px] font-semibold leading-none ${c.alert && c.n > 0 ? "text-[var(--notice-text)]" : ""}`}>
              {c.n}
            </dd>
            <dt className="text-[12.5px] text-ink2">{c.l}</dt>
          </div>
        ))}
      </dl>
      <Link href={`/d/${m.id}/map`} className="btn btn-main w-full">
        Open stakeholder map
      </Link>
    </section>
  );
}
