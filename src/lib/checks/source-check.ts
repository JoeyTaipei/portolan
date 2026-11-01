// Source-check loop (spec §7.7; risky change: sources and "Unverified" marks). Code, not a model,
// checks every claim (rating, statement, title, next step, brief sentence):
// 1. every cited id exists in this dossier and is an accepted source (from this run, or a debrief);
// 2. the quote the claim relies on appears in a cited excerpt (after normalising whitespace,
//    quotes and full-width characters);
// 3. the source has a verified date.

export interface CheckSource {
  id: string;
  label?: string;
  accepted: boolean;
  verifiedAt: string | null;
  excerpt: string;
  origin?: "parallel_basis" | "debrief" | "manual";
  runId?: string | null;
}

export type SourceIndex = Map<string, CheckSource>;

export const indexSources = (sources: CheckSource[]): SourceIndex => new Map(sources.map((s) => [s.id, s]));

/** NFKC (full-width → half-width), curly quotes → straight, whitespace collapsed. */
export function normaliseText(t: string): string {
  return t
    .normalize("NFKC")
    .replace(/[“”„‟″〝〞]/g, '"')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/\s+/g, " ")
    // Spaces next to Chinese characters carry no meaning: "招標 公告" = "招標公告".
    .replace(/ (?=[　-〿㐀-鿿＀-￯])|(?<=[　-〿㐀-鿿＀-￯]) /g, "")
    .trim();
}

export interface ClaimOptions {
  /** When set, only sources from this research run (or debriefs) count. */
  runId?: string | null;
}

/** Problems with one claim; empty = passes. */
export function claimProblems(
  where: string,
  sourceIds: string[],
  quote: string | null,
  sources: SourceIndex,
  opts: ClaimOptions = {},
): string[] {
  const out: string[] = [];
  if (sourceIds.length === 0) out.push(`${where}: no source`);
  for (const id of sourceIds) {
    const s = sources.get(id);
    const name = s?.label ?? id;
    if (!s) out.push(`${where}: unknown source ${id}`);
    else if (!s.accepted) out.push(`${where}: cites rejected source ${name}`);
    else if (!s.verifiedAt) out.push(`${where}: ${name} has no verified date`);
    else if (opts.runId && s.origin !== "debrief" && s.runId && s.runId !== opts.runId) {
      out.push(`${where}: ${name} is from another research run`);
    }
  }
  if (quote !== null) {
    const q = normaliseText(quote);
    const found = q.length > 0 && sourceIds.some((id) => {
      const s = sources.get(id);
      return s ? normaliseText(s.excerpt).includes(q) : false;
    });
    if (!found) out.push(`${where}: quote not in any cited excerpt: "${quote}"`);
  }
  return out;
}

/** Every number in written text must appear in one of its cited excerpts. */
export function numberProblems(where: string, text: string, sourceIds: string[], sources: SourceIndex): string[] {
  const excerpts = normaliseText(sourceIds.map((id) => sources.get(id)?.excerpt ?? "").join(" "));
  return (normaliseText(text).match(/\d[\d,.]*\d|\d/g) ?? [])
    .filter((n) => !excerpts.includes(n))
    .map((n) => `${where}: number ${n} not in cited excerpts`);
}
