"use client";

import { useT } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { sampleBriefingNote } from "@/app/actions/drafts";
import { requestDocument, retryDraft } from "@/app/d/[id]/docs/actions";
import { useFillHeight } from "@/components/map/fill-height";
import { OVERLAY_EVENT, readOverlay, writeOverlay } from "@/lib/sample/overlay";
import type { ActionResult, DocumentRequest, PortolanDocument, SampleOverlay } from "@/lib/types";
import { DocCard, ReportCard } from "./doc-card";
import { docVM, meetingOptions, TYPE_INFO, type DocsVM } from "./model";
import { RequestForm, type RequestInput } from "./request-form";
import { WatchList } from "./watch-list";

// 07 Documents (spec §12). Three columns from 1024px (320 | 1fr | 340, ≥1600 360 | 1fr | 400):
// request form / your documents / watch list, each scrolling on its own. Phones: request
// button → documents → watch list. The sample works on this browser's copy (SHELL-3): a
// briefing note request there returns the sample's pre-written note and never calls Claude.

const NO_STORAGE = "This browser won't save changes. Allow site storage and try again.";
/** Real dossiers: while a draft is being written, look again every few seconds. */
const POLL_MS = 5000;

export function DocsView({ vm, preselect, footer }: { vm: DocsVM; preselect: string | null; footer?: ReactNode }) {
  const [overlay, setOverlay] = useState<SampleOverlay | null>(null);
  const ref = useFillHeight<HTMLDivElement>();
  const router = useRouter();
  const t = useT();
  const { dossierId, isSample } = vm;

  useEffect(() => {
    if (!isSample) return;
    const read = () => setOverlay(readOverlay());
    read();
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [isSample]);

  const documents = (isSample && overlay?.documents) || vm.documents;
  const requests = (isSample && overlay?.documentRequests) || vm.documentRequests;
  const tracker = (isSample && overlay?.tracker) || vm.tracker;
  const docs = useMemo(() => [...documents].reverse().map((d) => docVM(d, requests, vm.etaText)), [documents, requests, vm.etaText]);
  const meetings = useMemo(() => meetingOptions(vm.targets, tracker), [vm.targets, tracker]);
  const drafting = docs.some((d) => d.status === "drafting");

  useEffect(() => {
    if (isSample || !drafting) return;
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [isSample, drafting, router]);

  async function request(input: RequestInput): Promise<ActionResult<{ received: string }>> {
    const isNote = input.type === "briefing_note";
    const received = isNote
      ? input.expertReview
        ? t("AI draft in about 10 minutes, then expert review {eta|t}.", { eta: t.k(vm.etaText) })
        : t("AI draft in about 10 minutes. Not reviewed — check names and dates before sharing.")
      : t("The Portolan team prepares it and uploads the PDF here.");
    if (!isSample) {
      if (isNote && !input.trackerItemId) return { ok: false, error: t("Pick the meeting first.") };
      const r = isNote
        ? await requestDocument(dossierId, { type: "briefing_note", trackerItemId: input.trackerItemId as string, expertReview: input.expertReview })
        : await requestDocument(dossierId, { type: input.type as "risk_deck" | "watch_list" });
      return r.ok ? { ok: true, data: { received } } : r;
    }
    return sampleRequest(input, received);
  }

  async function sampleRequest(input: RequestInput, received: string): Promise<ActionResult<{ received: string }>> {
    const now = new Date().toISOString();
    const req: DocumentRequest = { id: `req-${crypto.randomUUID()}`, dossierId, type: input.type, trackerItemId: input.trackerItemId, expertReview: input.expertReview, createdAt: now };
    let doc: PortolanDocument = {
      id: `doc-${crypto.randomUUID()}`,
      dossierId,
      requestId: req.id,
      type: input.type,
      title: input.type === "risk_deck" ? "Taiwan market and policy risk" : input.type === "watch_list" ? "90–180 day watch" : "",
      pages: input.type === "risk_deck" ? 4 : input.type === "briefing_note" ? 3 : null,
      status: "requested",
      reviewerName: null,
      reviewerKind: null,
      factsCheckedAt: null,
      content: null,
      storagePath: null,
      nextUpdateAt: null,
      changesNote: null,
      createdAt: now,
    };
    if (input.type === "briefing_note") {
      const note = await sampleBriefingNote({ trackerItemId: input.trackerItemId, stakeholderId: null });
      if (!note.ok) return note;
      const who = meetings.find((m) => m.id === input.trackerItemId)?.name ?? "Meeting";
      doc = { ...doc, title: `${who}: briefing note`, status: input.expertReview ? "in_review" : "draft_ready", content: note.data, factsCheckedAt: now.slice(0, 10) };
    }
    const o = readOverlay();
    const ok = writeOverlay("documentRequests", [...(o.documentRequests ?? vm.documentRequests), req]) && writeOverlay("documents", [...(o.documents ?? vm.documents), doc]);
    return ok ? { ok: true, data: { received } } : { ok: false, error: NO_STORAGE };
  }

  async function retry(id: string): Promise<ActionResult<unknown>> {
    if (isSample) return { ok: false, error: t("Sample drafts don't fail. Reset the sample to start again.") };
    return retryDraft(dossierId, id);
  }

  return (
    <div
      ref={ref}
      className="flex flex-col gap-5 px-4 pt-[18px] pb-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[360px_minmax(0,1fr)_400px]"
    >
      <div className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-rule-strong lg:px-5 lg:py-[22px]">
        <header>
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 text-[13px] text-ink2">{t("Documents")}</p>
            <span className="rounded-[var(--r-s)] bg-[var(--btn-bg)] px-1.5 py-px text-[12px] font-bold text-[var(--btn-ink)]" title={t("Plan labels are shown only; there is no payment yet")}>
              {t("Connect plan")}
            </span>
          </div>
          <h1 className="mt-0.5 mb-0 text-[28px] font-extrabold leading-[1.02] min-[1600px]:text-[31px]">{t("Advisory documents")}</h1>
          <p className="m-0 mt-1 text-[14px] text-ink2">{t("AI-drafted, expert-reviewed · {name}", { name: vm.name })}</p>
        </header>
        <RequestForm dossierId={dossierId} meetings={meetings} preselect={preselect} etaText={vm.etaText} onRequest={request} />
        <ul className="m-0 hidden list-none flex-col gap-1.5 p-0 text-[13px] text-ink2 lg:flex">
          {(["briefing_note", "risk_deck", "watch_list"] as const).map((k) => (
            <li key={k}>
              <b className="text-ink">{t.k(TYPE_INFO[k].label)}</b> · {t.k(TYPE_INFO[k].pages)} · {t.k(TYPE_INFO[k].desc.toLowerCase())}
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="docs-h" className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:px-6 lg:py-[22px] min-[1600px]:px-8">
        <h2 id="docs-h" className="m-0 text-[13px] font-bold text-ink2">
          {t("Your documents")}
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[1360px]:grid-cols-2" data-testid="doc-grid">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} dossierId={dossierId} onRetry={() => retry(d.id)} />
          ))}
          <ReportCard dossierId={dossierId} name={vm.name} hasBrief={vm.hasBrief} />
        </div>
        {docs.length === 0 && <p className="m-0 text-[13.5px] text-ink2">{t("Request a briefing note before your next meeting; it appears here.")}</p>}
      </section>

      <aside className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-rule-strong lg:bg-panel2 lg:px-5 lg:py-[18px] min-[1600px]:px-6">
        <WatchList dossierId={dossierId} items={vm.watch} nextUpdate={vm.nextUpdate} />
        {footer}
      </aside>
    </div>
  );
}
