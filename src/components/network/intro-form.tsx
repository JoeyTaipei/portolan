"use client";

import { useId, useState } from "react";
import type { ActionResult } from "@/lib/types";
import { PURPOSE_MAX } from "./model";

// NET-6 Portolan intro (spec §11.5): who to meet is preselected, one line of purpose up to 300
// characters. No success fee. Once sent the card says "Request received — we'll update your
// tracker"; the team updates it with the ops script.
export function IntroForm({
  name,
  onSend,
  onCancel,
}: {
  name: string;
  onSend: (purpose: string) => Promise<ActionResult<unknown>>;
  onCancel: () => void;
}) {
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();
  const left = PURPOSE_MAX - purpose.length;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!purpose.trim()) {
      setError("Write one line on what the meeting is for.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await onSend(purpose.trim());
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  return (
    <form onSubmit={send} className="mt-1 flex flex-col gap-2 rounded-[var(--r-m)] border border-rule-strong bg-panel2 p-3" aria-label={`Request a Portolan intro to ${name}`}>
      <p className="m-0 text-[13px] text-ink2">
        Who to meet: <b className="text-ink">{name}</b>
      </p>
      <label htmlFor={`${uid}-p`} className="text-[13px] font-semibold">
        What is the meeting for?
      </label>
      <textarea
        id={`${uid}-p`}
        value={purpose}
        maxLength={PURPOSE_MAX}
        rows={2}
        onChange={(e) => setPurpose(e.target.value)}
        className="w-full resize-y rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 py-2 font-[inherit] text-[14.5px] text-ink"
        placeholder="e.g. Learn how their team evaluates foreign sensor suppliers"
      />
      <p className="m-0 flex justify-between gap-2 text-[12px] text-ink2">
        <span>Portolan introduces you; there is no success fee.</span>
        <span className="num">{left}</span>
      </p>
      {error && (
        <p role="alert" className="m-0 text-[13px] text-[var(--res-text)]">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-main btn-s" disabled={busy}>
          {busy ? "Sending…" : "Send request"}
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
