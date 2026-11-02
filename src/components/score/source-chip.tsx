"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { Credibility, Reliability } from "@/lib/types";
import type { SourceRef } from "./explain";
import { CREDIBILITY_WORDS, RELIABILITY_WORDS } from "./grade";

// A cited source as a small numbered chip ("13"); clicking opens a card with the title, site,
// checked date and the Admiralty grade in plain words. The code (A2) is only a footnote.

const W = 360;

function dot(level: "good" | "mid" | "weak" | "none") {
  const bg = { good: "bg-[var(--good)]", mid: "bg-ink2", weak: "bg-[var(--notice)]", none: "bg-ink3" }[level];
  return <span aria-hidden="true" className={`mt-[6px] inline-block size-2 shrink-0 rounded-full ${bg}`} />;
}
const relLevel = (r: Reliability) => (r === "A" || r === "B" ? "good" : r === "C" ? "mid" : r === "F" ? "none" : "weak");
const credLevel = (c: Credibility) => (c <= 2 ? "good" : c === 3 ? "mid" : c === 6 ? "none" : "weak");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function SourceChip({ source: s, dossierId }: { source: SourceRef; dossierId: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = pos !== null;
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!card.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const w = Math.min(W, window.innerWidth - 16);
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.bottom + 6 });
  };

  const checked = s.verifiedAt ? t.date(s.verifiedAt.slice(0, 10)) : null;
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={t("Source {label}: {title}", { label: s.label, title: s.title })}
        className="mx-0.5 inline-flex h-[22px] min-w-[22px] cursor-pointer items-center justify-center gap-1 rounded-full border-0 bg-[var(--depth1)] px-1.5 align-[2px] font-[inherit] text-[12px] font-semibold leading-none text-ink hover:bg-[var(--depth2)] aria-expanded:bg-ink aria-expanded:text-panel"
        data-testid="source-chip"
      >
        {s.label.replace(/^S/, "")}
        {s.host && <span className="font-normal max-sm:hidden">{s.host}</span>}
      </button>
      {pos && (
        <div
          ref={card}
          id={id}
          role="dialog"
          aria-label={t("Source {label}", { label: s.label })}
          style={{ left: pos.left, top: pos.top, width: Math.min(W, typeof window === "undefined" ? W : window.innerWidth - 16) }}
          className="fixed z-50 flex flex-col gap-2 rounded-[var(--r-l)] border border-rule-strong bg-panel p-4 text-left text-[14px] font-normal leading-normal text-ink shadow-[0_8px_24px_rgba(20,35,58,.14)]"
        >
          <p className="m-0 flex justify-between gap-3 text-[13px] text-ink2">
            <span>{t("Source {label}", { label: s.label })}</span>
            <span>{t.k(s.type)}</span>
          </p>
          <p className="m-0 text-[15.5px] font-semibold leading-snug [overflow-wrap:anywhere]">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-ink">
                {s.title}
              </a>
            ) : (
              s.title
            )}
          </p>
          <p className="m-0 text-[13px] text-ink2">
            {[s.host, checked ? t("checked {date}", { date: checked }) : t("date unverified")].filter(Boolean).join(", ")}
          </p>
          <div className="flex flex-col gap-1.5 border-t border-rule pt-2.5">
            <p className="m-0 flex gap-2.5">
              {dot(relLevel(s.reliability))}
              <span>
                <b>{t.k(`${cap(RELIABILITY_WORDS[s.reliability])} source.`)}</b>
              </span>
            </p>
            <p className="m-0 flex gap-2.5">
              {dot(credLevel(s.credibility))}
              <span>
                <b>{t.k(`${cap(CREDIBILITY_WORDS[s.credibility])}.`)}</b> {s.credibilityReason}
              </span>
            </p>
          </div>
          <p className="m-0 flex items-center justify-between gap-3 text-[12.5px] text-ink2">
            <span>{t("Admiralty grade {grade}", { grade: `${s.reliability}${s.credibility}` })}</span>
            <Link href={`/d/${dossierId}/sources?id=${encodeURIComponent(s.label)}`} className="text-[13.5px] font-semibold">
              {t("In the source list")}
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

/** Several chips in a row. */
export function SourceChips({ sources, dossierId }: { sources: SourceRef[]; dossierId: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-y-1">
      {sources.map((s) => (
        <SourceChip key={s.id} source={s} dossierId={dossierId} />
      ))}
    </span>
  );
}
