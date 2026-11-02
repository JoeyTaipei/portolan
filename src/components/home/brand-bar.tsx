import type { Key } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";

// HOME-1: brand line above the market name. The plan label is display only (no payments).
// Brand is Portolan only; the wordmark itself lives in the top bar.
export async function BrandLine() {
  const t = await getT();
  return (
    <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink2">
      {t("Market entry intelligence")}
      <span className="rounded-[var(--r-s)] bg-[var(--plan-bg)] px-2 py-[2px] text-[12px] font-bold text-[var(--plan-ink)]">{t("Pro plan")}</span>
    </p>
  );
}

export const TAGLINE: Key = "Charts of who decides in a new market. Every mark traces back to a source you can open.";
