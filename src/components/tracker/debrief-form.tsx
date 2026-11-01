"use client";

import { useState } from "react";
import { addDays, DEFAULT_DUE_DAYS, NOTES_MAX, OVERALL_LABEL, type DebriefInput } from "@/lib/tracker/flow";
import type { DebriefOverall } from "@/lib/types";

// TRK-3: Overall is required (Save stays disabled, with the reason beside it, until one is
// picked); "Did they agree to a next step?"; notes private to the team, ≤ 1000 characters;
// TRK-5 "Add anonymised outcome to the Portolan playbook", ticked by default.

const OVERALLS: DebriefOverall[] = ["positive", "neutral", "negative"];

const pill = (on: boolean) =>
  `min-h-11 cursor-pointer rounded-[var(--r-m)] border font-[inherit] text-[14.5px] font-semibold ${
    on ? "border-[var(--tile-on)] bg-[var(--tile-on)] text-[var(--tile-on-ink)]" : "border-[var(--field-line)] bg-panel text-ink hover:bg-panel2"
  }`;

const field = "w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 font-[inherit] text-[15px] text-ink";

export function DebriefForm({
  itemId,
  now,
  onSave,
}: {
  itemId: string;
  now: Date;
  onSave: (input: DebriefInput) => Promise<string | null>;
}) {
  const [overall, setOverall] = useState<DebriefOverall | null>(null);
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [stepText, setStepText] = useState("");
  const [stepDue, setStepDue] = useState(() => addDays(now, DEFAULT_DUE_DAYS));
  const [notes, setNotes] = useState("");
  const [playbook, setPlaybook] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsStep = agreed === true && stepText.trim() === "";
  const reason = !overall ? "Pick Overall to save." : needsStep ? "Write the next step they agreed to." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!overall || reason) return;
    setBusy(true);
    setError(null);
    const err = await onSave({
      trackerItemId: itemId,
      overall,
      nextStepAgreed: agreed === true,
      notes: notes.trim() || null,
      addToPlaybook: playbook,
      nextStep: agreed ? { text: stepText.trim(), dueDate: stepDue } : null,
    });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-label="Meeting debrief">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-[13.5px] font-bold">
          Overall <span className="font-normal text-ink2">(required)</span>
        </legend>
        <div className="grid grid-cols-3 gap-1.5">
          {OVERALLS.map((o) => (
            <button key={o} type="button" aria-pressed={overall === o} className={pill(overall === o)} onClick={() => setOverall(o)}>
              {OVERALL_LABEL[o]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-[13.5px] font-bold">Did they agree to a next step?</legend>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" aria-pressed={agreed === true} className={pill(agreed === true)} onClick={() => setAgreed(true)}>
            Yes
          </button>
          <button type="button" aria-pressed={agreed === false} className={pill(agreed === false)} onClick={() => setAgreed(false)}>
            Not yet
          </button>
        </div>
      </fieldset>

      {agreed && (
        <div className="grid gap-3 rounded-[var(--r-m)] border-l-4 border-[var(--act)] bg-panel2 p-2.5 sm:grid-cols-[minmax(0,1fr)_150px]">
          <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor="debrief-step">
            Next step
            <input id="debrief-step" type="text" maxLength={300} className={`${field} min-h-11`} value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder="What you agreed to do next" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor="debrief-due">
            Due
            <input id="debrief-due" type="date" className={`${field} min-h-11`} value={stepDue} onChange={(e) => setStepDue(e.target.value || addDays(now, DEFAULT_DUE_DAYS))} />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-[13.5px] font-bold" htmlFor="debrief-notes">
        <span>
          What did they say? <span className="font-normal text-ink2">(private to your team)</span>
        </span>
        <textarea
          id="debrief-notes"
          rows={4}
          maxLength={NOTES_MAX}
          className={`${field} resize-y py-2 font-normal leading-normal`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby="debrief-notes-count"
        />
        <span id="debrief-notes-count" className="num self-end text-[12px] font-normal text-ink2">
          {notes.length} / {NOTES_MAX}
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-snug" htmlFor="debrief-playbook">
        <input id="debrief-playbook" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" checked={playbook} onChange={(e) => setPlaybook(e.target.checked)} />
        <span>
          <b>Add anonymised outcome to the Portolan playbook</b>
          <span className="block text-[12.5px] text-ink2">Only the route, category, overall and next step. No names, no notes, never shown to other clients.</span>
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <button type="submit" className="btn btn-act w-full disabled:cursor-not-allowed disabled:opacity-55" disabled={reason !== null || busy} aria-describedby={reason ? "debrief-reason" : undefined}>
          {busy ? "Saving…" : "Save debrief"}
        </button>
        {reason && (
          <p id="debrief-reason" className="m-0 text-[13px] text-ink2">
            {reason}
          </p>
        )}
        {error && (
          <p role="alert" className="m-0 text-[13px] font-semibold text-[var(--res-text)]">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
