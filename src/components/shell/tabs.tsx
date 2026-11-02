// The five main tabs (SHELL-1). Shared by the top bar (≥1024px) and bottom tabs (<1024px).
import type { ReactNode } from "react";

export type TabKey = "dossiers" | "map" | "tracker" | "network" | "docs";

export interface TabDef {
  key: TabKey;
  label: string;
  /** Path under /d/[id]; "" is the dossier overview. */
  segment: string;
  icon: ReactNode;
}

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6}>
    {children}
  </svg>
);

export const TABS: TabDef[] = [
  { key: "dossiers", label: "Markets", segment: "", icon: svg(<path d="M3 6h7l2 2h9v11H3z" />) },
  {
    key: "map",
    label: "Map",
    segment: "/map",
    icon: svg(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" />
      </>,
    ),
  },
  { key: "tracker", label: "Tracker", segment: "/tracker", icon: svg(<path d="M4 20V5M10 20V9M16 20v-6M22 20H2" />) },
  {
    key: "network",
    label: "Network",
    segment: "/network",
    icon: svg(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14.2c2.9.4 5 2.8 5 5.8" />
      </>,
    ),
  },
  {
    key: "docs",
    label: "Docs",
    segment: "/docs",
    icon: svg(
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4" />
      </>,
    ),
  },
];

/** Where a tab goes. Without a dossier, every tab except Dossiers asks the user to pick one. */
export function tabHref(tab: TabDef, dossierId: string | null): string {
  if (!dossierId) return tab.key === "dossiers" ? "/" : "/?pick=1";
  return `/d/${dossierId}${tab.segment}`;
}

/** Which tab the current path belongs to (brief, report and sources sit under none). */
export function currentTab(pathname: string): TabKey | null {
  if (pathname === "/") return "dossiers";
  const m = pathname.match(/^\/d\/[^/]+(\/[^/]+)?/);
  if (!m) return null;
  const seg = m[1] ?? "";
  if (seg === "") return "dossiers";
  return TABS.find((t) => t.segment === seg)?.key ?? null;
}
