// Organisation matching (spec §10.4). The contact's organisation is normalised and compared with
// each stakeholder's name, short name, Chinese name and aliases (site-wide seeds plus this
// dossier's own). Exact → matched; similarity ≥ 0.5 → the member confirms; else discarded,
// never stored. China stays organisation level: contacts there keep no name, title or URL.
import type { ParsedContact } from "./parse";

export interface OrgTarget {
  stakeholderId: string;
  isChina: boolean;
  /** Normalised names: name, short, Chinese name, aliases. */
  names: string[];
}

export interface Matched {
  contact: ParsedContact;
  stakeholderId: string;
}

export interface ToConfirm extends Matched {
  similarity: number;
}

export interface MatchResult {
  matched: Matched[];
  toConfirm: ToConfirm[];
  /** Contacts dropped because no organisation on the map is close enough. */
  discarded: number;
}

export const CONFIRM_AT = 0.5;

const SUFFIXES = /\b(co|company|corp|corporation|inc|incorporated|ltd|limited|llc|plc|gmbh|group|holdings|the)\b/g;
const ZH_SUFFIXES = /(股份有限公司|有限公司|公司)$/;

/** Lower case, full-width → half-width, punctuation and legal suffixes removed. */
export function normaliseOrg(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ZH_SUFFIXES, "");
}

/** Word tokens; Chinese text becomes character pairs so 中科院 and 國家中山科學研究院 can be compared. */
function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.split(" ")) {
    if (!w) continue;
    if (/[㐀-鿿]/.test(w)) {
      for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
      if (w.length === 1) out.add(w);
    } else out.add(w);
  }
  return out;
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function orgTargets(
  stakeholders: { id: string; name: string; short: string | null; nameZh: string | null; isChina: boolean }[],
  aliases: { alias: string; stakeholderKey: string }[],
): OrgTarget[] {
  return stakeholders.map((s) => ({
    stakeholderId: s.id,
    isChina: s.isChina,
    names: [s.name, s.short, s.nameZh, ...aliases.filter((a) => a.stakeholderKey === s.id).map((a) => a.alias)]
      .filter((x): x is string => !!x)
      .map(normaliseOrg)
      .filter((x) => x.length > 1),
  }));
}

/** China: organisation level only, so the contact keeps no personal details. */
function minimise(c: ParsedContact, t: OrgTarget): ParsedContact {
  return t.isChina ? { ...c, name: "", title: null, linkedinUrl: null } : c;
}

export function matchOrg(orgText: string, targets: OrgTarget[]): { target: OrgTarget; similarity: number } | null {
  const org = normaliseOrg(orgText);
  if (!org) return null;
  let best: { target: OrgTarget; similarity: number } | null = null;
  for (const t of targets) {
    for (const n of t.names) {
      const sim = n === org ? 1 : similarity(org, n);
      if (!best || sim > best.similarity) best = { target: t, similarity: sim };
    }
  }
  return best && best.similarity >= CONFIRM_AT ? best : null;
}

export function matchContacts(contacts: ParsedContact[], targets: OrgTarget[]): MatchResult {
  const out: MatchResult = { matched: [], toConfirm: [], discarded: 0 };
  for (const c of contacts) {
    const m = matchOrg(c.orgText, targets);
    if (!m) out.discarded++;
    else if (m.similarity === 1) out.matched.push({ contact: minimise(c, m.target), stakeholderId: m.target.stakeholderId });
    else out.toConfirm.push({ contact: minimise(c, m.target), stakeholderId: m.target.stakeholderId, similarity: m.similarity });
  }
  return out;
}
