import Link from "next/link";
import { Nis } from "@/components/shell/nis";
import { getT } from "@/lib/i18n/server";
import type { HomeModel } from "./model";
import { SourceChips } from "@/components/score/source-chip";

// HOME-9: the contact-first three, then the rest by influence, each with its sourced next step.
// A stakeholder without one shows the Unverified fallback, never an invented step.
export async function NextMoves({ m }: { m: HomeModel }) {
  const t = await getT();
  return (
    <section aria-labelledby="nm-h" className="flex flex-col">
      <h2 id="nm-h" className="m-0 flex items-center gap-2.5 text-[22px] font-bold">
        <span aria-hidden="true" className="inline-block size-2.5 rotate-45 bg-[var(--act)]" />
        {t("Next moves")}
      </h2>
      <p className="m-0 mt-1 mb-3 text-[14.5px] text-ink2">{t("Who to contact first, then the rest by influence. Each step traces to a source.")}</p>
      {m.moves.length === 0 ? (
        <Nis
          kind="empty"
          inline
          title={t("No stakeholders yet")}
          desc={t("Next moves appear once research has mapped who decides.")}
          actions={[{ label: t("Open the map"), href: `/d/${m.id}/map` }]}
        />
      ) : (
        <ol className="m-0 list-none border-t-2 border-rule-strong p-0">
          {m.moves.map((mv, i) => (
            <li key={mv.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 border-b border-rule py-3.5">
              <span className="num pt-0.5 text-[15px] font-semibold text-[var(--act)]">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="m-0 text-[17px] leading-[1.4]">
                  <span data-testid="conclusion">{t.r(mv.step, m.zh)}</span>
                  {!mv.verified && <span className="ml-2 align-middle text-[12px] font-bold text-ink2">{t("Unverified")}</span>}
                </p>
                <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13.5px] text-ink2">
                  <Link href={`/d/${m.id}/map?s=${encodeURIComponent(mv.id)}`} className="font-semibold">
                    {(t.locale === "zh-TW" && mv.nameZh) || mv.name}
                  </Link>
                  {mv.sources.length > 0 && <SourceChips dossierId={m.id} sources={mv.sources} />}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
