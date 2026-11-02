import { ScoreX } from "@/components/score/score-x";
import { Cites } from "./cites";
import { fmtDay, NO_FIRST_BUYER, UNDATED_AMOUNT, type BriefVM } from "./model";

// BRIEF-12: procurement routes, one cited row each; amounts only with a date and a status. The
// most likely first buyer above them is code's pick (scoring §9) and opens its rule.
export function Routes({ routes, firstBuyer, dossierId }: { routes: BriefVM["routes"]; firstBuyer: BriefVM["firstBuyer"]; dossierId: string }) {
  if (routes.length === 0) return null;
  return (
    <section aria-labelledby="route-h" className="flex flex-col gap-3">
      <h2 id="route-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
        Procurement routes
      </h2>
      {firstBuyer ? (
        <ScoreX
          explanation={firstBuyer.explain}
          dossierId={dossierId}
          label={`Most likely first buyer: ${firstBuyer.who}. Show how this is worked out`}
          className="flex w-full flex-col items-start gap-0.5 rounded-[var(--r-l)] border border-rule-strong bg-panel px-3 py-2.5 text-left font-[inherit] text-ink hover:bg-panel2"
        >
          <span className="text-[12.5px] font-semibold text-ink2">Most likely first buyer</span>
          <span className="text-[18px] font-bold leading-tight" data-testid="first-buyer">
            {firstBuyer.who}, {firstBuyer.how}
          </span>
          <span className="text-[13.5px] text-ink2">Why: {firstBuyer.why}</span>
        </ScoreX>
      ) : (
        <p className="m-0 text-[14.5px] font-semibold">{NO_FIRST_BUYER}</p>
      )}
      <ul className="m-0 flex list-none flex-col border-t-2 border-rule-strong p-0">
        {routes.map((r) => (
          <li key={r.route} className="grid gap-x-4 gap-y-0.5 border-b border-rule py-2.5 text-[14.5px] leading-[1.45] sm:grid-cols-[200px_minmax(0,1fr)]">
            <span>
              <span className="font-bold">{r.label}</span>
              <span className="block text-[13px] text-ink2">
                {r.buyer ? `${r.buyer} · ` : ""}
                {r.accessLabel}
              </span>
            </span>
            <span>
              {r.text}
              <Cites refs={r.refs} dossierId={dossierId} />
              {r.money ? (
                <span className="block text-[13.5px]">
                  <span className="num font-semibold">{r.money.amount}</span>, {r.money.status}, as of {fmtDay(r.money.asOf)}
                  <Cites refs={r.money.refs} dossierId={dossierId} />
                </span>
              ) : r.undated ? (
                <span className="block text-[13px] italic text-ink2">{UNDATED_AMOUNT}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
