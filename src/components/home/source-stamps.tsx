import Link from "next/link";
import type { SourceRef } from "@/components/score/explain";
import { Stamp } from "@/components/score/stamp";

// Source labels (S1, S15…) with their Admiralty stamps, each linking to the source list.
export function SourceStamps({ dossierId, sources }: { dossierId: string; sources: SourceRef[] }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 text-[13px] font-normal">
      {sources.map((s) => (
        <Link key={s.id} href={`/d/${dossierId}/sources?id=${encodeURIComponent(s.id)}`} title={s.title} className="whitespace-nowrap">
          {s.label}
          <Stamp reliability={s.reliability} credibility={s.credibility} />
        </Link>
      ))}
    </span>
  );
}
