"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { EvidenceCard } from "@/components/brief/evidence";
import type { SourcesVM } from "./model";

// Sources page list: filter by stakeholder (?s=) or type (?type=); ?id=S12 scrolls to and
// marks that source. Every row has its grade stamp and verified date; over 90 days → "Recheck due".
export function SourceList({ m, title, intro }: { m: SourcesVM; title: string; intro: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const s = params.get("s") ?? "";
  const type = params.get("type") ?? "";
  const focus = params.get("id");

  const rows = m.rows.filter((r) => (!s || r.stakeholderIds.includes(s)) && (!type || r.sourceType === type));

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`src-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("id");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const field =
    "min-h-11 w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 text-[14.5px] text-ink";

  return (
    <div className="flex flex-col gap-5 px-4 pt-[18px] pb-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:px-6 min-[1600px]:grid-cols-[300px_minmax(0,1fr)] min-[1600px]:px-8">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <div>
          <h1 className="m-0 text-[28px] font-extrabold leading-[1.02]">{title}</h1>
          <p className="mt-1.5 mb-0 text-[14px] leading-normal text-ink2">{intro}</p>
        </div>
        {m.stakeholders.length > 0 && (
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            Stakeholder
            <select className={field} value={s} onChange={(e) => set("s", e.target.value)}>
              <option value="">All stakeholders</option>
              {m.stakeholders.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Type
          <select className={field} value={type} onChange={(e) => set("type", e.target.value)}>
            <option value="">All types</option>
            {m.types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <p className="m-0 text-[13.5px] text-ink2" role="status" data-testid="source-count">
          {rows.length} of {m.rows.length} sources shown
        </p>
      </div>

      <div>
        {rows.length === 0 ? (
          <div className="nis inline" role="status" data-state="empty">
            <h2>{m.rows.length === 0 ? "No sources yet" : "No source fits these filters"}</h2>
            <p>
              {m.rows.length === 0
                ? "Sources appear here once research has accepted them."
                : "Nothing matches this stakeholder and type together."}
            </p>
            {m.rows.length > 0 && (
              <div className="acts">
                <button type="button" className="btn btn-main" onClick={() => router.replace(pathname, { scroll: false })}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <ol className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 lg:grid-cols-2 min-[1800px]:grid-cols-3">
            {rows.map((r) => (
              <li
                key={r.id}
                id={`src-${r.label}`}
                className={`scroll-mt-4 flex flex-col gap-2 ${focus === r.label ? "rounded-[var(--r-l)] outline-2 outline-offset-2 outline-[var(--focus)]" : ""}`}
              >
                <EvidenceCard e={r} />
                {r.facts.length > 0 && (
                  <details className="px-1 text-[13.5px]">
                    <summary className="cursor-pointer font-semibold">
                      Backs up {r.facts.length} fact{r.facts.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-1 mb-0 flex flex-col gap-1 pl-4 leading-snug text-ink2">
                      {r.facts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
