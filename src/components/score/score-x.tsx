"use client";

import Link from "next/link";
import { useId, useRef, type ReactNode } from "react";
import type { Explanation } from "./explain";
import { Stamp } from "./stamp";

// SCORE-X (spec §12): every score opens the same panel. A native <dialog> gives Esc-to-close
// and focus return; the trigger is a <button>, so Enter and Space open it.

function fmtDate(iso: string | null): string {
  if (!iso) return "date unverified";
  const d = new Date(iso);
  return `checked ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
}

export function ScoreX({
  explanation: x,
  dossierId,
  className = "",
  label,
  children,
}: {
  explanation: Explanation;
  dossierId: string;
  className?: string;
  /** Accessible name when the trigger's text alone isn't clear. */
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        className={`cursor-pointer ${className}`}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => ref.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[min(80dvh,720px)] rounded-[var(--r-l)] border border-rule-strong bg-panel p-0 text-ink backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="m-0 text-[17px] font-bold leading-tight">
              {x.title}
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-s"
              onClick={() => ref.current?.close()}
            >
              Close
            </button>
          </div>
          <p className="m-0 text-[22px] font-semibold leading-tight">{x.result}</p>
          {x.basedOn && <p className="m-0 text-[13.5px] text-ink2">{x.basedOn}</p>}
          {x.factors.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-0 border-t border-rule-strong p-0">
              {x.factors.map((f) => (
                <li key={f.label} className="flex flex-col gap-1 border-b border-rule py-2.5 text-[14px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{f.label}</span>
                    <span className="shrink-0 text-ink2">
                      {f.rating}
                      {f.weight && <> · weight <span className="num">{f.weight}</span></>}
                    </span>
                  </div>
                  {f.sources.length > 0 ? (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
                      {f.sources.map((s) => (
                        <li key={s.id}>
                          <Link href={`/d/${dossierId}/sources?id=${encodeURIComponent(s.label)}`}>
                            {s.label} {s.title}
                          </Link>
                          <Stamp reliability={s.reliability} credibility={s.credibility} />
                          <span className="text-ink2">{fmtDate(s.verifiedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[13px] text-ink2">No cited source, so this isn&apos;t counted.</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 max-w-[68ch] text-[13.5px] leading-normal text-ink2">{x.summary}</p>
        </div>
      </dialog>
    </>
  );
}
