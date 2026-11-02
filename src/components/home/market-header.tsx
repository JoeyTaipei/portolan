import Link from "next/link";
import { icdText } from "@/components/score/icd-scale";
import { BrandLine } from "./brand-bar";
import type { HomeModel } from "./model";
import { RelativeTime } from "./relative-time";
import { SourceStamps } from "./source-stamps";

// HOME-3 market header: stamps, country + refreshed, name, the bottom line (first sourced key
// judgment) and the two main actions.
export function MarketHeader({ m }: { m: HomeModel }) {
  const line = m.judgments[0];
  return (
    <section aria-labelledby="mk-h" className="flex flex-col gap-3">
      <BrandLine />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-[var(--r-s)] px-2 py-[3px] text-[12px] font-bold ${
            m.verified ? "bg-[var(--tag-bg)] text-[var(--tag-ink)]" : "border border-rule-strong text-ink"
          }`}
        >
          {m.verified ? "Verified market" : "Partial"}
        </span>
        {m.isSample && <span className="sample">Sample data</span>}
        <span className="text-[13px] text-ink2">
          {m.country}
          {m.refreshedAt && (
            <>
              {" "}
              · refreshed <RelativeTime iso={m.refreshedAt} />
            </>
          )}
        </span>
      </div>
      <h1 id="mk-h" className="m-0 text-[34px] font-bold leading-[1.05] tracking-[-.01em] lg:text-[46px]">
        {m.name}
      </h1>
      {line ? (
        <p className="m-0 max-w-[50ch] text-[19px] leading-[1.4] lg:text-[23px]">
          <b>Bottom line:</b> {line.text} <span className="text-ink2">{icdText(line.icd)}.</span>{" "}
          <SourceStamps dossierId={m.id} sources={line.sources} />
        </p>
      ) : (
        <p className="m-0 text-[16px] text-ink2">No bottom line yet. It comes from the strategy brief.</p>
      )}
      <div className="mt-1 flex flex-wrap gap-2.5">
        <Link href={`/d/${m.id}/map`} className="btn btn-main">
          Open stakeholder map
        </Link>
        <Link href={`/d/${m.id}/report`} className="btn btn-ghost">
          One-page A4 report
        </Link>
      </div>
    </section>
  );
}
