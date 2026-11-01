"use client";

import Link from "next/link";
import { useState } from "react";
import { Stamp } from "@/components/score/stamp";
import type { ActionResult, IntroRequest } from "@/lib/types";
import { IntroForm } from "./intro-form";
import { fmtDay, INTRO_LABEL, type LeadVM } from "./model";

// NET-3 card: type, name, match ("3 of 4 checks" with the list, or mapped attendees for events),
// terms, "Why:" with its sources, suggested route, source stamp; Unverified when nothing backs
// it. NET-4 Save lead / Add to plan, NET-5 Show on map (disabled with a reason), NET-6 intro.

function Cite({ dossierId, refs }: { dossierId: string; refs: LeadVM["refs"] }) {
  return (
    <span className="whitespace-nowrap text-[0.86em]">
      {refs.map((r) => (
        <Link key={r.id} href={`/d/${dossierId}/sources?id=${encodeURIComponent(r.id)}`} className="ml-0.5 font-semibold text-ink no-underline hover:underline" title={`${r.label}: ${r.title}`}>
          [{r.label}]
        </Link>
      ))}
    </span>
  );
}

export function LeadCard({
  lead,
  dossierId,
  saved,
  intro,
  onSave,
  onIntro,
}: {
  lead: LeadVM;
  dossierId: string;
  saved: boolean;
  intro: IntroRequest | null;
  onSave: () => Promise<ActionResult<unknown>>;
  onIntro: (purpose: string) => Promise<ActionResult<unknown>>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const isEvent = lead.type === "event";
  const best = lead.refs[0] ?? null;
  const date = fmtDay(lead.eventDate);

  async function save() {
    if (saved || busy) return;
    setBusy(true);
    setError(null);
    const r = await onSave();
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  async function sendIntro(purpose: string) {
    const r = await onIntro(purpose);
    if (r.ok) setAsking(false);
    return r;
  }

  const saveLabel = isEvent ? (saved ? "Added to plan" : busy ? "Adding…" : "Add to plan") : saved ? "Saved" : busy ? "Saving…" : "Save lead";

  return (
    <article className="flex flex-col gap-2.5 rounded-[var(--r-l)] border border-rule bg-panel p-4" data-testid="lead-card" aria-labelledby={`lead-${lead.id}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12.5px] font-semibold text-ink2">{lead.kind}</p>
          <h3 id={`lead-${lead.id}`} className="m-0 mt-0.5 text-[18px] font-bold leading-tight">
            {lead.name}
          </h3>
        </div>
        <div className="text-right">
          {isEvent ? (
            date ? (
              <p className="m-0 num text-[15px] font-semibold">{date}</p>
            ) : (
              <p className="m-0 text-[12.5px] text-ink2">Date unverified</p>
            )
          ) : (
            <p className="m-0 text-[12.5px] text-ink2">
              <span className="num text-[22px] font-semibold text-ink">{lead.checks.filter((c) => c.passed).length}</span> of{" "}
              <span className="num">{lead.checks.length}</span>
              <br />
              checks
            </p>
          )}
        </div>
      </header>

      {isEvent ? (
        <p className="m-0 text-[13.5px] font-semibold">{lead.match}</p>
      ) : (
        <details className="group text-[13.5px]">
          <summary className="cursor-pointer list-none font-semibold text-[var(--link)] underline underline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show the {lead.checks.length} checks</span>
            <span className="hidden group-open:inline">Hide the checks</span>
          </summary>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {lead.checks.map((c) => (
              <li key={c.label} className="grid grid-cols-[18px_1fr] gap-1.5 leading-[1.4]">
                <span aria-hidden="true" className={c.passed ? "font-bold text-[var(--sup)]" : "text-ink2"}>
                  {c.passed ? "✓" : "–"}
                </span>
                <span className={c.passed ? "" : "text-ink2"}>
                  <span className="sr-only">{c.passed ? "Passed: " : "Not shown by a source: "}</span>
                  {c.label}
                  {c.refs.length > 0 && <Cite dossierId={dossierId} refs={c.refs} />}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {lead.meta && <p className="m-0 num text-[13px] text-ink2">{lead.meta}</p>}

      {lead.why && (
        <p className="m-0 text-[14.5px] leading-[1.45]">
          <b>Why:</b> {lead.why.text}
          <Cite dossierId={dossierId} refs={lead.why.refs} />
        </p>
      )}

      {lead.route && (
        <p className="m-0 flex gap-2 rounded-[var(--r-m)] border-l-4 border-[var(--route)] bg-panel2 px-3 py-2 text-[13.5px]">
          <span aria-hidden="true" className="text-[var(--route)]">→</span>
          <span>
            <span className="sr-only">Suggested route: </span>
            {lead.route}
          </span>
        </p>
      )}

      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink2">
        {lead.unverified ? (
          <span className="rounded-[var(--r-s)] border border-rule-strong px-1.5 font-bold text-ink">Unverified</span>
        ) : (
          best && (
            <>
              <Stamp reliability={best.reliability} credibility={best.credibility} />
              <span>
                {best.label} · checked <span className="num">{fmtDay(best.verifiedAt) ?? "date unverified"}</span>
              </span>
            </>
          )
        )}
        {intro && <span className="font-semibold text-ink">· {INTRO_LABEL[intro.status]}</span>}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
        <button type="button" className={`btn ${saved ? "btn-ghost" : "btn-main"}`} onClick={save} disabled={busy} aria-pressed={saved}>
          {saved && <span aria-hidden="true">✓</span>}
          {saveLabel}
        </button>
        {lead.mapBlocked ? (
          <button type="button" className="btn btn-ghost cursor-not-allowed opacity-60" disabled aria-describedby={`map-${lead.id}`}>
            Show on map
          </button>
        ) : (
          <Link href={`/d/${dossierId}/map?s=${encodeURIComponent(lead.stakeholderId ?? "")}`} className="btn btn-ghost">
            Show on map
          </Link>
        )}
      </div>
      {lead.mapBlocked && (
        <p id={`map-${lead.id}`} className="m-0 -mt-1 text-[12px] text-ink2">
          {lead.mapBlocked}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-[13px] text-[var(--res-text)]">
          {error}
        </p>
      )}

      {lead.stakeholderId &&
        (intro ? (
          <p role="status" className="m-0 text-[13px] font-semibold">
            Request received — we&apos;ll update your tracker.
          </p>
        ) : asking ? (
          <IntroForm name={lead.name} onSend={sendIntro} onCancel={() => setAsking(false)} />
        ) : (
          <button type="button" className="min-h-9 self-start border-0 bg-transparent px-0 text-[13px] font-semibold text-[var(--link)] underline underline-offset-2" onClick={() => setAsking(true)}>
            Request a Portolan expert intro
          </button>
        ))}
    </article>
  );
}
