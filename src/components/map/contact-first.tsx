"use client";

import { useT } from "@/lib/i18n/client";
import type { NodeVM } from "./model";

// MAP-11: the contact-first three (fixed rule, scoring §5), in order. Works without the map.
export function ContactFirst({
  nodes,
  selected,
  onSelect,
}: {
  nodes: NodeVM[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  return (
    <section aria-labelledby="cf-h" className="flex flex-col gap-2">
      <h2 id="cf-h" className="m-0 border-b border-rule-strong pb-1.5 text-[15px] font-bold">
        {t("Contact first, in order")}
      </h2>
      {nodes.length === 0 ? (
        <p className="m-0 text-[13.5px] leading-normal text-ink2">
          {t("No stakeholder has a sourced influence score and known support yet, so nobody is recommended. Start with the full list and its sources.")}
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {nodes.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                aria-current={selected === n.id ? "true" : undefined}
                className="flex w-full cursor-pointer gap-2.5 border-0 border-b border-rule bg-transparent px-1 py-2 text-left font-[inherit] text-ink hover:bg-[var(--hi2)] aria-[current=true]:bg-[var(--hi2)]"
              >
                <span className="grid size-6 shrink-0 place-items-center bg-[var(--hi)] font-[family-name:var(--font-type)] text-[13px] font-bold text-[var(--act-ink)]">
                  {i + 1}
                </span>
                <span className="flex flex-col text-[13px] leading-[1.4] text-ink2">
                  <b className="text-[14px] text-ink">{n.short}</b>
                  <span>{t.k(n.action.text)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
