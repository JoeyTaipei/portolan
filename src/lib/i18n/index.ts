import { zhTW } from "./zh-TW";

// SHELL-4: English / 繁體中文. The dictionary is keyed by the English text, so English is
// always the fallback and `t("…")` only compiles for a key that has a translation.
// Never pass source excerpts, titles, URLs or names from sources through `t.x`: those
// stay verbatim (I18N-4). `t.x` is for sentences that code builds in model files.

export type Locale = "en" | "zh-TW";
export type Key = keyof typeof zhTW;
export type Vars = Record<string, string | number>;

export const LANG_COOKIE = "portolan_lang";
export const ZH_HTML_LANG = "zh-Hant-TW";

export function toLocale(v: string | null | undefined): Locale {
  return v === "zh-TW" ? "zh-TW" : "en";
}

export function htmlLang(locale: Locale): string {
  return locale === "zh-TW" ? ZH_HTML_LANG : "en";
}

export interface T {
  (key: Key, vars?: Vars): string;
  /** Translate a code-written string built elsewhere (exact key or `{…}` pattern); else as is. */
  x: (s: string) => string;
  /** Exact key only (enum labels like "Supportive"); anything else unchanged. */
  k: (s: string) => string;
  /** English dates inside a code-built string, in Chinese ("2 Nov 2026" → "2026年11月2日"). */
  dt: (s: string) => string;
  /** A calendar date: "2 Nov 2026" / "2026年11月2日". */
  date: (iso: string, opts?: { year?: boolean; utc?: boolean }) => string;
  locale: Locale;
}

const DICT: Record<string, string> = zhTW;

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)(?:\|[tl])?\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON = MONTHS.join("|");
const DMY = new RegExp(`\\b(\\d{1,2}) (${MON})[a-z]* (\\d{4})\\b`, "g");
const DM = new RegExp(`\\b(\\d{1,2}) (${MON})[a-z]*\\b`, "g");
const MY = new RegExp(`\\b(${MON})[a-z]* (\\d{4})\\b`, "g");

/** English dates inside a code-written value → Chinese ("2 Nov 2026" → "2026年11月2日"). */
export function zhDates(s: string): string {
  const m = (name: string) => MONTHS.indexOf(name.slice(0, 3)) + 1;
  return s
    .replace(DMY, (_, d, mon, y) => `${y}年${m(mon)}月${Number(d)}日`)
    .replace(MY, (_, mon, y) => `${y}年${m(mon)}月`)
    .replace(DM, (_, d, mon) => `${m(mon)}月${Number(d)}日`);
}

type Filter = "" | "t" | "l";

interface Pattern {
  re: RegExp;
  names: { name: string; filter: Filter }[];
  zh: string;
  literal: number;
}

// Number-like placeholders only match digits and `{date…}` only a date, so "{n} sources" never
// swallows a sentence. A `{x|t}` or `{x|l}` value must itself translate, or the pattern doesn't
// apply: "{title}, {when|t}" leaves "… August 19, 2025" alone.
const NUMERIC = new Set(["n", "m", "k", "count", "total", "pct", "score", "lo", "hi"]);
const DATE = `\\d{1,2} (?:${MON})[a-z]*(?: \\d{4})?|\\d{4}-\\d{2}-\\d{2}`;

let patterns: Pattern[] | null = null;

function buildPatterns(): Pattern[] {
  const out: Pattern[] = [];
  for (const [en, zh] of Object.entries(DICT)) {
    if (!en.includes("{")) continue;
    const names: Pattern["names"] = [];
    const parts = en.split(/(\{\w+(?:\|[tl])?\})/);
    let literal = 0;
    const src = parts
      .map((part) => {
        const ph = part.match(/^\{(\w+)(?:\|([tl]))?\}$/);
        if (!ph) {
          literal += part.length;
          return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        names.push({ name: ph[1], filter: (ph[2] ?? "") as Filter });
        return NUMERIC.has(ph[1]) ? "([\\d,.]+)" : ph[1].startsWith("date") ? `(${DATE})` : "(.+?)";
      })
      .join("");
    out.push({ re: new RegExp(`^${src}$`, "s"), names, zh, literal });
  }
  return out.sort((a, b) => b.literal - a.literal);
}

/** One item of a code-built list ("local content" → "Local content" → its translation). */
function listItem(item: string): string | undefined {
  return DICT[item] ?? DICT[item.charAt(0).toUpperCase() + item.slice(1)];
}

/** `{x|t}` and `{x|l}` values; undefined when the value has no translation. */
function filtered(filter: Filter, v: string): string | undefined {
  if (filter === "t") {
    const out = translateRuntime(v);
    return out !== v || DICT[v] !== undefined ? out : undefined;
  }
  const items = v.split(/, | or | and /).map(listItem);
  return items.every((x) => x !== undefined) ? items.join("、") : undefined;
}

/**
 * Exact key, then the most specific `{…}` pattern. Values are kept verbatim, except `{x|t}`
 * (translated), `{x|l}` (a comma list of labels, each translated) and `{date…}` (date localised).
 */
export function translateRuntime(s: string): string {
  const exact = DICT[s];
  if (exact !== undefined) return exact;
  patterns ??= buildPatterns();
  for (const p of patterns) {
    const m = s.match(p.re);
    if (!m) continue;
    const vars: Vars = {};
    const ok = p.names.every(({ name, filter }, i) => {
      const v = m[i + 1];
      const out = filter ? filtered(filter, v) : name.startsWith("date") ? zhDates(v) : v;
      if (out === undefined) return false;
      vars[name] = out;
      return true;
    });
    if (ok) return fill(p.zh, vars);
  }
  return s;
}

function formatDate(locale: Locale, iso: string, opts?: { year?: boolean; utc?: boolean }): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = day ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const year = opts?.year !== false;
  return d.toLocaleDateString(locale === "zh-TW" ? "zh-TW" : "en-GB", {
    day: "numeric",
    month: locale === "zh-TW" ? "long" : "short",
    ...(year ? { year: "numeric" } : {}),
    timeZone: day || opts?.utc ? "UTC" : "Asia/Taipei",
  });
}

export function makeT(locale: Locale): T {
  const zh = locale === "zh-TW";
  const t = ((key: Key, vars?: Vars) => fill(zh ? (DICT[key] ?? key) : key, vars)) as T;
  t.x = (s: string) => (zh ? translateRuntime(s) : s);
  t.k = (s: string) => (zh ? (DICT[s] ?? s) : s);
  t.dt = (s: string) => (zh ? zhDates(s) : s);
  t.date = (iso, opts) => formatDate(locale, iso, opts);
  t.locale = locale;
  return t;
}
