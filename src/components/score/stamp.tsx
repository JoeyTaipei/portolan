import type { Credibility, Reliability } from "@/lib/types";
import { BothX } from "@/lib/i18n/client";
import { gradeWords } from "./grade";

// Admiralty grade in plain words ("usually reliable, probably true"); the code (B2) is in the
// tooltip and data-grade. Inline citations use SourceChip instead.
export function Stamp({ reliability, credibility }: { reliability: Reliability; credibility: Credibility }) {
  const grade = `${reliability}${credibility}`;
  return (
    <span className="stamp" data-grade={grade} title={`Admiralty grade ${grade}`}>
      <BothX en={gradeWords(reliability, credibility)} />
    </span>
  );
}
