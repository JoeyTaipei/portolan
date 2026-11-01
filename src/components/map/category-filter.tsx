"use client";

import type { Category } from "@/lib/types";
import { CATEGORY_LABEL } from "./model";

// MAP-7: All, Government, Industry, Capital, Legal, Events.
const ORDER: (Category | "all")[] = ["all", "gov", "ind", "cap", "leg", "evt"];

export function CategoryFilter({
  value,
  onChange,
}: {
  value: Category | "all";
  onChange: (v: Category | "all") => void;
}) {
  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
      {ORDER.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="min-h-[38px] cursor-pointer rounded-[var(--r-chip)] border border-rule bg-panel px-[13px] text-[13.5px] font-medium text-ink aria-pressed:border-[var(--tile-on)] aria-pressed:bg-[var(--tile-on)] aria-pressed:text-[var(--tile-on-ink)] max-lg:min-h-11"
        >
          {c === "all" ? "All" : CATEGORY_LABEL[c]}
        </button>
      ))}
    </div>
  );
}
