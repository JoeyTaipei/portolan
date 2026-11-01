import { ScoreX } from "@/components/score/score-x";
import type { MetricVM } from "./model";

// BRIEF-2: the four metrics, each opening SCORE-X. With nothing sourced there is no number.
export function Metrics({ metrics, dossierId }: { metrics: MetricVM[]; dossierId: string }) {
  return (
    <section aria-labelledby="met-h" className="flex flex-col">
      <h2 id="met-h" className="m-0 mb-1.5 text-[15px] font-bold">
        Where you stand
      </h2>
      <ul className="m-0 grid list-none grid-cols-2 border-t-[1.5px] border-rule-strong p-0 lg:grid-cols-1">
        {metrics.map((m) => (
          <li key={m.key} className="border-b border-rule">
            <ScoreX
              explanation={m.explain}
              dossierId={dossierId}
              label={`${m.label}: ${m.value ?? m.note}. Show how this is worked out`}
              className="flex w-full flex-col items-start gap-0.5 border-0 bg-transparent px-0 py-2.5 text-left font-[inherit] text-ink hover:bg-panel2 focus-visible:bg-panel2"
            >
              <span className="text-[12.5px] font-semibold text-ink2">{m.label}</span>
              {m.value ? (
                <span className={`num text-[24px] font-semibold leading-[1.1] ${m.key === "window" ? "text-[var(--notice-text)]" : ""}`}>
                  {m.value}
                </span>
              ) : null}
              <span className={`text-[12.5px] leading-snug ${m.value ? "text-ink2" : "text-[15px] font-semibold text-ink"}`} data-testid={`metric-${m.key}`}>
                {m.note}
              </span>
            </ScoreX>
          </li>
        ))}
      </ul>
    </section>
  );
}
