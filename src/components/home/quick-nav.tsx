import Link from "next/link";
import type { HomeModel } from "./model";

// HOME-2: six tiles linking to the selected dossier's pages, each with a short count.
export function QuickNav({ m }: { m: HomeModel }) {
  const base = `/d/${m.id}`;
  const tiles = [
    { label: "Dossiers", sub: "Overview", href: base, current: true },
    { label: "Stakeholder map", sub: `${m.mapShown} of ${m.nav.mapTotal}`, href: `${base}/map` },
    { label: "Tracker", sub: `${m.nav.nextSteps} next step${m.nav.nextSteps === 1 ? "" : "s"}`, href: `${base}/tracker` },
    { label: "Network", sub: `${m.nav.leads} lead${m.nav.leads === 1 ? "" : "s"}`, href: `${base}/network` },
    { label: "Documents", sub: m.nav.documents ? `${m.nav.documents} ready or in progress` : "A4 report", href: `${base}/docs` },
    { label: "Strategy brief", sub: m.nav.briefVersion ? `version ${m.nav.briefVersion}` : "not written yet", href: `${base}/brief` },
  ];
  return (
    <nav
      aria-label="Workspace"
      className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--r-l)] border border-rule-strong bg-[var(--tile-gap-bg)] lg:grid-cols-2"
    >
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.current ? "page" : undefined}
          className="flex min-h-16 flex-col justify-between gap-2.5 bg-panel px-2.5 py-[9px] text-[13.5px] font-semibold text-ink no-underline hover:bg-panel2 aria-[current=page]:bg-[var(--tile-on)] aria-[current=page]:text-[var(--tile-on-ink)]"
        >
          {t.label}
          <span className={`text-[12px] font-medium ${t.current ? "text-[var(--tile-on-ink2)]" : "text-ink2"}`}>{t.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
