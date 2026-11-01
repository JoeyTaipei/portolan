import type { Category } from "@/lib/types";

// The `filter` step (spec §7.2): normalise and de-duplicate what discover found, drop people in
// China before anything is written (China is organisation level only), keep at most 60.

export const MAX_ENTITIES = 60;

export interface DiscoveredEntity {
  name: string;
  nameZh: string | null;
  category: Category;
  whyRelevant: string;
  url: string | null;
  isPerson: boolean;
  /** ISO-3166 alpha-2 as Parallel reported it, or a country name; null if unknown. */
  country: string | null;
}

export interface KeptEntity extends DiscoveredEntity {
  /** Stable key for matching: the alias table's stakeholder key, or the normalised name. */
  key: string;
  isChina: boolean;
}

export interface DroppedEntity {
  name: string;
  reason: string;
}

export interface AliasRow {
  alias: string;
  stakeholderKey: string;
}

/** Lower case, full-width → half-width, punctuation and the word "the" removed (spec §7.6). */
export function normaliseName(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && w !== "the")
    .join(" ");
}

const CHINA_CODES = new Set(["cn", "hk", "mo", "china", "prc", "people s republic of china", "hong kong", "macau", "macao"]);
const CHINA_TLD = /\.(cn|hk|mo)$/i;

/** Mainland China, Hong Kong or Macau. "Republic of China" (Taiwan) is not China here. */
export function isChinaEntity(e: Pick<DiscoveredEntity, "country" | "url">): boolean {
  const c = e.country ? normaliseName(e.country) : "";
  if (CHINA_CODES.has(c)) return true;
  if (e.url) {
    try {
      if (CHINA_TLD.test(new URL(e.url).hostname)) return true;
    } catch {
      // not a URL: no signal
    }
  }
  return false;
}

export function filterEntities(
  entities: DiscoveredEntity[],
  aliases: AliasRow[],
  max = MAX_ENTITIES,
): { kept: KeptEntity[]; dropped: DroppedEntity[] } {
  const aliasKey = new Map(aliases.map((a) => [normaliseName(a.alias), a.stakeholderKey]));
  const kept: KeptEntity[] = [];
  const dropped: DroppedEntity[] = [];
  const byKey = new Map<string, KeptEntity>();
  const byZh = new Map<string, KeptEntity>();

  for (const e of entities) {
    const name = e.name?.trim();
    if (!name) {
      dropped.push({ name: "(no name)", reason: "No name" });
      continue;
    }
    const isChina = isChinaEntity(e);
    // Product rule: never write a person record for China. Organisations stay.
    if (isChina && e.isPerson) {
      dropped.push({ name, reason: "Person in China: organisation level only" });
      continue;
    }
    const n = normaliseName(name);
    const zh = e.nameZh ? normaliseName(e.nameZh) : null;
    const key = aliasKey.get(n) ?? (zh ? aliasKey.get(zh) : undefined) ?? n;
    const same = byKey.get(key) ?? (zh ? byZh.get(zh) : undefined);
    if (same) {
      same.nameZh ??= e.nameZh;
      same.url ??= e.url;
      dropped.push({ name, reason: `Duplicate of ${same.name}` });
      continue;
    }
    if (kept.length >= max) {
      dropped.push({ name, reason: `Over the ${max}-entity limit` });
      continue;
    }
    const k: KeptEntity = { ...e, name, key, isChina, isPerson: isChina ? false : e.isPerson };
    kept.push(k);
    byKey.set(key, k);
    if (zh) byZh.set(zh, k);
  }
  return { kept, dropped };
}
