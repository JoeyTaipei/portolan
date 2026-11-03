import "server-only";
import { claimProblems } from "@/lib/checks/source-check";
import type { LeadDraft } from "@/lib/db/write";
import { MODELS } from "@/lib/limits/prices";
import type { Category, Level, MatchCheck } from "@/lib/types";
import { callStructured, claudeLive, type LedgerContext } from "./client";
import { mockLeads } from "./mock";
import { experienceCheck, leadsSystem, leadsPrompt, type PromptClient } from "./prompts";
import type { RateSource } from "./rate";
import { LeadsOutput } from "./schemas";

// The `leads` step (spec §7.2): investor, law-firm and event cards for the Network tab.
// One Sonnet call. Match = 4 sourced checks (spec §16 Q4): 4 = High, 2–3 = Medium, ≤ 1 = Low.
// A check passes only with a source that passes §7.7; a card whose "why" fails is dropped.

export interface LeadEntity {
  stakeholderId: string;
  name: string;
  nameZh: string | null;
  category: Category;
  sources: RateSource[];
}

const TYPE: Partial<Record<Category, LeadDraft["type"]>> = { cap: "investor", leg: "lawyer", evt: "event" };
const CHECK_TEXT: Record<"sector" | "stage" | "experience" | "tie", string> = {
  sector: "Sector fit",
  stage: "Stage or ticket fit (needs your funding stage)",
  experience: "Taiwan or defence experience",
  tie: "Tie to a mapped stakeholder",
};
const ORDER = ["sector", "stage", "experience", "tie"] as const;

export const matchLevel = (passed: number): Level => (passed >= 4 ? "High" : passed >= 2 ? "Medium" : "Low");

export async function writeLeads(args: {
  entities: LeadEntity[];
  mapNames: string[];
  client: PromptClient;
  runId: string;
  ledger: LedgerContext;
  today: string;
}): Promise<{ leads: LeadDraft[]; log: string[] }> {
  const log: string[] = [];
  const entities = args.entities.filter((e) => TYPE[e.category] && e.sources.length > 0);
  if (!entities.length) return { leads: [], log };

  let out: LeadsOutput | null = null;
  if (!claudeLive()) {
    out = mockLeads(entities.map((e) => ({ key: e.stakeholderId, name: e.name, nameZh: e.nameZh, sources: e.sources })));
  } else {
    for (let attempt = 0; attempt < 3 && !out; attempt++) {
      const r = await callStructured({
        model: MODELS.sonnet,
        system: leadsSystem(args.client.market),
        user: leadsPrompt({
          client: args.client,
          entities: entities.map((e) => ({ key: e.stakeholderId, name: e.name, category: e.category, sources: e.sources })),
          mapNames: args.mapNames,
          today: args.today,
        }),
        schema: LeadsOutput,
        maxTokens: 12000,
        effort: "medium",
        ledger: args.ledger,
      });
      if (r.ok) out = r.data;
      else {
        log.push(`Claude ${r.reason}: ${r.detail}`);
        if (r.reason === "budget") break;
      }
    }
  }
  if (!out) return { leads: [], log };

  const leads: LeadDraft[] = [];
  const seen = new Set<string>();
  for (const l of out.leads) {
    const e = entities.find((x) => x.stakeholderId === l.entity_key);
    if (!e || seen.has(e.stakeholderId)) continue;
    const byLabel = new Map(e.sources.map((s) => [s.label, s]));
    const byId = new Map(e.sources.map((s) => [s.id, s]));
    const ids = (labels: string[]) => labels.filter((x) => byLabel.has(x)).map((x) => byLabel.get(x)!.id);
    const whyIds = ids(l.why.source_ids);
    const whyProblems = claimProblems(`lead ${e.name}`, whyIds, null, byId, { runId: args.runId });
    if (whyProblems.length) {
      log.push(...whyProblems.map((p) => `Dropped card: ${p}`));
      continue;
    }
    seen.add(e.stakeholderId);
    const type = TYPE[e.category]!;
    let match: LeadDraft["match"];
    if (type === "event") match = { type: "attendees", stakeholderIds: [] };
    else {
      const checks: MatchCheck[] = ORDER.map((label) => {
        const c = l.checks.find((x) => x.label === label);
        const cids = c ? ids(c.source_ids) : [];
        const ok = !!c?.passed && cids.length > 0 && claimProblems("check", cids, null, byId, { runId: args.runId }).length === 0;
        const fallback = label === "experience" ? experienceCheck(args.client.market) : CHECK_TEXT[label];
        return { label: c?.note?.trim() || fallback, passed: ok, sourceIds: ok ? cids : [] };
      });
      match = { type: "checks", checks, level: matchLevel(checks.filter((c) => c.passed).length) };
    }
    leads.push({
      type,
      stakeholderId: e.stakeholderId,
      name: e.name,
      kind: l.kind.trim() || type,
      match,
      why: { text: l.why.text.trim(), sourceIds: whyIds },
      route: l.route?.trim() || null,
      eventDate: type === "event" && l.event_date && /^\d{4}-\d{2}-\d{2}$/.test(l.event_date) ? l.event_date : null,
      sourceIds: whyIds,
    });
  }
  return { leads, log };
}
