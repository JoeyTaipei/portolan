"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "@/components/report/report.css";
import { PaperFit } from "@/components/report/report-toolbar";
import type { SourceRef } from "@/components/score/explain";
import { Stamp } from "@/components/score/stamp";
import { Nis } from "@/components/shell/nis";
import { OVERLAY_EVENT, readOverlay } from "@/lib/sample/overlay";
import type { NoteSection, PortolanDocument } from "@/lib/types";
import { fmtDay, NOT_REVIEWED, statusLabel } from "./model";
import "./note.css";

// 08 Briefing note (NOTE-1…5): three A4 pages printed with the browser (no server PDF).
// Page 1: header, review stamp (§11.3 labels), prepared for, meeting, the four sections;
// page 2: talking points and asks; page 3: risks and the full source list. Every page's footer
// lists the sources cited on it with their grade and checked date, "not legal advice" and
// the page number. Uploaded PDFs (risk deck, watch list) open in an embedded viewer instead.

export interface NoteProps {
  dossierId: string;
  isSample: boolean;
  /** Null on the sample when the document lives only in this browser (SHELL-3). */
  doc: PortolanDocument | null;
  docId: string;
  refs: Record<string, SourceRef>;
  names: Record<string, string>;
  etaText: string;
}

const PAGES: { keys: string[]; label: string }[] = [
  { keys: ["objective", "stakeholder", "views", "pitch"], label: "continues: talking points, suggested asks" },
  { keys: ["talking", "asks"], label: "continues: risks and sensitivities, sources" },
  { keys: ["risks"], label: "end of briefing" },
];

const NONE = "Not enough sourced facts for this section.";

function Cites({ ids, refs, dossierId }: { ids: string[]; refs: Record<string, SourceRef>; dossierId: string }) {
  const shown = ids.flatMap((id) => refs[id] ?? []);
  if (!shown.length) return null;
  return (
    <sup className="bn-cite">
      {shown.map((r, i) => (
        <span key={r.id}>
          {i > 0 && ","}
          <a href={`/d/${dossierId}/sources?id=${encodeURIComponent(r.id)}`} title={r.title}>
            {r.label}
          </a>
        </span>
      ))}
    </sup>
  );
}

function Section({ s, n, refs, dossierId }: { s: NoteSection; n: number | null; refs: Record<string, SourceRef>; dossierId: string }) {
  const title = n ? `Section ${n} · ${s.title}` : s.title;
  const body =
    s.sentences.length === 0 ? (
      <p className="none">{NONE}</p>
    ) : s.kind === "bullets" ? (
      <ul>
        {s.sentences.map((x) => (
          <li key={x.text}>
            {x.text}
            <Cites ids={x.sourceIds} refs={refs} dossierId={dossierId} />
          </li>
        ))}
      </ul>
    ) : s.kind === "quote" ? (
      <blockquote>
        {s.sentences.map((x) => (
          <span key={x.text}>
            &ldquo;{x.text}&rdquo;
            <Cites ids={x.sourceIds} refs={refs} dossierId={dossierId} />{" "}
          </span>
        ))}
      </blockquote>
    ) : (
      <p>
        {s.sentences.map((x) => (
          <span key={x.text}>
            {x.text}
            <Cites ids={x.sourceIds} refs={refs} dossierId={dossierId} />{" "}
          </span>
        ))}
      </p>
    );
  return (
    <section className="bn-sec" aria-label={s.title}>
      <h2>{title}</h2>
      {body}
      {s.note && s.sentences.length > 0 && <p className="note">{s.note}</p>}
    </section>
  );
}

function Footer({ ids, refs, page, label, full }: { ids: string[]; refs: Record<string, SourceRef>; page: number; label: string; full: boolean }) {
  const shown = [...new Set(ids)].flatMap((id) => refs[id] ?? []);
  return (
    <footer className="bn-foot">
      {shown.length > 0 && (
        <p className="src">
          <b>{full ? "All sources" : "Sources on this page"}.</b>{" "}
          {shown.map((r, i) => (
            <span key={r.id}>
              {i > 0 && " · "}
              {r.label} {r.title.length > 70 ? `${r.title.slice(0, 68)}…` : r.title}
              <Stamp reliability={r.reliability} credibility={r.credibility} />
              checked {fmtDay(r.verifiedAt) ?? "date unverified"}
            </span>
          ))}
        </p>
      )}
      <p className="line m-0">
        <span>
          Page {page} of {PAGES.length} · {label}
        </span>
        <span>Portolan · research reference, not legal advice</span>
      </p>
    </footer>
  );
}

function reviewBox(doc: PortolanDocument, etaText: string) {
  const label = statusLabel(doc);
  const checked = fmtDay(doc.factsCheckedAt);
  if (doc.status === "approved") {
    return (
      <div className="bn-review">
        <b>✓ {label.text}</b>
        {doc.reviewerKind === "expert" && doc.reviewerName && <span className="block">{doc.reviewerName}</span>}
        {checked && <span className="block">Facts checked {checked}</span>}
      </div>
    );
  }
  if (doc.status === "in_review" || doc.status === "changes_needed") {
    return (
      <div className="bn-review">
        <b>{label.text}</b>
        <span className="block">Expected finish {etaText}</span>
        {checked && <span className="block">AI draft checked {checked}</span>}
      </div>
    );
  }
  return (
    <div className="bn-review is-draft">
      <b>AI draft · not reviewed</b>
      <span className="block">Check names and dates before sharing.</span>
      {checked && <span className="block">Facts checked {checked}</span>}
    </div>
  );
}

function Pages({ doc, refs, names, dossierId, isSample, etaText }: { doc: PortolanDocument; refs: Record<string, SourceRef>; names: Record<string, string>; dossierId: string; isSample: boolean; etaText: string }) {
  const c = doc.content!;
  const who = (c.stakeholderId && names[c.stakeholderId]) || doc.title.replace(/: briefing note$/, "");
  const meeting = c.meeting.at ? [fmtDay(c.meeting.at), c.meeting.place, c.meeting.length].filter(Boolean).join(" · ") : "Meeting time: needs from you";
  const numbered = ["objective", "stakeholder", "views", "pitch"];
  return (
    <>
      {PAGES.map((p, i) => {
        const sections = p.keys.flatMap((k) => c.sections.find((s) => s.key === k) ?? []);
        const ids = sections.flatMap((s) => s.sentences.flatMap((x) => x.sourceIds));
        const last = i === PAGES.length - 1;
        return (
          <div key={p.label} className="bn-page">
            <PaperFit>
              <article className="rp-sheet bn-sheet" aria-label={`Page ${i + 1} of ${PAGES.length}`}>
                {i === 0 && (
                  <>
                    <header className="bn-head">
                      <div>
                        <p className="bn-kick">
                          Strategic advisory · Confidential · Client briefing note {isSample && <span className="sample ml-1">Sample data</span>}
                        </p>
                        <h1>Stakeholder briefing: {who}</h1>
                        <p className="sub">Ahead of a meeting with {who}</p>
                      </div>
                      {reviewBox(doc, etaText)}
                    </header>
                    <div className="bn-strip">
                      <div>
                        <span className="k">Prepared for</span>
                        {c.preparedFor}
                      </div>
                      <div>
                        <span className="k">Meeting</span>
                        {meeting}
                      </div>
                      <div>
                        <span className="k">After the meeting</span>
                        Debrief in Portolan within 24 h
                      </div>
                    </div>
                  </>
                )}
                {i > 0 && (
                  <p className="bn-kick">
                    Stakeholder briefing: {who} · {doc.status === "approved" ? statusLabel(doc).text : NOT_REVIEWED}
                  </p>
                )}
                {sections.map((s) => (
                  <Section key={s.key} s={s} n={numbered.includes(s.key) ? numbered.indexOf(s.key) + 1 : null} refs={refs} dossierId={dossierId} />
                ))}
                <Footer ids={last ? c.sourceIds : ids} refs={refs} page={i + 1} label={p.label} full={last} />
              </article>
            </PaperFit>
          </div>
        );
      })}
    </>
  );
}

function Toolbar({ dossierId, printable }: { dossierId: string; printable: boolean }) {
  return (
    <div className="rp-toolbar">
      <Link href={`/d/${dossierId}/docs`}>Back to documents</Link>
      <div className="acts">
        <Link href={`/d/${dossierId}/tracker`} className="btn btn-ghost btn-s">
          Add debrief
        </Link>
        {printable && (
          <button type="button" className="btn btn-main btn-s" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        )}
      </div>
    </div>
  );
}

/** Real dossiers: while the draft is being written, look again every few seconds. */
const POLL_MS = 5000;

export function BriefingNote({ dossierId, isSample, doc: initial, docId, refs, names, etaText }: NoteProps) {
  const [local, setLocal] = useState<PortolanDocument | null>(null);
  const [looked, setLooked] = useState(initial !== null);
  const router = useRouter();
  const doc = initial ?? local;

  useEffect(() => {
    // The sample's own requests live only in this browser.
    if (!isSample || initial) return;
    const read = () => {
      setLocal(readOverlay().documents?.find((d) => d.id === docId) ?? null);
      setLooked(true);
    };
    read();
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [isSample, initial, docId]);

  useEffect(() => {
    if (isSample || doc?.status !== "drafting") return;
    const t = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [isSample, doc?.status, router]);

  if (!looked) return <Nis kind="loading" headingLevel={1} title="Opening the note…" desc="Reading this browser's copy of the sample." />;
  if (!doc) {
    return (
      <Nis
        kind="empty"
        headingLevel={1}
        title="This document isn't here"
        desc={isSample ? "Sample requests stay in the browser that made them, and Reset sample removes them." : "It may have been removed. Your other documents are safe."}
        actions={[{ label: "Back to documents", href: `/d/${dossierId}/docs` }]}
      />
    );
  }

  const file = `/d/${dossierId}/docs/${encodeURIComponent(doc.id)}/file`;
  return (
    <div className="rp-desk">
      <Toolbar dossierId={dossierId} printable={doc.content !== null} />
      {doc.status === "drafting" ? (
        <Nis kind="loading" headingLevel={1} title="Drafting your briefing note…" desc="The AI draft takes about 10 minutes. This page updates when it's ready." />
      ) : doc.status === "failed" ? (
        <Nis kind="error" headingLevel={1} title="The draft didn't finish" desc="Your request is safe. Go back to your documents and press Try again." actions={[{ label: "Back to documents", href: `/d/${dossierId}/docs` }]} />
      ) : doc.content ? (
        <Pages doc={doc} refs={refs} names={names} dossierId={dossierId} isSample={isSample} etaText={etaText} />
      ) : doc.storagePath ? (
        <>
          <iframe src={file} title={doc.title} className="bn-pdf" />
          <a href={`${file}?download=1`} className="btn btn-main btn-s">
            Download PDF
          </a>
        </>
      ) : (
        <Nis kind="empty" headingLevel={1} title="The team is preparing this document" desc="The PDF appears here when it's ready; your documents page shows its status." actions={[{ label: "Back to documents", href: `/d/${dossierId}/docs` }]} />
      )}
    </div>
  );
}
