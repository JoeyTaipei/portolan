"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supportText } from "@/components/score/explain";
import { STAGE_LABEL, type DebriefReceipt } from "@/lib/tracker/flow";
import type { SupportResult } from "@/lib/types";
import { fmtDate } from "./model";

// TRK-4 "Debrief saved — here's what changed": support old → new with the reason, the stage
// change, the agreed next step and "Strategy brief marked out of date". TRK-6 Undo (on this
// card only, plan S5 simpler version) puts everything back.

function supportReason(before: SupportResult, after: SupportResult): string {
  if (after.kind === "unknown") return "Support isn't scored for this contact: it isn't a mapped stakeholder.";
  const n = after.basedOn;
  return `Your debrief counts as an A1 source at double weight, so support was recalculated from ${n} statement${n === 1 ? "" : "s"}${
    before.kind === "unknown" ? " (there was no sourced statement before)" : ""
  }.`;
}

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
  useEffect(() => heading.current?.focus(), []);

  async function undo() {
    setBusy(true);
    setError(null);
    const err = await onUndo();
    setBusy(false);
    if (err) setError(err);
  }

  const r = receipt;
  return (
    <section aria-labelledby="result-h" data-testid="debrief-result" className="flex flex-col gap-3 rounded-[var(--r-l)] border border-[var(--done)] bg-panel p-4">
      <h2 id="result-h" ref={heading} tabIndex={-1} className="m-0 flex items-center gap-2 text-[17px] font-bold text-[var(--good)] outline-none">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
        Debrief saved — here&rsquo;s what changed
      </h2>
      <p className="m-0 text-[14px] text-ink2">{r.itemName}</p>
      <ul className="m-0 flex flex-col gap-2 pl-4 text-[14.5px] leading-snug">
        <li data-testid="support-change">
          Support:{" "}
          <b className="num">
            {supportText(r.supportBefore)} → {supportText(r.supportAfter)}
          </b>
          <span className="block text-[13px] text-ink2">{supportReason(r.supportBefore, r.supportAfter)}</span>
        </li>
        <li>
          Stage:{" "}
          {r.stageBefore === r.stageAfter ? (
            <b>stays {STAGE_LABEL[r.stageAfter]}</b>
          ) : (
            <b>
              {STAGE_LABEL[r.stageBefore]} → {STAGE_LABEL[r.stageAfter]}
            </b>
          )}
        </li>
        {r.nextStep && (
          <li>
            Next step added: <b>{r.nextStep.text}</b> · due <span className="num">{fmtDate(r.nextStep.dueDate)}</span>
          </li>
        )}
        {r.briefOutOfDate && (
          <li data-testid="brief-out-of-date">
            <Link href={`/d/${dossierId}/brief`}>Strategy brief marked out of date</Link>
          </li>
        )}
      </ul>
      {r.playbookRoute && (
        <p className="m-0 border-t border-rule pt-2 text-[13px] leading-normal text-ink2">
          Anonymised outcome added to the Portolan playbook for this route: <i>{r.playbookRoute}</i>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-s" onClick={undo} disabled={busy}>
          {busy ? "Undoing…" : "Undo"}
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={onClose}>
          Done
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
