"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useState } from "react";
import type { ActionResult } from "@/lib/types";
import { TYPE_INFO, type DocVM, type Tone } from "./model";

// DOC-10…12 cards: type and pages, status stamp (spec §11.3 labels), title, reviewer and
// verified date, a progress bar while drafting; Open / Add debrief / Try again. The one-page
// report card is always ready and free.

const TONE: Record<Tone, string> = {
  draft: "border-[var(--notice)] text-[var(--notice-text)] bg-[var(--notice-bg)]",
  review: "border-rule-strong text-ink bg-panel2",
  approved: "border-[var(--stamp)] text-[var(--stamp)] bg-panel",
  progress: "border-rule text-ink2 bg-panel2",
  failed: "border-[var(--res)] text-[var(--res-text)] bg-panel",
  ready: "border-rule-strong text-ink bg-panel",
};

export function StatusStamp({ text, tone }: { text: string; tone: Tone }) {
  const t = useT();
  return <span className={`inline-block rounded-[var(--r-s)] border px-1.5 py-px text-[12px] font-bold leading-snug ${TONE[tone]}`}>{t.x(text)}</span>;
}

function Frame({ kicker, stamp, title, children }: { kicker: string; stamp: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-2 rounded-[var(--r-l)] border border-rule bg-panel p-4" data-testid="doc-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="m-0 text-[12.5px] font-semibold text-ink2">{kicker}</p>
        {stamp}
      </div>
      <h3 className="m-0 text-[18px] font-bold leading-tight">{title}</h3>
      {children}
    </article>
  );
}

export function DocCard({ doc, dossierId, onRetry }: { doc: DocVM; dossierId: string; onRetry: () => Promise<ActionResult<unknown>> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const info = TYPE_INFO[doc.type];
  const pages = doc.pages ? t(doc.pages === 1 ? "{n} page" : "{n} pages", { n: doc.pages }) : t.k(info.pages);
  const open = `/d/${dossierId}/docs/${encodeURIComponent(doc.id)}`;
  const canOpen = doc.hasContent || doc.hasFile;

  async function retry() {
    setBusy(true);
    setError(null);
    const r = await onRetry();
    setBusy(false);
    if (!r.ok) setError(t.x(r.error));
  }

  return (
    <Frame kicker={`${t.k(info.label)} · ${pages}`} stamp={<StatusStamp {...doc.label} />} title={t.k(doc.title)}>
      <p className="m-0 text-[13.5px] leading-[1.45] text-ink2">{t.x(doc.detail)}</p>
      {doc.status === "drafting" && (
        <div className="h-1.5 overflow-hidden rounded-[var(--r-pill)] bg-panel2" role="progressbar" aria-label={t("Drafting")} aria-valuetext={t("Drafting, about 10 minutes")}>
          <div className="h-full w-1/3 animate-pulse bg-[var(--depth3)]" />
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-[13px] text-[var(--res-text)]">
          {error}
        </p>
      )}
      <div className="mt-1 grid grid-cols-2 gap-2">
        {doc.status === "failed" ? (
          <button type="button" className="btn btn-main btn-s" onClick={retry} disabled={busy}>
            {busy ? t("Starting…") : t("Try again")}
          </button>
        ) : canOpen ? (
          <Link href={open} className="btn btn-main btn-s">
            {t("Open")}
          </Link>
        ) : (
          <span className="btn btn-ghost btn-s cursor-default opacity-60" aria-disabled="true">
            {t("Not ready yet")}
          </span>
        )}
        {doc.type === "briefing_note" && (
          <Link href={`/d/${dossierId}/tracker`} className="btn btn-ghost btn-s">
            {t("Add debrief")}
          </Link>
        )}
      </div>
    </Frame>
  );
}

/** DOC-12: the one-page report is always there, ready and free. */
export function ReportCard({ dossierId, name, hasBrief }: { dossierId: string; name: string; hasBrief: boolean }) {
  const t = useT();
  return (
    <Frame kicker={t("Entry report · 1 page A4")} stamp={<StatusStamp text={hasBrief ? "Ready · free" : "Being prepared"} tone={hasBrief ? "ready" : "progress"} />} title={t("{name}: market entry brief", { name })}>
      <p className="m-0 text-[13.5px] text-ink2">{hasBrief ? t("Print it or save it as a PDF; share the read-only link.") : t("Ready once the strategy brief is written from sourced facts.")}</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Link href={`/d/${dossierId}/report`} className="btn btn-main btn-s">
          {t("Open PDF")}
        </Link>
        <Link href={`/d/${dossierId}/brief`} className="btn btn-ghost btn-s">
          {t("Strategy brief")}
        </Link>
      </div>
    </Frame>
  );
}
