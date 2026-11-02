import { dataConfidenceText } from "@/components/score/explain";
import { ScoreX } from "@/components/score/score-x";
import type { HomeModel } from "./model";
import { RefreshButton } from "./refresh-button";

// HOME-3 numbers, HOME-4 confidence (opens SCORE-X, no %), HOME-5 refresh.
export function EvidencePanel({ m }: { m: HomeModel }) {
  const nums = [
    { n: m.counts.stakeholders, l: "Stakeholders" },
    { n: m.counts.sources, l: "Cited sources" },
    { n: m.counts.alerts, l: "Upcoming events", alert: true },
    { n: m.nav.leads, l: "Network leads" },
  ];
  return (
    <section aria-label="Evidence" className="flex flex-col gap-3.5 rounded-[var(--r-m)] border border-rule bg-panel p-4 lg:p-5">
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-4 max-[420px]:grid-cols-2">
        {nums.map((c) => (
          <div key={c.l} className="flex flex-col-reverse">
            <dt className="text-[13px] text-ink2">{c.l}</dt>
            <dd className={`num m-0 text-[36px] font-semibold leading-none ${c.alert && c.n > 0 ? "text-[var(--notice-text)]" : ""}`}>{c.n}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-start gap-2.5 border-t border-rule pt-3.5">
        <ScoreX
          explanation={m.confidenceX}
          dossierId={m.id}
          label={`Confidence ${dataConfidenceText(m.confidence)}. Show how it is scored`}
          className="flex min-h-11 flex-1 items-center justify-between gap-2.5 rounded-[var(--r-m)] border border-rule-strong bg-panel px-3 py-2.5 text-left font-[inherit] text-ink hover:bg-panel2"
        >
          <span>
            <b className="block text-[15px] font-bold text-[var(--good)]">Confidence: {dataConfidenceText(m.confidence)}</b>
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
    </section>
  );
}
