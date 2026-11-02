import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { EvidenceCard } from "./evidence-card";
import type { EvidenceVM } from "./model";

// BRIEF-7: the evidence dossier (cards in evidence-card.tsx, shared with the sources page).

export async function Evidence({
  items,
  total,
  dossierId,
}: {
  items: EvidenceVM[];
  total: number;
  dossierId: string;
}) {
  const t = await getT();
  return (
    <section aria-labelledby="evi-h" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="evi-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
          {t("Evidence")}
        </h2>
        <p className="m-0 text-[13px] text-ink2">
          {t("{n} of {m} · ", { n: items.length, m: total })}
          <Link href={`/d/${dossierId}/sources`}>{t("Show all")}</Link>
        </p>
      </div>
      {items.length === 0 ? (
        <p className="m-0 text-[14px] text-ink2">{t("This brief cites no source yet, so nothing is shown as fact.")}</p>
      ) : (
        items.map((e) => <EvidenceCard key={e.id} e={e} sourcesHref={`/d/${dossierId}/sources?id=${e.label}`} />)
      )}
    </section>
  );
}
