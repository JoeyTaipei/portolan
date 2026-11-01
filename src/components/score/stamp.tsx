import type { Credibility, Reliability } from "@/lib/types";

// Admiralty grade stamp (direction.md): reliability A–F + credibility 1–6, e.g. "A1".
export function Stamp({ reliability, credibility }: { reliability: Reliability; credibility: Credibility }) {
  const grade = `${reliability}${credibility}`;
  return (
    <span className="stamp" title={`Admiralty grade ${grade}: source reliability ${reliability}, information credibility ${credibility}`}>
      {grade}
    </span>
  );
}
