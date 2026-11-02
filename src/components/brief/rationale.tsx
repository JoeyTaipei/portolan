import { Paras } from "@/components/score/paras";
import { getT } from "@/lib/i18n/server";
import { Cites } from "./cites";
import type { Cited } from "./model";

// BRIEF-3: position rationale, numbered so a meeting can ask for "the source for point 2".
export async function Rationale({ items, changesNote, dossierId }: { items: Cited[]; changesNote: string[]; dossierId: string }) {
  const t = await getT();
  return (
    <section aria-labelledby="rat-h" className="flex flex-col gap-3">
      {changesNote.length > 0 && (
        <div className="max-w-[68ch] rounded-[var(--r-m)] bg-panel2 px-3 py-2 text-[14px]">
          <p className="m-0 font-bold">{t("What changed and why")}</p>
          <ul className="m-0 pl-4">
            {changesNote.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <h2 id="rat-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
        {t("Position rationale")}
      </h2>
      {items.length === 0 ? (
        <p className="m-0 text-ink2">{t("Not enough sourced facts for this section.")}</p>
      ) : (
        <Paras
          label={t("Position rationale")}
          items={items.map((s, i) => ({
            key: String(i),
            body: (
              <p className="m-0 text-[17px] leading-[1.55]">
                {s.text}
                <Cites refs={s.refs} dossierId={dossierId} />
              </p>
            ),
          }))}
        />
      )}
    </section>
  );
}
