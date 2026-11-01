"use client";

import { STAGE_LABEL, STAGES } from "@/lib/tracker/flow";
import type { TrackerStage } from "@/lib/types";

// TRK-1: four stage counts, Found → Contacted → Met → Partner. Click one to filter the list;
// click it again or "Show all" to clear.
export function StageCounts({
  counts,
  filter,
  onFilter,
}: {
  counts: Record<TrackerStage, number>;
  filter: TrackerStage | null;
  onFilter: (stage: TrackerStage | null) => void;
}) {
  return (
    <section aria-labelledby="stages-h" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="stages-h" className="m-0 text-[13px] font-bold text-ink2">
          Stages
        </h2>
        {filter && (
          <button type="button" className="min-h-8 cursor-pointer border-0 bg-transparent px-1 text-[13px] font-semibold text-[var(--link)] underline underline-offset-2" onClick={() => onFilter(null)}>
            Show all
          </button>
        )}
      </div>
      <ol className="m-0 grid list-none grid-cols-4 gap-px overflow-hidden rounded-[var(--r-l)] border border-rule-strong bg-[var(--tile-gap-bg)] p-0" aria-label="Filter by stage">
        {STAGES.map((st, i) => {
          const on = filter === st;
          return (
            <li key={st} className="flex">
              <button
                type="button"
                aria-pressed={on}
                data-testid={`stage-${st}`}
                onClick={() => onFilter(on ? null : st)}
                className={`relative flex min-h-[68px] w-full cursor-pointer flex-col items-start justify-center gap-0.5 border-0 px-3 text-left font-[inherit] ${
                  on ? "bg-[var(--tile-on)] text-[var(--tile-on-ink)]" : "bg-panel text-ink hover:bg-panel2"
                }`}
              >
                <span className="num text-[26px] font-semibold leading-none">{counts[st]}</span>
                <span className={`text-[13px] font-semibold ${on ? "text-[var(--tile-on-ink2)]" : "text-ink2"}`}>
                  {STAGE_LABEL[st]}
                </span>
                {i < STAGES.length - 1 && (
                  <span aria-hidden="true" className={`absolute top-1/2 right-1.5 -translate-y-1/2 text-[13px] ${on ? "text-[var(--tile-on-ink2)]" : "text-ink3"}`}>
                    →
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
