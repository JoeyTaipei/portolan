import { normaliseName } from "./filter";

// Source quality filter (spec §7.4; risky change: sources and "Unverified" marks).
// A Basis citation counts as a source only if every rule passes. Failures are kept with
// accepted=false and the reason, and are never used for a fact.

export const MIN_EXCERPT = 60;
export const MIN_EXCERPT_CJK = 25;

/** Database-listing sites: their pages are directory fields, not evidence. */
const DATABASE_HOSTS = [
  "tracxn.com",
  "crunchbase.com",
  "zoominfo.com",
  "pitchbook.com",
  "owler.com",
  "cbinsights.com",
  "dnb.com",
  "rocketreach.co",
  "signalhire.com",
  "apollo.io",
  "dealroom.co",
];

export type QualityResult = { ok: true } | { ok: false; reason: string };

export interface CitationToCheck {
  url: string | null | undefined;
  excerpt: string;
}

export interface EntityNames {
  name: string;
  nameZh?: string | null;
  short?: string | null;
  aliases?: string[];
}

const CJK = /[㐀-鿿豈-﫿]/g;

export function cjkShare(text: string): number {
  const letters = text.replace(/[\s\p{P}\p{S}\d]/gu, "");
  if (!letters.length) return 0;
  return (letters.match(CJK)?.length ?? 0) / letters.length;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** More than half the pieces are short nav items split by newlines, "|" or ">". */
export function looksLikeMenu(excerpt: string): boolean {
  const parts = excerpt
    .split(/\n|\||>|›|»/)
    .map((p) => p.replace(/[#*_`\[\]()]/g, "").trim())
    .filter(Boolean);
  if (parts.length < 4) return false;
  const short = parts.filter((p) => (cjkShare(p) > 0.5 ? p.length < 8 : p.length < 25)).length;
  return short > parts.length / 2;
}

/** Name variants we accept as a mention: full name, parts, acronyms, Chinese name suffixes, aliases. */
export function nameVariants(n: EntityNames): string[] {
  const out = new Set<string>();
  const add = (s: string | null | undefined, min = 3) => {
    const v = s ? normaliseName(s) : "";
    if (v.length >= min) out.add(v);
  };
  add(n.name);
  add(n.short);
  for (const a of n.aliases ?? []) add(a, 2);
  // "National Police Agency, Ministry of the Interior" → "National Police Agency";
  // "Industrial Technology Investment Corporation (ITIC)" → "ITIC".
  // Only the head part and bracketed acronyms: "Ministry of the Interior" alone is the parent.
  const head = n.name.split(/[,(\/;–—]| - /)[0];
  add(head, 4);
  for (const m of n.name.matchAll(/\(([^)]+)\)/g)) add(m[1], 2);
  // "Republic of China Army" → "Army"; "Thunder Tiger Corp." → "Thunder Tiger".
  add(head.replace(EN_PREFIX, "").replace(EN_SUFFIX, ""), 4);
  // "Industrial Technology Research Institute" → "ITRI".
  const initials = head
    .split(/[\s-]+/)
    .filter((w) => /^[A-Z]/.test(w) && !EN_SMALL.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("");
  if (initials.length >= 3) add(initials, 3);
  if (n.nameZh) {
    const zh = n.nameZh.normalize("NFKC").replace(/\s+/g, "");
    add(zh, 2);
    // 內政部警政署 → 警政署; 理律法律事務所 → 理律. Never a generic suffix alone.
    add(zh.replace(ZH_PREFIX, ""), 2);
    add(zh.replace(ZH_SUFFIX, ""), 2);
  }
  return [...out];
}

const EN_SMALL = new Set(["of", "and", "the", "for", "&"]);
const EN_PREFIX = /^(the\s+)?(republic of china|roc|r\.o\.c\.)\s+/i;
const EN_SUFFIX = /[\s,]+(corp\.?|corporation|inc\.?|co\.,? ltd\.?|ltd\.?|limited|group|holdings|attorneys-at-law|law firm)$/i;
const ZH_PREFIX =
  /^(中華民國|行政院|立法院|內政部|國防部|經濟部|交通部|財政部|外交部|數位發展部|海洋委員會|國家科學及技術委員會|國家)(?=.{2,})/;
const ZH_SUFFIX = /(股份有限公司|有限公司|法律事務所|事務所|公司|集團)$/;

export function mentionsEntity(excerpt: string, names: EntityNames): boolean {
  const text = ` ${normaliseName(excerpt)} `;
  const compact = normaliseName(excerpt).replace(/\s+/g, "");
  return nameVariants(names).some((v) =>
    cjkShare(v) > 0.5 ? compact.includes(v.replace(/\s+/g, "")) : text.includes(` ${v} `),
  );
}

export function checkCitation(c: CitationToCheck, names: EntityNames): QualityResult {
  if (!c.url) return { ok: false, reason: "No link" };
  let u: URL;
  try {
    u = new URL(c.url);
  } catch {
    return { ok: false, reason: "Link isn't a valid URL" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "Link isn't a web page" };
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (DATABASE_HOSTS.some((d) => hostIs(host, d))) return { ok: false, reason: "Database listing, not evidence" };
  if ((u.pathname === "/" || u.pathname === "") && !u.search) return { ok: false, reason: "Home page only" };

  const excerpt = c.excerpt.trim();
  const min = cjkShare(excerpt) > 0.3 ? MIN_EXCERPT_CJK : MIN_EXCERPT;
  if (excerpt.length < min) return { ok: false, reason: "Excerpt too short" };
  if (looksLikeMenu(excerpt)) return { ok: false, reason: "Menu text" };
  if (!mentionsEntity(excerpt, names)) return { ok: false, reason: "Doesn't mention the organisation" };
  return { ok: true };
}
