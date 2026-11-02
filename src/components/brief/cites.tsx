import type { SourceRef } from "@/components/score/explain";
import { SourceChips } from "@/components/score/source-chip";

// Inline citations. In the app (`dossierId`) they are source chips that open a card (SRC-CHIP);
// with `href` (report, sources) they stay as "[S12]" links to the source list.
export function Cites({ refs, href, dossierId }: { refs: SourceRef[]; href?: (r: SourceRef) => string; dossierId?: string }) {
  if (dossierId && !href) {
    return (
      <>
        {" "}
        <SourceChips sources={refs} dossierId={dossierId} />
      </>
    );
  }
  return (
    <span className="whitespace-nowrap text-[0.86em]">
      {refs.map((r) => (
        <a
          key={r.id}
          href={href ? href(r) : `#ev-${r.id}`}
          className="ml-0.5 font-semibold no-underline hover:underline"
          title={`${r.label}: ${r.title}`}
        >
          [{r.label}]
        </a>
      ))}
    </span>
  );
}
