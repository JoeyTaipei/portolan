"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useId, useState } from "react";
import type { ActionResult, DocumentType } from "@/lib/types";
import { TYPE_INFO, type MeetingOption } from "./model";

// DOC-2…6: "+ Request a document" / "Close", the three types, which meeting (briefing note
// only; none → "Add someone to your tracker first"), the expert review switch with its
// copy, then "Request …" → "Request received" with the expected finish.

export interface RequestInput {
  type: DocumentType;
  trackerItemId: string | null;
  expertReview: boolean;
}

const TYPES: DocumentType[] = ["briefing_note", "risk_deck", "watch_list"];

export function RequestForm({
  dossierId,
  meetings,
  preselect,
  etaText,
  onRequest,
}: {
  dossierId: string;
  meetings: MeetingOption[];
  preselect: string | null;
  etaText: string;
  onRequest: (input: RequestInput) => Promise<ActionResult<{ received: string }>>;
}) {
  const [open, setOpen] = useState(preselect !== null);
  const [type, setType] = useState<DocumentType>("briefing_note");
  const [item, setItem] = useState(preselect && meetings.some((m) => m.id === preselect) ? preselect : (meetings[0]?.id ?? ""));
  const [expert, setExpert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const uid = useId();
  const isNote = type === "briefing_note";
  const blocked = isNote && meetings.length === 0;
  const t = useT();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;
    setBusy(true);
    setError(null);
    const r = await onRequest({ type, trackerItemId: isNote ? item || null : null, expertReview: isNote && expert });
    setBusy(false);
    if (r.ok) {
      setDone(r.data.received);
      setOpen(false);
    } else setError(t.x(r.error));
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="btn btn-main w-full"
        aria-expanded={open}
        aria-controls={`${uid}-form`}
        onClick={() => {
          setOpen(!open);
          setDone(null);
        }}
      >
        {open ? t("Close") : t("+ Request a document")}
      </button>

      {done && (
        <p role="status" className="m-0 rounded-[var(--r-m)] border border-rule-strong bg-panel px-3 py-2.5 text-[13.5px] leading-[1.45]">
          <b>{t("Request received.")}</b> {done}
        </p>
      )}

      {open && (
        <form id={`${uid}-form`} onSubmit={submit} className="flex flex-col gap-4 rounded-[var(--r-l)] border border-rule bg-panel p-4" aria-label={t("Request a document")}>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[13px] font-bold">{t("Document")}</legend>
            {TYPES.map((k) => (
              <label
                key={k}
                className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-[var(--r-m)] border px-3 py-2 ${type === k ? "border-rule-strong bg-panel2" : "border-rule"}`}
              >
                <input type="radio" name={`${uid}-type`} value={k} checked={type === k} onChange={() => setType(k)} className="mt-1 accent-[var(--ink)]" />
                <span className="text-[14px] leading-snug">
                  <b>{t.k(TYPE_INFO[k].label)}</b>
                  <span className="block text-[12.5px] text-ink2">
                    {t.k(TYPE_INFO[k].pages)} · {t.k(TYPE_INFO[k].desc.toLowerCase())}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {isNote && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${uid}-item`} className="text-[13px] font-bold">
                {t("Which meeting or stakeholder")}
              </label>
              {blocked ? (
                <p className="m-0 text-[13.5px] text-ink2">
                  {t("Add someone to your tracker first.")}{" "}
                  <Link href={`/d/${dossierId}/map`} className="font-semibold text-[var(--link)]">
                    {t("Open the map")}
                  </Link>
                </p>
              ) : (
                <select
                  id={`${uid}-item`}
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="min-h-11 w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 font-[inherit] text-[15px] text-ink"
                >
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {isNote ? (
            <div className="flex flex-col gap-1.5">
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[14px] font-semibold">
                {t("Expert review")}
                <input type="checkbox" role="switch" checked={expert} onChange={(e) => setExpert(e.target.checked)} className="h-5 w-9 accent-[var(--ink)]" />
              </label>
              <p className="m-0 text-[13px] leading-[1.45] text-ink2" aria-live="polite">
                {expert
                  ? t("AI draft in about 10 minutes, then expert review {eta|t}.", { eta: t.k(etaText) })
                  : t("AI draft in about 10 minutes. Not reviewed — check names and dates before sharing.")}
              </p>
            </div>
          ) : (
            <p className="m-0 text-[13px] leading-[1.45] text-ink2">{t("A manual service: the Portolan team prepares it and uploads the PDF here.")}</p>
          )}

          {error && (
            <p role="alert" className="m-0 text-[13px] text-[var(--res-text)]">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-main" disabled={busy || blocked}>
            {busy ? t("Sending…") : t("Request {doc|t}", { doc: t.k(TYPE_INFO[type].label.toLowerCase()) })}
          </button>
        </form>
      )}
    </div>
  );
}
