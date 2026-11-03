import { getT } from "@/lib/i18n/server";
import { NO_GAPS, type BriefVM } from "./model";

// BRIEF-11: what we could not verify. Fixed code sentences with counts, from the same data as
// the Unverified marks elsewhere; no Claude text and no names.
export async function Unverified({ gaps }: { gaps: BriefVM["gaps"] }) {
  const t = await getT();
  return (
    <section aria-labelledby="gap-h" className="flex flex-col gap-2 rounded-[var(--r-l)] border border-dashed border-rule-strong p-3 lg:p-4" data-testid="gaps">
      <h2 id="gap-h" className="m-0 scroll-mt-4 text-[18px] font-bold">
        {t("What we could not verify")}
      </h2>
      <p className="m-0 text-[14px] text-ink2">{t("Counted by code from everything in this brief that has no source. None of it is a finding.")}</p>
      {gaps.length === 0 ? (
        <p className="m-0 text-[14.5px]">{t.k(NO_GAPS)}</p>
      ) : (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-[14.5px] leading-[1.45]">
          {gaps.map((g) => (
            <li key={g.key}>{t.x(g.text)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
