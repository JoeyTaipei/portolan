import { getT } from "@/lib/i18n/server";
import { Cites } from "./cites";
import type { PlanBoxVM } from "./model";

// BRIEF-5: the 7-day entry plan in four fixed boxes. Every action names a stakeholder and a
// source; an empty box says so instead of inventing a step.
export async function SevenDay({ plan, dossierId }: { plan: PlanBoxVM[]; dossierId: string }) {
  const t = await getT();
  return (
    <section aria-labelledby="plan-h" className="flex flex-col gap-3">
      <h2 id="plan-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
        {t("7-day entry plan")}
      </h2>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-l)] border border-rule-strong bg-rule-strong sm:grid-cols-2">
        {plan.map((b) => (
          <div key={b.key} className="flex flex-col gap-2 bg-panel p-3" data-testid={`plan-${b.key}`}>
            <p className="m-0 text-[12.5px] font-bold text-[var(--act-text)]">
              {t.k(b.days)} · {t.k(b.title)}
            </p>
            {b.actions.length === 0 ? (
              <p className="m-0 text-[14px] text-ink2">{t.k(b.empty)}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {b.actions.map((a, i) => (
                  <li key={i} className="text-[14px] leading-[1.45]">
                    <span data-testid="conclusion">{t.r(a.text)}</span>
                    <Cites refs={a.refs} dossierId={dossierId} />
                    <span className="block text-[12.5px] text-ink2">{t("With {name}", { name: t.n(a.who) })}</span>
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
