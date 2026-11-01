"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { refreshDossier } from "@/app/actions/research";
import { track } from "@/lib/analytics";

// RES-1 research progress (spec §7.3). Polls GET /api/dossiers/[id]/progress every 3 s (the same
// request moves the research forward). New log lines are revealed one by one, not dumped; the
// bar and phase follow the server. Leaving and coming back picks up from the database.
// Ready → "Your dossier is ready" + the link again (D3); failed → the reason + Try again.

const POLL_MS = 3000;
const REVEAL_MS = 380;
const PHASES = ["Finding stakeholders", "Collecting sources", "Rating", "Writing the brief"] as const;

type Status = "researching" | "partial" | "ready" | "failed";

interface Progress {
  status: Status;
  phase: string;
  progress: number;
  counts: { found: number; enriched: number; acceptedSources: number; rated: number; stillResearching: number };
  items: { kind: "found" | "accepted" | "rejected"; text: string; at: string }[];
  elapsedMs: number;
  etaMs: number | null;
  error: string | null;
}

interface Line {
  key: string;
  kind: Progress["items"][number]["kind"];
  text: string;
}

const MARK: Record<Line["kind"], { sign: string; label: string; cls: string }> = {
  found: { sign: "+", label: "Found", cls: "text-ink" },
  accepted: { sign: "✓", label: "Accepted", cls: "text-[var(--sup-text)]" },
  rejected: { sign: "✕", label: "Rejected", cls: "text-[var(--res-text)]" },
};

const noSubscribe = () => () => {};

function minutes(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  return `${m} min`;
}

export function ProgressClient({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Progress | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queue = useRef<Line[]>([]);
  const seen = useRef(new Set<string>());
  const created = useRef(false);
  const [round, setRound] = useState(0);

  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  const url = `${origin}/d/${dossierId}`;

  // Poll until the run ends; a new round starts after "Try again".
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const res = await fetch(`/api/dossiers/${dossierId}/progress`, { cache: "no-store" });
        if (!alive) return;
        if (res.status === 404 || res.status === 503) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setProblem(body.error ?? "This dossier wasn't found.");
          setStopped(true);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const p = (await res.json()) as Progress;
        setProblem(null);
        setData(p);
        // Oldest first; only lines not shown yet go in the queue.
        for (const it of [...p.items].reverse()) {
          const key = `${it.kind}|${it.text}`;
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          queue.current.push({ key, kind: it.kind, text: it.text });
        }
        if (p.status !== "researching") {
          if ((p.status === "ready" || p.status === "partial") && !created.current) {
            created.current = true;
            track("dossier_created", { status: p.status });
          }
          return;
        }
      } catch {
        if (alive) setProblem("Progress isn't available right now. Trying again…");
      }
      if (alive) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [dossierId, round]);

  // Reveal queued lines one at a time.
  useEffect(() => {
    const t = setInterval(() => {
      const next = queue.current.shift();
      if (next) setLines((ls) => [...ls, next].slice(-60));
    }, REVEAL_MS);
    return () => clearInterval(t);
  }, []);

  const tryAgain = useCallback(async () => {
    setRetrying(true);
    setRetryError(null);
    const r = await refreshDossier(dossierId);
    setRetrying(false);
    if (!r.ok) {
      setRetryError(r.error);
      return;
    }
    setData(null);
    setRound((n) => n + 1);
  }, [dossierId]);

  const status = data?.status ?? "researching";
  const done = status === "ready" || status === "partial";
  const pct = Math.round((data?.progress ?? 0) * 100);
  const phaseIndex = done ? PHASES.length : Math.max(0, PHASES.indexOf((data?.phase ?? PHASES[0]) as (typeof PHASES)[number]));

  return (
    <div className="grid gap-6 px-[18px] pt-[22px] pb-10 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:gap-0 lg:p-0" data-testid="research-progress">
      <section aria-labelledby="res-h" className="flex flex-col gap-5 lg:border-r lg:border-rule-strong lg:p-6 min-[1600px]:p-8">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[12.5px] font-semibold tracking-[0.08em] text-ink2 uppercase">Research</p>
          <h1 id="res-h" className="m-0 text-[24px] leading-tight font-bold">
            {done ? "Your dossier is ready" : status === "failed" ? "Research didn't finish" : "Researching your market"}
          </h1>
          {!done && status !== "failed" && (
            <p className="m-0 text-[14px] text-ink2">You can leave this page. Open your link again later and it picks up from here.</p>
          )}
        </div>

        <ol className="m-0 flex list-none flex-col gap-0 p-0" aria-label="Research phases">
          {PHASES.map((p, i) => {
            const state = i < phaseIndex ? "done" : i === phaseIndex && status === "researching" ? "current" : "todo";
            return (
              <li key={p} className="flex items-center gap-2.5 border-t border-rule py-2 text-[14px] last:border-b" aria-current={state === "current" ? "step" : undefined}>
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${
                    state === "done" ? "border-ink bg-ink text-panel" : state === "current" ? "border-ink text-ink" : "border-rule-strong text-ink3"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={state === "todo" ? "text-ink3" : state === "current" ? "font-bold" : ""}>{p}</span>
                <span className="sr-only">{state === "done" ? "(done)" : state === "current" ? "(in progress)" : ""}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-[13px] text-ink2">
            <span>{done ? "Done" : status === "failed" ? "Stopped" : (data?.phase ?? "Starting…")}</span>
            <span className="num">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Research progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-2 overflow-hidden rounded-[var(--r-pill)] bg-panel2"
          >
            <div className="h-full bg-[var(--route)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          {data && status === "researching" && data.etaMs !== null && (
            <p className="m-0 text-[12.5px] text-ink2">About {minutes(data.etaMs)} left · {minutes(data.elapsedMs)} so far</p>
          )}
        </div>

        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
          {[
            ["Stakeholders found", data?.counts.found ?? 0],
            ["Sources accepted", data?.counts.acceptedSources ?? 0],
            ["Rated", data?.counts.rated ?? 0],
            ["Still researching", data?.counts.stillResearching ?? 0],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col border-l-2 border-rule-strong pl-2.5">
              <dt className="text-ink2">{k}</dt>
              <dd className="num m-0 text-[20px] font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        {done && (
          <div className="flex flex-col gap-2.5 rounded-[var(--r-m)] border border-rule-strong bg-panel p-3.5" role="status">
            <p className="m-0 text-[14px] font-semibold text-[var(--notice-text)]">This link is the only key to your dossier. Save it now.</p>
            <code className="block break-all rounded-[var(--r-s)] bg-panel2 px-2 py-1.5 text-[13px]" data-testid="dossier-link">
              {url}
            </code>
            {status === "partial" && (
              <p className="m-0 text-[13px] text-ink2">Some stakeholders didn&apos;t finish in time. They show as incomplete and are left out of the scores.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-s flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <button type="button" className="btn btn-main btn-s flex-1" onClick={() => router.refresh()}>
                Open the dossier
              </button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col gap-2.5" role="alert">
            <p className="m-0 text-[14px]">{data?.error ?? "Research didn't finish."} What was found so far is kept.</p>
            <button type="button" className="btn btn-main self-start" disabled={retrying} onClick={tryAgain}>
              {retrying ? "Starting again…" : "Try again"}
            </button>
            <p className="m-0 text-[12.5px] text-ink2">Trying again counts as one of today&apos;s two research runs.</p>
            {retryError && <p className="m-0 text-[13px] font-bold text-[var(--res-text)]">{retryError}</p>}
          </div>
        )}

        {problem && (
          <p role={stopped ? "alert" : "status"} className="m-0 text-[13px] text-ink2">
            {problem}
          </p>
        )}
      </section>

      <section aria-labelledby="log-h" className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:p-6 min-[1600px]:p-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="log-h" className="m-0 text-[15px] font-bold">
            Research log
          </h2>
          <span className="text-[12.5px] text-ink2">Every source is checked before it counts</span>
        </div>
        {lines.length === 0 ? (
          <p className="m-0 text-[14px] text-ink2">{data ? "Waiting for the first results…" : "Connecting…"}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0" aria-live="polite" aria-label="Research log">
            {lines.map((l) => {
              const m = MARK[l.kind];
              return (
                <li
                  key={l.key}
                  data-testid="progress-line"
                  className="animate-in fade-in slide-in-from-bottom-1 flex items-start gap-2.5 border-b border-rule py-1.5 text-[13.5px] leading-snug duration-300"
                >
                  <span aria-hidden="true" className={`w-3 shrink-0 text-center font-bold ${m.cls}`}>
                    {m.sign}
                  </span>
                  <span className="sr-only">{m.label}: </span>
                  <span className={`min-w-0 break-words ${l.kind === "rejected" ? "text-ink2" : ""}`}>{l.text}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
