"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// SHELL-2 non-ideal states: icon + title + one-sentence reason + one or two actions.
// `?state=loading|empty|error` previews them on /d/sample and in development.

export type NisKind = "loading" | "empty" | "error";

export type NisAction = { label: string; href: string } | { label: string; retry: true };

const ICONS: Record<NisKind, ReactNode> = {
  loading: (
    <svg className="ic spin" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" />
      <circle cx="24" cy="24" r="14" strokeDasharray="2 3" />
      <g className="needle">
        <path d="M24 8l4 16h-8z" fill="currentColor" stroke="none" />
        <path d="M24 40l4-16h-8z" />
      </g>
    </svg>
  ),
  empty: (
    <svg className="ic" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" />
      <path d="M24 5v6M24 37v6M5 24h6M37 24h6" />
      <path d="M17 31l14-14" />
    </svg>
  ),
  error: (
    <svg className="ic" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6l20 35H4z" />
      <path d="M24 19v10M24 34v.5" />
    </svg>
  ),
};

function RetryButton({ label, primary }: { label: string; primary: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`btn ${primary ? "btn-main" : "btn-ghost"}`}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        window.location.reload();
      }}
    >
      {busy ? "Retrying…" : label}
    </button>
  );
}

export function Nis({
  kind,
  title,
  desc,
  actions = [],
  inline = false,
  headingLevel = 2,
  children,
}: {
  kind: NisKind;
  title: string;
  desc: string;
  actions?: NisAction[];
  inline?: boolean;
  headingLevel?: 1 | 2 | 3;
  children?: ReactNode;
}) {
  const H = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div
      className={`nis${inline ? " inline" : ""}${kind === "error" ? " is-error" : ""}`}
      role={kind === "error" ? "alert" : "status"}
      data-state={kind}
    >
      {ICONS[kind]}
      <H>{title}</H>
      <p>{desc}</p>
      {children}
      {actions.length > 0 && (
        <div className="acts">
          {actions.map((a, i) =>
            "href" in a ? (
              <Link key={a.label} href={a.href} className={`btn ${i === 0 ? "btn-main" : "btn-ghost"}`}>
                {a.label}
              </Link>
            ) : (
              <RetryButton key={a.label} label={a.label} primary={i === 0} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Spec default: after 8 seconds of loading, say "Still loading…" and offer a retry. */
export const STILL_LOADING_MS = 8000;

/** Loading: skeleton shaped like the page (no jump) and the 8-second "Still loading…" fallback. */
export function LoadingState({ label = "Loading…", skeleton }: { label?: string; skeleton?: ReactNode }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), STILL_LOADING_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div aria-busy="true">
      {slow ? (
        <Nis
          kind="loading"
          title="Still loading…"
          desc="This is taking longer than usual. Your data is safe."
          actions={[{ label: "Try again", retry: true }]}
        />
      ) : (
        <Nis kind="loading" title={label} desc="Fetching the market and its sources." />
      )}
      {skeleton ?? <PageSkeleton />}
    </div>
  );
}

/** Generic skeleton until each slice draws its own: header line, three columns at ≥1024px. */
export function PageSkeleton() {
  return (
    <div className="grid gap-4 px-[18px] pb-6 lg:grid-cols-[300px_1fr_340px] lg:px-6 min-[1600px]:grid-cols-[320px_1fr_400px]" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <div className="skel h-8 w-3/4" />
        <div className="skel h-24" />
        <div className="skel h-24" />
      </div>
      <div className="skel min-h-[320px]" />
      <div className="flex flex-col gap-3">
        <div className="skel h-36" />
        <div className="skel h-24" />
      </div>
    </div>
  );
}

const PREVIEW_COPY: Record<Exclude<NisKind, "loading">, { title: string; desc: string }> = {
  empty: {
    title: "Nothing here yet",
    desc: "This page has no data to show yet. Open the sample market to see it filled in.",
  },
  error: {
    title: "This page didn't load",
    desc: "Your data is safe. Something went wrong on our side, so please try again.",
  },
};

function previewAllowed(pathname: string): boolean {
  return pathname === "/d/sample" || pathname.startsWith("/d/sample/") || process.env.NODE_ENV === "development";
}

/**
 * Wraps a page: with `?state=loading|empty|error` (sample or dev only) it shows that state
 * instead of the page. Must sit inside <Suspense> because it reads the search params.
 */
export function StatePreview({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const state = params.get("state");
  if (!previewAllowed(pathname) || (state !== "loading" && state !== "empty" && state !== "error")) {
    return <>{children}</>;
  }
  if (state === "loading") return <LoadingState />;
  const copy = PREVIEW_COPY[state];
  return (
    <Nis
      kind={state}
      title={copy.title}
      desc={copy.desc}
      actions={
        state === "error"
          ? [{ label: "Try again", href: pathname }]
          : [{ label: "Open the sample market", href: "/d/sample" }]
      }
    />
  );
}
