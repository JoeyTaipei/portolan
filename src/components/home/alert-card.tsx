import { SourceChip } from "@/components/score/source-chip";
import { getT } from "@/lib/i18n/server";
import type { HomeModel } from "./model";

// HOME-6: the next sourced deadline tied to the goal within 30 days. None → hidden (not an error).
export async function AlertCard({ m }: { m: HomeModel }) {
  const a = m.alert;
  if (!a) return null;
  const t = await getT();
  const s = a.sources[0];
  const when = a.days === 0 ? t("today") : a.days === 1 ? t("in 1 day") : t("in {n} days", { n: a.days });
  return (
    <section aria-labelledby="al-h" className="flex flex-col gap-3.5">
      <h2 id="al-h" className="m-0 border-b border-rule-strong pb-2 text-[16px] font-bold">
        {t("Alert")}
      </h2>
      <div className="flex flex-col gap-1 border-l-4 border-[var(--notice)] py-0.5 pl-3">
        <h3 className="m-0 text-[15px] font-bold">
          {t("{title}, {when|t}", { title: a.title, when })}
        </h3>
        <p className="m-0 text-[12.5px] text-ink2">
          {a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer noopener">
              {s.label} {s.title}
            </a>
          ) : (
            <>
              {s.label} {s.title}
            </>
          )}
          <SourceChip dossierId={m.id} source={s} />
        </p>
      </div>
    </section>
  );
}
