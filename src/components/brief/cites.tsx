import type { SourceRef } from "@/components/score/explain";

// Inline citations "[S12]". In the brief each one jumps to its evidence card (BRIEF-3); with
// `href` (report, sources) it opens the source list instead.
export function Cites({ refs, href }: { refs: SourceRef[]; href?: (r: SourceRef) => string }) {
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
