import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { HomeModel } from "./model";

// HOME-2: links to the selected market's pages, each with a short count.
export async function QuickNav({ m }: { m: HomeModel }) {
  const t = await getT();
  const base = `/d/${m.id}`;
  const links = [
    { label: t("Stakeholder map"), sub: t("{n} of {m}", { n: m.mapShown, m: m.nav.mapTotal }), href: `${base}/map` },
    { label: t("Tracker"), sub: t(m.nav.nextSteps === 1 ? "{n} next step" : "{n} next steps", { n: m.nav.nextSteps }), href: `${base}/tracker` },
    { label: t("Network"), sub: t(m.nav.leads === 1 ? "{n} lead" : "{n} leads", { n: m.nav.leads }), href: `${base}/network` },
    { label: t("Documents"), sub: m.nav.documents ? t("{n} ready or in progress", { n: m.nav.documents }) : t("A4 report"), href: `${base}/docs` },
    { label: t("Strategy brief"), sub: m.nav.briefVersion ? t("version {n}", { n: m.nav.briefVersion }) : t("not written yet"), href: `${base}/brief` },
  ];
  return (
    <nav aria-labelledby="ws-h" className="flex flex-col">
      <h2 id="ws-h" className="m-0 border-b border-rule-strong pb-2 text-[16px] font-bold">
        {t("Workspace")}
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
