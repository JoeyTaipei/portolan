"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentTab, tabHref, TABS } from "./tabs";

// SHELL-1 phone tabs (<1024px): fixed at the bottom, 44px+ targets, the current tab is
// bold with an underline bar (not colour alone).
export function BottomTabs({ dossierId }: { dossierId: string | null }) {
  const pathname = usePathname();
  const active = currentTab(pathname);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-rule-strong bg-[var(--bar)] px-0.5 pt-1 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden"
    >
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={tabHref(t, dossierId)}
            aria-current={on ? "page" : undefined}
            className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11.5px] no-underline [&_svg]:size-[22px] ${
              on
                ? "font-bold text-[var(--bar-ink)] before:absolute before:inset-x-[22%] before:-top-1 before:h-[3px] before:bg-[var(--tab-on)]"
                : "font-medium text-[var(--bar-ink2)]"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
