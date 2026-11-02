import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { TAB_NOTE, TABS, type NetworkTab } from "./model";

// NET-1 tabs (Partners, Investors, Lawyers, Events) as links, so `?tab=lawyers` can be shared and the
// back button works; NET-2 the note for the open tab.
export function NetworkTabs({ dossierId, tab, counts }: { dossierId: string; tab: NetworkTab; counts: Record<NetworkTab, number> }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t("Lead type")} className="grid grid-cols-2 gap-1 rounded-[var(--r-l)] border border-rule bg-panel2 p-1 lg:grid-cols-1">
        {TABS.map((x) => {
          const on = x.key === tab;
          return (
            <Link
              key={x.key}
              href={`/d/${dossierId}/network${x.key === "partners" ? "" : `?tab=${x.key}`}`}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-m)] px-3 text-[14.5px] no-underline lg:justify-between ${
                on ? "bg-[var(--btn-bg)] font-bold text-[var(--btn-ink)]" : "font-semibold text-ink hover:bg-panel"
              }`}
            >
              {t.k(x.label)}
              <span className={`num text-[13px] ${on ? "" : "text-ink2"}`}>{counts[x.key]}</span>
            </Link>
          );
        })}
      </nav>
      <p className="m-0 flex gap-2 rounded-[var(--r-m)] border border-rule bg-panel px-3 py-2.5 text-[13.5px] leading-[1.45] text-ink2" data-testid="tab-note">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none fill-none stroke-current">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7v4.5M8 4.6v.4" />
        </svg>
        {t.k(TAB_NOTE[tab])}
      </p>
    </div>
  );
}
