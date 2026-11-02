"use client";

import { influenceText } from "@/components/score/explain";
import { CATEGORY_LABEL, type NodeVM } from "./model";
import { MarkIcon } from "./node-mark";

// Full list of every stakeholder by influence (the map draws at most 30), with the plain
// search input above it (simpler version of Find a stakeholder).
export function StakeholderList({
  nodes,
  total,
  query,
  onQuery,
  selected,
  onSelect,
  title = true,
}: {
  nodes: NodeVM[];
  total: number;
  query: string;
  onQuery: (q: string) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  title?: boolean;
}) {
  return (
    <section aria-labelledby="all-h" className="flex flex-col gap-2">
      <h2 id="all-h" className={title ? "m-0 border-b border-rule-strong pb-1.5 text-[15px] font-bold" : "sr-only"}>
        All {total} stakeholders, by influence
      </h2>
      <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-ink2">
        Find a stakeholder
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQuery("");
          }}
          placeholder="Name, Chinese name or category"
          autoComplete="off"
          className="min-h-11 rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 text-[15px] font-normal text-ink placeholder:text-ink3"
        />
      </label>
      {nodes.length === 0 ? (
        <p className="m-0 text-[13.5px] text-ink2" role="status">
          No stakeholder matches “{query.trim()}”. Try the Chinese name or a category, such as Government.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {nodes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                aria-current={selected === n.id ? "true" : undefined}
                className="grid min-h-11 w-full cursor-pointer grid-cols-[18px_1fr_auto_auto] items-center gap-2 border-0 border-b border-rule bg-transparent px-0.5 py-1 text-left font-[inherit] text-ink hover:bg-panel2 aria-[current=true]:bg-panel2"
              >
                <MarkIcon mark={n.mark} />
                <span className="min-w-0 text-[14px] font-semibold">
                  {n.short}
                  <span className="block text-[12px] font-normal text-ink2">{CATEGORY_LABEL[n.category]}</span>
                </span>
                <span className="text-[12.5px] text-ink2">{influenceText(n.influence)}</span>
                <span className="num min-w-[42px] text-right text-[12.5px] text-ink2">{n.sourceCount} src</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function matches(n: NodeVM, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [n.short, n.name, n.nameZh ?? "", CATEGORY_LABEL[n.category]].join(" ").toLowerCase().includes(s);
}
