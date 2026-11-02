import { IcdScale, icdText } from "@/components/score/icd-scale";
import { Paras } from "@/components/score/paras";
import { SourceChips } from "@/components/score/source-chip";
import { getT } from "@/lib/i18n/server";
import type { HomeModel } from "./model";

// Side column key judgments: the sourced judgments after the bottom line, each with an ICD term +
// range and confidence stated separately. Hidden when the bottom line is the only one.
export async function KeyJudgments({ m }: { m: HomeModel }) {
  const t = await getT();
  const rest = m.judgments.slice(1);
  if (m.judgments.length > 0 && rest.length === 0) return null;
  return (
    <section
      aria-labelledby="kj-h"
      className="flex flex-col gap-2"
    >
      <h2 id="kj-h" className="m-0 border-b border-rule-strong pb-2 text-[16px] font-bold">
        {t("Key judgments")}
      </h2>
      {rest.length === 0 ? (
        <p className="m-0 text-[14px] leading-normal text-ink2">
          {t("None yet. Key judgments come from the strategy brief, and only sourced ones are shown.")}
        </p>
      ) : (
        <Paras
          label={t("Key judgments")}
          items={rest.map((j, i) => ({
            key: String(i + 1),
            body: (
              <>
                <p className="m-0 text-[15px] leading-[1.45]">
                  <span data-testid="conclusion">{t.r(j.text)}</span> <b>{t.k(icdText(j.icd))}</b>{t(".")}
                </p>
                <IcdScale term={j.icd} />
                <p className="m-0 text-[12.5px] text-ink2">
                  {t("{level|t} confidence.", { level: t.k(j.confidence) })} <SourceChips dossierId={m.id} sources={j.sources} />
                </p>
              </>
            ),
          }))}
        />
      )}
    </section>
  );
}
