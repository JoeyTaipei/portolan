import Link from "next/link";
import type { HomeModel } from "./model";

// HOME-2: links to the selected market's pages, each with a short count.
export function QuickNav({ m }: { m: HomeModel }) {
  const base = `/d/${m.id}`;
  const links = [
    { label: "Stakeholder map", sub: `${m.mapShown} of ${m.nav.mapTotal}`, href: `${base}/map` },
    { label: "Tracker", sub: `${m.nav.nextSteps} next step${m.nav.nextSteps === 1 ? "" : "s"}`, href: `${base}/tracker` },
    { label: "Network", sub: `${m.nav.leads} lead${m.nav.leads === 1 ? "" : "s"}`, href: `${base}/network` },
    { label: "Documents", sub: m.nav.documents ? `${m.nav.documents} ready or in progress` : "A4 report", href: `${base}/docs` },
    { label: "Strategy brief", sub: m.nav.briefVersion ? `version ${m.nav.briefVersion}` : "not written yet", href: `${base}/brief` },
  ];
  return (
    <nav aria-labelledby="ws-h" className="flex flex-col">
      <h2 id="ws-h" className="m-0 border-b border-rule-strong pb-2 text-[16px] font-bold">
        Workspace
      </h2>
      <ul className="m-0 list-none p-0">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="flex min-h-11 items-center justify-between gap-3 border-b border-rule px-1 text-[15px] font-semibold text-ink no-underline hover:bg-panel2"
            >
              {l.label}
              <span className="text-[13px] font-medium text-ink2">{l.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
