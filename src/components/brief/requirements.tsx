import { Cites } from "./cites";
import { EXPORT_CHECK, REQUIREMENT_LABEL, type BriefVM } from "./model";

// BRIEF-9: the rules a foreign firm must meet to sell here, one cited line per topic. The
// export-control line is fixed code text, shown only when no source covers it.
export function Requirements({ items, exportCheck, dossierId }: { items: BriefVM["requirements"]; exportCheck: boolean; dossierId: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="req-h" className="flex flex-col gap-3">
      <h2 id="req-h" className="m-0 scroll-mt-4 text-[22px] font-bold">
        Entry requirements
      </h2>
      <p className="m-0 text-[14px] text-ink2">What a foreign firm must meet to sell to these buyers. Only rules a source states.</p>
      <ul className="m-0 flex list-none flex-col border-t-2 border-rule-strong p-0">
        {items.map((x) => (
          <li key={x.topic} className="grid gap-x-4 border-b border-rule py-2.5 text-[14.5px] leading-[1.45] sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="font-bold">{x.label}</span>
            <span>
              {x.text}
              <Cites refs={x.refs} dossierId={dossierId} />
            </span>
          </li>
        ))}
        {exportCheck && (
          <li className="grid gap-x-4 border-b border-dashed border-rule-strong py-2.5 text-[14.5px] leading-[1.45] text-ink2 sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="font-bold">{REQUIREMENT_LABEL.export_control}</span>
            <span className="italic">{EXPORT_CHECK}</span>
          </li>
        )}
      </ul>
    </section>
  );
}
