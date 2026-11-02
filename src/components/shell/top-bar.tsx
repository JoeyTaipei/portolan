"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Both } from "@/lib/i18n/client";
import { LangSwitch } from "./lang-switch";
import { currentTab, tabHref, TABS } from "./tabs";

// SHELL-1 desktop bar: brand, five tabs (≥1024px) and the Sample data stamp.
// Below 1024px the tabs move to <BottomTabs />; the brand and stamp stay here.
export function TopBar({ dossierId, isSample }: { dossierId: string | null; isSample: boolean }) {
  const pathname = usePathname();
  const active = currentTab(pathname);
  return (
    <header className="flex items-center justify-between gap-3 border-b border-rule-strong bg-[var(--bar)] px-[18px] py-3 text-[var(--bar-ink)] lg:h-[58px] lg:px-6 lg:py-0">
      <Link href="/" className="text-[17px] font-bold uppercase tracking-[.12em] text-[var(--bar-ink)] no-underline">
        Portolan
      </Link>
      <nav aria-label="Main" className="hidden h-full gap-0.5 lg:flex">
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <Link
              key={t.key}
              href={tabHref(t, dossierId)}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-[58px] items-center gap-[7px] px-3.5 text-sm no-underline [&_svg]:size-[18px] ${
                on
                  ? "font-bold text-[var(--bar-ink)] after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:bg-[var(--tab-on)]"
                  : "font-medium text-[var(--bar-ink2)] hover:text-[var(--bar-ink)]"
              }`}
            >
              {t.icon}
              <Both k={t.label} />
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <LangSwitch />
        {isSample && (
          <span className="sample">
            <Both k="Sample data" />
          </span>
        )}
      </div>
    </header>
  );
}
