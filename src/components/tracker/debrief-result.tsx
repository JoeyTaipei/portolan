"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { influenceText, supportText } from "@/components/score/explain";
import { STAGE_LABEL, type DebriefReceipt } from "@/lib/tracker/flow";
import type { T } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import type { InfluenceFactor, SupportResult } from "@/lib/types";
import { fmtDate } from "./model";

// TRK-4 "Debrief saved — here's what changed": support old → new with the reason, the stage
// change, the agreed next step and "Strategy brief marked out of date". TRK-6 Undo (on this
// card only, plan S5 simpler version) puts everything back.

function supportReason(t: T, before: SupportResult, after: SupportResult): string {
  if (after.kind === "unknown") return t("Support isn't scored for this contact: it isn't a mapped stakeholder.");
  const n = after.basedOn;
  return `${t(n === 1 ? "Your debrief counts as an A1 source at double weight, so support was recalculated from {n} statement" : "Your debrief counts as an A1 source at double weight, so support was recalculated from {n} statements", { n })}${
    before.kind === "unknown" ? t(" (there was no sourced statement before)") : ""
  }${t(".")}`;
}

const FACTOR_WORD: Record<InfluenceFactor, string> = {
  authority: "authority",
  budget: "budget",
  access: "access",
  centrality: "network",
  recent: "recent action",
};

export function DebriefResult({
  receipt,
  dossierId,
  onUndo,
  onClose,
}: {
  receipt: DebriefReceipt;
  dossierId: string;
  onUndo: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const t = useT();
  useEffect(() => heading.current?.focus(), []);

  async function undo() {
    setBusy(true);
    setError(null);
    const err = await onUndo();
    setBusy(false);
    if (err) setError(t.x(err));
  }

  const r = receipt;
  return (
    <section aria-labelledby="result-h" data-testid="debrief-result" className="flex flex-col gap-3 rounded-[var(--r-l)] border border-[var(--done)] bg-panel p-4">
      <h2 id="result-h" ref={heading} tabIndex={-1} className="m-0 flex items-center gap-2 text-[17px] font-bold text-[var(--good)] outline-none">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
        {t("Debrief saved — here’s what changed")}
      </h2>
      <p className="m-0 text-[14px] text-ink2">{r.itemName}</p>
      <ul className="m-0 flex flex-col gap-2 pl-4 text-[14.5px] leading-snug">
        <li data-testid="support-change">
          {t("Support:")}{" "}
          <b className="num">
            {t.k(supportText(r.supportBefore))} → {t.k(supportText(r.supportAfter))}
          </b>
          <span className="block text-[13px] text-ink2">{supportReason(t, r.supportBefore, r.supportAfter)}</span>
        </li>
        {r.memoFactors.length > 0 && (
          <li data-testid="influence-change">
            {t("Influence:")}{" "}
            <b className="num">
              {t.x(influenceText(r.influenceBefore))} → {t.x(influenceText(r.influenceAfter))}
            </b>
            <span className="block text-[13px] text-ink2">
              {t("Your meeting answers updated {list}. A meeting answer replaces the research rating for its factor; Undo puts it back.", {
                list: r.memoFactors.map((f) => t.k(FACTOR_WORD[f])).join(t.locale === "zh-TW" ? "、" : ", "),
              })}
            </span>
          </li>
        )}
        <li>
          {t("Stage:")}{" "}
          {r.stageBefore === r.stageAfter ? (
            <b>{t("stays {stage|t}", { stage: t.k(STAGE_LABEL[r.stageAfter]) })}</b>
          ) : (
            <b>
              {t.k(STAGE_LABEL[r.stageBefore])} → {t.k(STAGE_LABEL[r.stageAfter])}
            </b>
          )}
        </li>
        {r.nextStep && (
          <li>
            {t("Next step added:")} <b>{r.nextStep.text}</b> · {t("due")} <span className="num">{t.x(fmtDate(r.nextStep.dueDate) ?? "")}</span>
          </li>
        )}
        {r.briefOutOfDate && (
          <li data-testid="brief-out-of-date">
            <Link href={`/d/${dossierId}/brief`}>{t("Strategy brief marked out of date")}</Link>
          </li>
        )}
      </ul>
      {r.playbookRoute && (
        <p className="m-0 border-t border-rule pt-2 text-[13px] leading-normal text-ink2">
          {t("Anonymised outcome added to the Portolan playbook for this route:")} <i>{r.playbookRoute}</i>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-s" onClick={undo} disabled={busy}>
          {busy ? t("Undoing…") : t("Undo")}
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={onClose}>
          {t("Done")}
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[var(--res-text)]">
          {error}
        </p>
      )}
    </section>
  );
}
