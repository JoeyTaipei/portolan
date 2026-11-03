import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { HomeModel } from "./model";
import { TaiwanChart } from "./taiwan-chart";
import { BIG } from "./taiwan-coast";

// Small Taiwan chart with the sourced-address marks; the full chart is the Map tab.
export async function ChartInset({ m }: { m: HomeModel }) {
  const t = await getT();
  return (
    <section aria-labelledby="ci-h" className="flex items-center gap-4 rounded-[var(--r-m)] border border-rule bg-panel p-3">
      <div className="h-[152px] w-[120px] shrink-0 overflow-hidden rounded-[var(--r-s)] border border-rule bg-[var(--water0)]">
        <TaiwanChart
          dossierId={m.id}
          placed={m.placed}
          bounds={BIG}
          w={600}
          h={760}
          rose={[119.75, 24.6]}
          roseR={46}
          label={t("Small chart of Taiwan with the stakeholders that have a sourced address")}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="ci-h" className="m-0 text-[15px] font-bold">
          {t("{n} of {m} placed by a sourced address", { n: m.placed.length, m: m.nav.mapTotal })}
        </h2>
        <p className="m-0 text-[13.5px] leading-[1.4] text-ink2">
          {m.placed.length > 0 ? t("Click a mark to open it on the stakeholder map.") : t("No stakeholder has a sourced address yet.")}
        </p>
        <Link href={`/d/${m.id}/map`} className="text-[13.5px] font-semibold">
          {t("Open the full map")}
        </Link>
      </div>
    </section>
  );
}
