import { Cites } from "./cites";
import type { PlanBoxVM } from "./model";

// BRIEF-5: the 7-day entry plan in four fixed boxes. Every action names a stakeholder and a
// source; an empty box says so instead of inventing a step.
export function SevenDay({ plan }: { plan: PlanBoxVM[] }) {
  return (
    <section aria-labelledby="plan-h" className="flex flex-col gap-3">
      <h2 id="plan-h" className="m-0 text-[16px] font-bold">
        7-day entry plan
      </h2>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-l)] border border-rule-strong bg-rule-strong sm:grid-cols-2 min-[1600px]:grid-cols-4">
        {plan.map((b) => (
          <div key={b.key} className="flex flex-col gap-2 bg-panel p-3" data-testid={`plan-${b.key}`}>
            <p className="m-0 text-[12.5px] font-bold text-[var(--act-text)]">
              {b.days} · {b.title}
            </p>
            {b.actions.length === 0 ? (
              <p className="m-0 text-[14px] text-ink2">{b.empty}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {b.actions.map((a, i) => (
                  <li key={i} className="text-[14px] leading-[1.45]">
                    {a.text}
                    <Cites refs={a.refs} />
                    <span className="block text-[12.5px] text-ink2">With {a.who}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
