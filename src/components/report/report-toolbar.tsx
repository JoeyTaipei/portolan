"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/client";

// REP-11/12 toolbar (screen only, hidden in print): Print / Save as PDF → window.print(), and
// Copy share link → "Copied". `report_exported` fires when the report opens and on copy; it
// carries no id (analytics.tsx rewrites URLs to /d/:id and /s/:id).
export function ReportToolbar({ shareUrl, backHref }: { shareUrl: string; backHref: string | null }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const opened = useRef(false);
  const t = useT();

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("report_exported", { via: "opened" });
  }, []);

  useEffect(() => {
    if (copy === "idle") return;
    const id = setTimeout(() => setCopy("idle"), 2500);
    return () => clearTimeout(id);
  }, [copy]);

  return (
    <div className="rp-toolbar">
      {backHref ? <Link href={backHref}>{t("Back to the strategy brief")}</Link> : <span className="note">{t("Read-only report")}</span>}
      <div className="acts">
        <button
          type="button"
          className="btn btn-ghost btn-s"
          aria-live="polite"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopy("copied");
              track("report_exported", { via: "share_link_copied" });
            } catch {
              setCopy("failed");
            }
          }}
        >
          {copy === "copied" ? t("Copied") : t("Copy share link")}
        </button>
        <button type="button" className="btn btn-main btn-s" onClick={() => window.print()}>
          {t("Print / Save as PDF")}
        </button>
      </div>
      {copy === "failed" && (
        <p role="status" className="note m-0 w-full">
          {t("Couldn't copy. The share link is {url}", { url: shareUrl })}
        </p>
      )}
    </div>
  );
}

/** Scales the 794px paper down to the screen width on phones; printing is unaffected. */
export function PaperFit({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const set = () => setScale(Math.min(1, (window.innerWidth - 32) / 794));
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  return (
    <div style={{ width: `min(794px, calc(100vw - 32px))`, height: 1123 * scale, overflow: "hidden" }} className="rp-fitbox">
      <div className="rp-fit" style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
        {children}
      </div>
    </div>
  );
}
