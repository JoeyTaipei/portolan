"use client";

import type { Category } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
  return (
    <div role="group" aria-label={t("Filter by category")} className="flex flex-wrap gap-1.5">
      {ORDER.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="min-h-[38px] cursor-pointer rounded-[var(--r-chip)] border border-rule bg-panel px-[13px] text-[13.5px] font-medium text-ink aria-pressed:border-ink aria-pressed:bg-[var(--hi)] aria-pressed:font-extrabold aria-pressed:shadow-[inset_0_0_0_1px_var(--ink)] max-lg:min-h-11"
        >
          {c === "all" ? t("All") : t.k(CATEGORY_LABEL[c])}
        </button>
      ))}
    </div>
  );
}
