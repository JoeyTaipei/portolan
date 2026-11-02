import Link from "next/link";
import { icdText } from "@/components/score/icd-scale";
import { getT } from "@/lib/i18n/server";
import { BrandLine } from "./brand-bar";
import type { HomeModel } from "./model";
import { RelativeTime } from "./relative-time";
import { SourceChips } from "@/components/score/source-chip";

// HOME-3 market header: stamps, country + refreshed, name, the bottom line (first sourced key
// judgment) and the two main actions.
export async function MarketHeader({ m }: { m: HomeModel }) {
  const line = m.judgments[0];
  const t = await getT();
  return (
    <section aria-labelledby="mk-h" className="flex flex-col gap-3">
      <BrandLine />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-[var(--r-s)] px-2 py-[3px] text-[12px] font-bold ${
            m.verified ? "bg-[var(--tag-bg)] text-[var(--tag-ink)]" : "border border-rule-strong text-ink"
          }`}
        >
          {m.verified ? t("Verified market") : t("Partial")}
        </span>
        {m.isSample && <span className="sample">{t("Sample data")}</span>}
        <span className="text-[13px] text-ink2">
          {t.k(m.country)}
          {m.refreshedAt && (
            <>
              {" "}
              · {t("refreshed")} <RelativeTime iso={m.refreshedAt} />
            </>
          )}
        </span>
      </div>
      <h1 id="mk-h" className="m-0 text-[34px] font-bold leading-[1.05] tracking-[-.01em] lg:text-[46px]">
        {t.r(m.name)}
      </h1>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[13px] text-ink2">
        {t("Entry verdict")}
        <span className={`verdict-stamp ${m.verdict.kind}`} data-testid="home-verdict">
          {t.k(m.verdict.label)}
        </span>
      </p>
      {line ? (
        <p className="m-0 max-w-[50ch] text-[19px] leading-[1.4] lg:text-[23px]">
          <b>{t("Bottom line:")}</b> <span data-testid="conclusion">{t.r(line.text)}</span> <span className="text-ink2">{t.k(icdText(line.icd))}{t(".")}</span>{" "}
          <SourceChips dossierId={m.id} sources={line.sources} />
        </p>
      ) : (
        <p className="m-0 text-[16px] text-ink2">{t("No bottom line yet. It comes from the strategy brief.")}</p>
      )}
      {m.verdict.lead && (
        <div className="max-w-[60ch] text-[14.5px] leading-[1.45]">
          <p className="m-0 font-bold text-[var(--act-text)]">{t.k(m.verdict.lead)}</p>
          <ul className="m-0 list-disc pl-5">
            {m.verdict.reasons.map((x) => (
              <li key={x.text}>
                <span data-testid="conclusion">{t.k(x.text)}</span> {x.refs.length > 0 && <SourceChips dossierId={m.id} sources={x.refs} />}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-2.5">
        <Link href={`/d/${m.id}/map`} className="btn btn-main">
          {t("Open stakeholder map")}
        </Link>
        <Link href={`/d/${m.id}/report`} className="btn btn-ghost">
          {t("One-page A4 report")}
        </Link>
      </div>
    </section>
  );
}
