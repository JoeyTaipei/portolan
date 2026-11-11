// View model for the 碳基 hub (/cbt) and report (/cbt/report), spec MKT-3. Everything shown
// comes from the four sample markets and src/fixtures/cbt/report.ts; scores come from the
// scoring code, the same as every other dossier screen.
import { CBT_SAMPLES } from "@/fixtures/cbt";
import { CBT_REPORT, CLIENT_SUMMARY, type Cited, type MarketReport } from "@/fixtures/cbt/report";
import { scoreStakeholders } from "@/lib/scoring";
import { entryVerdict, type VerdictKind } from "@/lib/scoring/verdict";
import type { Category, Dossier, Level, Source } from "@/lib/types";

export interface CiteRef {
  label: string;
  href: string;
  title: string;
}

export interface PersonRow {
  id: string;
  name: string;
  category: string;
  influence: number | null;
  why: string | null;
  next: string;
  contactFirst: boolean;
}

export interface MarketView {
  r: MarketReport;
  d: Dossier;
  href: string;
  verdict: { kind: VerdictKind; label: string };
  readiness: { score: number; level: Level } | null;
  confidence: Level;
  sourceCount: number;
  event: { title: string; date: string } | null;
  people: PersonRow[];
  cite: (x: Cited) => CiteRef[];
  zh: (en: string) => string;
  usedSources: Source[];
}

const VERDICT_ZH: Record<VerdictKind, string> = { go: "可進入", conditional: "有條件進入", no_go: "暫不進入", none: "尚無判斷" };
const CATEGORY_ZH: Record<Category, string> = { gov: "政府", ind: "產業", cap: "資金", leg: "國會", evt: "活動" };
export const LEVEL_ZH: Record<Level, string> = { High: "高", Medium: "中", Low: "低" };

function marketView(r: MarketReport): MarketView {
  const d = CBT_SAMPLES.find((x) => x.id === r.spec.id)!;
  const brief = d.briefs[0];
  const zhMap = brief.zh ?? {};
  const zh = (en: string) => zhMap[en] ?? en;
  const byKey = new Map(r.spec.sources.map((s, i) => [s.key, d.sources[i]]));
  const used = new Set<string>();
  const cite = (x: Cited): CiteRef[] =>
    x.keys.map((k) => {
      const s = byKey.get(k);
      if (!s) throw new Error(`cbt report: unknown source handle ${k}`);
      used.add(s.id);
      return { label: s.label, href: `/d/${d.id}/sources?id=${s.label}`, title: s.title };
    });

  const now = new Date(d.refreshedAt ?? d.createdAt);
  const scored = scoreStakeholders(d, now);
  const first = new Set(brief.path.map((p) => p.stakeholderId));
  const order = [...brief.path.map((p) => p.stakeholderId), ...scored.filter((s) => s.eligible && !first.has(s.id)).sort((a, b) => (b.influence?.score ?? -1) - (a.influence?.score ?? -1)).map((s) => s.id)];
  const people = order.slice(0, 6).map((id): PersonRow => {
    const s = d.stakeholders.find((x) => x.id === id)!;
    const action = d.facts.find((f) => f.stakeholderId === id && f.field === "action");
    const why = brief.path.find((p) => p.stakeholderId === id)?.why.text ?? null;
    return {
      id,
      name: s.nameZh ?? s.name,
      category: CATEGORY_ZH[s.category],
      influence: scored.find((x) => x.id === id)?.influence?.score ?? null,
      why: why ? zh(why) : null,
      next: zh(String(action?.value ?? "")),
      contactFirst: first.has(id),
    };
  });

  const v = entryVerdict(brief.metrics, d.marketChecks, brief.path.length);
  const ev = d.events.find((e) => e.date) ?? null;
  // Every report citation is resolved once so the per-market source list shows only what's cited.
  for (const x of [r.firstDoor, r.barrier, ...r.opportunity, ...r.access, ...r.procurement, ...r.plan.d30, ...r.plan.d60, ...r.plan.d90]) cite(x);
  for (const b of r.budget) if (b.keys.length) cite({ text: b.item, keys: b.keys });
  if (r.spec.id === CBT_REPORT[0].spec.id) for (const x of CLIENT_SUMMARY) cite(x);

  return {
    r,
    d,
    href: `/d/${d.id}`,
    verdict: { kind: v.kind, label: VERDICT_ZH[v.kind] },
    readiness: brief.metrics.entryReadiness ? { score: brief.metrics.entryReadiness.score, level: brief.metrics.entryReadiness.level } : null,
    confidence: brief.metrics.dataConfidence.level,
    sourceCount: d.sources.length,
    event: ev ? { title: zh(ev.title), date: ev.date! } : null,
    people,
    cite,
    zh,
    usedSources: d.sources.filter((s) => used.has(s.id)),
  };
}

export const MARKET_VIEWS: MarketView[] = CBT_REPORT.map(marketView);
export const US_VIEW = MARKET_VIEWS[0];
export { CLIENT_SUMMARY };

/** 2027-05-17 → 2027/5/17 */
export const ymd = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
};
