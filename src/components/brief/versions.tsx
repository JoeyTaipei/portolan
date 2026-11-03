"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { estimateRebrief, rebrief, type RebriefEstimate } from "@/app/actions/research";
import type { BriefStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

// BRIEF-1: version list, Out of date with its reasons, and RE-BRIEF (cost shown first, then
// confirm). The sample never rewrites: no request, no paid API.
export function Versions({
  dossierId,
  isSample,
  version,
  versions,
  status,
}: {
  dossierId: string;
  isSample: boolean;
  version: number;
  versions: { version: number; createdAt: string; current: boolean }[];
  status: BriefStatus;
}) {
  const [pending, start] = useTransition();
  const [estimate, setEstimate] = useState<RebriefEstimate | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const t = useT();
  const sampleReason = t("The sample brief can't be rewritten. Your own markets can.");

  const ask = () => {
    if (isSample) {
      setMsg(sampleReason);
      return;
    }
    setMsg(null);
    start(async () => {
      const r = await estimateRebrief(dossierId);
      if (r.ok) setEstimate(r.data);
      else setMsg(t.x(r.error));
    });
  };
  const confirm = () => {
    start(async () => {
      const r = await rebrief(dossierId);
      setEstimate(null);
      setMsg(r.ok ? t("Writing version {n}…", { n: r.data.version }) : t.x(r.error));
    });
  };

  return (
    <section aria-labelledby="ver-h" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="ver-h" className="m-0 text-[15px] font-bold">
          {t("Version")} <span className="num">{version}</span>
        </h2>
        {status.outOfDate ? (
          <span className="rounded-[var(--r-s)] border border-[var(--notice)] px-1.5 text-[12px] font-bold text-[var(--notice-text)]">
            {t("Out of date")}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink2">{t("Up to date")}</span>
        )}
      </div>
      {status.outOfDate && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] leading-snug text-ink2" data-testid="out-of-date-reasons">
          {status.reasons.map((r) => (
            <li key={r}>{t.x(r)}</li>
          ))}
        </ul>
      )}
      <ol className="m-0 flex list-none flex-col p-0 text-[13.5px]" aria-label={t("Versions")}>
        {versions.map((v) => (
          <li key={v.version} className="border-t border-rule py-1.5 last:border-b">
            {v.current ? (
              <span className="font-semibold" aria-current="page">
                {t("v{n} · {date} (showing)", { n: v.version, date: t.date(v.createdAt, { utc: true }) })}
              </span>
            ) : (
              <Link href={`/d/${dossierId}/brief?v=${v.version}`}>
                {t("v{n} · {date}", { n: v.version, date: t.date(v.createdAt, { utc: true }) })}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {estimate ? (
        <div className="flex flex-col gap-2 rounded-[var(--r-m)] border border-rule-strong bg-panel p-3 text-[13.5px]">
          <p className="m-0">{t.x(estimate.text)}</p>
          <p className="m-0 text-ink2">{t("{n} rewrites left today.", { n: estimate.remainingToday })}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-main btn-s" disabled={pending} onClick={confirm}>
              {pending ? t("Starting…") : t("Rewrite the brief")}
            </button>
            <button type="button" className="btn btn-ghost btn-s" onClick={() => setEstimate(null)}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-s self-start aria-disabled:cursor-not-allowed aria-disabled:opacity-55"
          aria-disabled={isSample}
          aria-busy={pending}
          title={isSample ? sampleReason : undefined}
          onClick={ask}
        >
          {pending ? t("Checking the cost…") : t("Re-brief")}
        </button>
      )}
      {msg && (
        <p role="status" className="m-0 text-[12.5px] text-ink2">
          {msg}
        </p>
      )}
    </section>
  );
}
