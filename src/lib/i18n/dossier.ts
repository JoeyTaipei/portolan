import type { Brief, Dossier } from "@/lib/types";

// I18N-9: what a real dossier's screens look up in 繁中 mode: the brief version's checked
// translations (`briefs.zh`) and each stakeholder's own sourced Chinese name. People at
// organisations in China are left out (organisation level only). Empty in English mode's eyes:
// `t.r` / `t.n` only use it when the locale is zh-TW.

export type ZhMap = Record<string, string>;

export function zhMap(d: Pick<Dossier, "stakeholders">, brief: Pick<Brief, "zh" | "plan"> | null | undefined): ZhMap {
  const out: ZhMap = {};
  const people = d.stakeholders.filter((s) => s.nameZh && !(s.isChina && s.isPerson));
  for (const s of people) {
    out[s.name] = s.nameZh!;
    if (s.short) out[s.short] = s.nameZh!;
  }
  const zh = brief?.zh ?? null;
  if (!zh) return out;
  Object.assign(out, zh);
  // The A4 shows each 7-day box as "<action> (<who>)".
  const plan = brief!.plan;
  for (const a of [...plan.prep, ...plan.contact, ...plan.event, ...plan.followUp]) {
    const s = d.stakeholders.find((x) => x.id === a.stakeholderId);
    if (!s || !zh[a.text]) continue;
    for (const who of [s.short, s.name].filter((x): x is string => !!x)) out[`${a.text} (${who})`] = `${zh[a.text]}（${out[who] ?? who}）`;
  }
  return out;
}
