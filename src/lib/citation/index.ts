// The citation policy (CLAUDE.md product rules; spec §11.1 BRIEF-6): which sources a claim may
// cite, and whether a claim can be shown. Every screen builds its view from this one module, so
// home, map, brief and the A4 can never disagree about the same claim.
//
// A source is citable when it is accepted and has a verified date. Two rules:
// - sentence / allOf: shown only when it cites at least one source and every cited source is
//   citable (written claims: brief, A4, home bottom line, partner cards).
// - anyOf: the citable subset of the ids, for evidence lists under a score or a sourced fact.
// The write-time check with more context (on-map names, China, numbers) is preDisplay in
// src/lib/checks/pre-display.ts; it shares PLACEHOLDER and suggestsSpecIn with this module.
import { PLACEHOLDER, suggestsSpecIn } from "@/lib/checks/pre-display";
import { sourceRef, type SourceRef } from "@/components/score/explain";
import type { Dossier, Sentence, Source } from "@/lib/types";

export interface Cited {
  text: string;
  refs: SourceRef[];
}

export interface Citations {
  /** The sentence with its refs, or null when it must not be shown. */
  sentence(s: Sentence): Cited | null;
  /** Refs for every id, or null unless there is at least one and all are citable. */
  allOf(ids: readonly string[]): SourceRef[] | null;
  /** Refs for the citable ids only, de-duplicated; unknown and rejected ids are dropped. */
  anyOf(ids: readonly string[]): SourceRef[];
  has(id: string): boolean;
  source(id: string): Source | undefined;
  /** Number of citable sources. */
  readonly count: number;
}

/** False when the text has a placeholder or suggests spec-in (BRIEF-10). */
export function showableText(text: string): boolean {
  return text.trim() !== "" && !PLACEHOLDER.test(text) && !suggestsSpecIn(text);
}

export function citations(d: Pick<Dossier, "sources">): Citations {
  const sources = new Map(d.sources.filter((s) => s.accepted && s.verifiedAt).map((s) => [s.id, s]));
  const refs = new Map([...sources].map(([id, s]) => [id, sourceRef(s)]));

  const allOf = (ids: readonly string[]) => (ids.length > 0 && ids.every((id) => refs.has(id)) ? ids.map((id) => refs.get(id)!) : null);
  const anyOf = (ids: readonly string[]) => [...new Set(ids)].flatMap((id) => refs.get(id) ?? []);

  return {
    sentence(s) {
      if (!showableText(s.text)) return null;
      const r = allOf(s.sourceIds);
      return r ? { text: s.text, refs: r } : null;
    },
    allOf,
    anyOf,
    has: (id) => sources.has(id),
    source: (id) => sources.get(id),
    count: sources.size,
  };
}
