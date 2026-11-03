import type { Credibility, Reliability } from "@/lib/types";
import { BothX } from "@/lib/i18n/client";
import { gradeWords } from "./grade";

// Admiralty grade: the code (B2) in a 1.5px ink box (.grade), then the plain words
// ("usually reliable, probably true"). Inline citations use SourceChip instead.
export function Stamp({ reliability, credibility }: { reliability: Reliability; credibility: Credibility }) {
  const grade = `${reliability}${credibility}`;
  return (
    <span className="stamp" data-grade={grade} title={`Admiralty grade ${grade}`}>
      <span className="grade">{grade}</span> <BothX en={gradeWords(reliability, credibility)} />
    </span>
  );
}
