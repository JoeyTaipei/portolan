"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { estimatePartnerQuestions, writeTailoredQuestions, type PartnerQuestionsEstimate } from "@/app/actions/partner-questions";
import { useT } from "@/lib/i18n/client";

// NET-8: one button for the whole Partners tab. Shows the cost first (nothing is spent), then
// writes after the user confirms. The sample never calls Claude; it explains instead.

export function QuestionsControl({ dossierId, isSample, hasTailored }: { dossierId: string; isSample: boolean; hasTailored: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [estimate, setEstimate] = useState<PartnerQuestionsEstimate | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const label = hasTailored ? "Rewrite the questions" : "Write tailored questions";

  const ask = () => {
    if (isSample) {
      setMsg(t.x("The sample's questions are built from its sourced facts. Your own markets can have Claude write them."));
      return;
    }
    setMsg(null);
    start(async () => {
      const r = await estimatePartnerQuestions(dossierId);
      if (r.ok) setEstimate(r.data);
      else setMsg(t.x(r.error));
    });
  };
  const confirm = () =>
    start(async () => {
      const r = await writeTailoredQuestions(dossierId);
      setEstimate(null);
      if (r.ok) {
        setMsg(t("Written for {n} candidates.", { n: r.data.written }));
        router.refresh();
      } else setMsg(t.x(r.error));
    });

  return (
    <div className="mb-3 flex flex-col items-start gap-2" data-testid="questions-control">
      {estimate ? (
        <div className="flex flex-col gap-2 rounded-[var(--r-m)] border border-rule-strong bg-panel p-3 text-[13.5px]">
          <p className="m-0">{t.x(estimate.text)}</p>
          <p className="m-0 text-ink2">{t("{n} runs left today.", { n: estimate.remainingToday })}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-main btn-s" disabled={pending} aria-busy={pending} onClick={confirm}>
              {pending ? t("Writing…") : t("Write the questions")}
            </button>
            <button type="button" className="btn btn-ghost btn-s" disabled={pending} onClick={() => setEstimate(null)}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-s" aria-busy={pending} disabled={pending} onClick={ask}>
          {pending ? t("Checking the cost…") : t.k(label)}
        </button>
      )}
      {msg && (
        <p className="m-0 text-[13px] text-ink2" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
