import { normaliseName, type AliasRow } from "./filter";

// Refresh matching (spec §7.6, D2; risky change: a wrong merge attaches one stakeholder's
// debriefs and tracker items to another). New results are matched to existing stakeholders:
//   1. equal normalised names, equal Chinese names, or an org_aliases hit → the same stakeholder;
//   2. name-token Jaccard ≥ 0.5 but not equal → "Needs your check" (the user decides);
//   3. anything else → a new stakeholder.
// Pure code so the three outcomes are unit tested.

export const CHECK_AT = 0.5;

export interface MatchName {
  name: string;
  nameZh: string | null;
}

export interface Existing extends MatchName {
  id: string;
}

export type MatchOutcome =
  | { kind: "same"; existingId: string }
  | { kind: "check"; existingId: string; similarity: number }
  | { kind: "new" };

const tokens = (s: string) => new Set(normaliseName(s).split(" ").filter(Boolean));

/** |A ∩ B| / |A ∪ B| over normalised name tokens. */
export function tokenJaccard(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const t of x) if (y.has(t)) both++;
  return both / (x.size + y.size - both);
}

/** Alias key for a name, if the alias table has one (site-wide seeds and this dossier's own). */
function aliasKey(name: string | null, aliases: AliasRow[]): string | null {
  if (!name) return null;
  const n = normaliseName(name);
  return aliases.find((a) => normaliseName(a.alias) === n)?.stakeholderKey ?? null;
}

export function matchEntity(entity: MatchName, existing: Existing[], aliases: AliasRow[]): MatchOutcome {
  const n = normaliseName(entity.name);
  const zh = entity.nameZh ? normaliseName(entity.nameZh) : null;
  const keys = [aliasKey(entity.name, aliases), aliasKey(entity.nameZh, aliases)].filter((k): k is string => !!k);

  // Rule 1: the same stakeholder.
  for (const e of existing) {
    if (normaliseName(e.name) === n) return { kind: "same", existingId: e.id };
    if (zh && e.nameZh && normaliseName(e.nameZh) === zh) return { kind: "same", existingId: e.id };
    if (keys.length) {
      // A dossier alias written by "Same as X" stores the stakeholder id as its key.
      if (keys.includes(e.id)) return { kind: "same", existingId: e.id };
      const theirs = [aliasKey(e.name, aliases), aliasKey(e.nameZh, aliases)];
      if (theirs.some((k) => k && keys.includes(k))) return { kind: "same", existingId: e.id };
    }
  }

  // Rule 2: similar enough that a person should decide.
  let best: { id: string; similarity: number } | null = null;
  for (const e of existing) {
    const similarity = tokenJaccard(entity.name, e.name);
    if (similarity >= CHECK_AT && (!best || similarity > best.similarity)) best = { id: e.id, similarity };
  }
  if (best) return { kind: "check", existingId: best.id, similarity: Number(best.similarity.toFixed(2)) };

  // Rule 3: new.
  return { kind: "new" };
}
