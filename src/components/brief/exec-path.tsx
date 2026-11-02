import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Cites } from "./cites";
import type { BriefVM } from "./model";

// BRIEF-4: the recommended executive path, in the fixed contact order (scoring §5), joined by
// the dashed route line, then "How to reduce opposition" for resistant stakeholders.
export async function ExecPath({ path, reduce, dossierId }: Pick<BriefVM, "path" | "reduce" | "dossierId">) {
  const t = await getT();
  return (
    <section aria-labelledby="path-h" className="flex flex-col gap-3">
      <h2 id="path-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
        {t("Recommended executive path")}
      </h2>
      {path.length === 0 ? (
        <p className="m-0 text-ink2">{t("Not enough sourced facts for this section.")}</p>
      ) : (
        <ol className="relative m-0 flex max-w-[68ch] list-none flex-col gap-3 p-0 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:border-l-[1.5px] before:border-dashed before:border-[var(--route)]">
          {path.map((p, i) => (
            <li key={p.stakeholderId} className="relative grid grid-cols-[28px_1fr] gap-2.5">
              <span className="grid size-[27px] place-items-center rounded-full border-[1.5px] border-[var(--act)] bg-bg text-[12px] font-extrabold text-[var(--act-text)]">
                {i + 1}
              </span>
              <p className="m-0 text-[17px] leading-[1.5]">
                <Link href={`/d/${dossierId}/map?s=${p.stakeholderId}`} className="font-bold text-ink">
                  {p.who}
                </Link>
                . {p.why.text}
                <Cites refs={p.why.refs} dossierId={dossierId} />
              </p>
            </li>
          ))}
        </ol>
      )}
      {reduce.length > 0 && (
        <div className="flex max-w-[68ch] flex-col gap-1.5">
          <h3 className="m-0 text-[16px] font-bold">{t("How to reduce opposition")}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {reduce.map((r) => (
              <li key={r.stakeholderId} className="text-[17px] leading-[1.5]">
                <b>{r.who}.</b> {r.step.text}
                <Cites refs={r.step.refs} dossierId={dossierId} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
