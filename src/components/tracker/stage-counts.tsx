"use client";

import { STAGE_LABEL, STAGES } from "@/lib/tracker/flow";
import type { TrackerStage } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

// TRK-1: the four stages as the route to a first deal (LAYOUT-BR): stops on a dashed line, each
// with its count. Click one to filter the list; click it again or "Show all" to clear.
const NOTE: Record<TrackerStage, string> = {
  found: "Added from the map or Network",
  contacted: "First message sent",
  met: "Meeting held",
  partner: "Pilot or agreement",
};

export function StageCounts({
  counts,
  filter,
  onFilter,
}: {
  counts: Record<TrackerStage, number>;
  filter: TrackerStage | null;
  onFilter: (stage: TrackerStage | null) => void;
}) {
  const t = useT();
  return (
    <section aria-labelledby="stages-h" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="stages-h" className="sr-only">
          {t("Stages")}
        </h2>
        {filter && (
          <button type="button" className="ml-auto min-h-8 cursor-pointer border-0 bg-transparent px-1 text-[13.5px] font-semibold text-[var(--link)] underline underline-offset-2" onClick={() => onFilter(null)}>
            {t("Show all")}
          </button>
        )}
      </div>
      <ol className="m-0 grid list-none grid-cols-4 p-0" aria-label={t("Filter by stage")}>
        {STAGES.map((st, i) => {
          const on = filter === st;
          const filled = counts[st] > 0;
          return (
            <li key={st} className="flex min-w-0 flex-col">
              <button
                type="button"
                aria-pressed={on}
                data-testid={`stage-${st}`}
                onClick={() => onFilter(on ? null : st)}
                className="group flex w-full cursor-pointer flex-col items-start gap-2 border-0 bg-transparent p-0 pr-2 text-left font-[inherit] text-ink"
              >
                <span className="flex w-full items-center">
                  <span
                    className={`num grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--act)] text-[15px] font-bold group-hover:ring-2 group-hover:ring-[var(--act)]/30 ${
                      filled ? "bg-[var(--act)] text-[var(--act-ink)]" : "bg-panel text-[var(--act-text)]"
                    } ${on ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
                  >
                    {counts[st]}
                  </span>
                  {i < STAGES.length - 1 && <span aria-hidden="true" className="mx-2 flex-1 border-t-2 border-dashed border-[var(--route)]" />}
                </span>
                <span className={`text-[16px] font-bold ${on ? "underline underline-offset-4" : ""}`}>{t.k(STAGE_LABEL[st])}</span>
                <span className="text-[13px] leading-snug text-ink2 max-sm:hidden">{t.k(NOTE[st])}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
