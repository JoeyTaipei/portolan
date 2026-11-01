import "server-only";
import { sampleDossier } from "@/fixtures/sample-dossier";
import { normaliseText } from "@/lib/checks/source-check";
import { normaliseName } from "@/lib/research/filter";
import type { Sentence } from "@/lib/types";
import type { PromptSource } from "./prompts";
import type { LeadsOutput, RatingOutput } from "./schemas";

// Mock Claude (plan P-1): in mock research mode, rate / leads / brief return the hand-curated
// ratings, statements and sentences from the S0b sample (src/fixtures/sample-dossier.ts),
// matched to the replayed Parallel sources BY URL. A claim survives only when its sample
// source's URL was supplied and the sample quote is in the supplied excerpt. Entities not in
// the sample come out with nothing: Unverified / Unknown. Nothing is invented.

const sample = sampleDossier;
const sampleSource = new Map(sample.sources.map((s) => [s.id, s]));

/** Supplied labels for sample source ids, matched by URL (and the quote, when there is one). */
export function relabel(sampleIds: string[], quote: string | null, sources: PromptSource[]): string[] {
  const q = quote ? normaliseText(quote) : null;
  const out: string[] = [];
  for (const id of sampleIds) {
    const url = sampleSource.get(id)?.url;
    if (!url) continue;
    const hit = sources.find((s) => s.url === url && (!q || normaliseText(s.excerpt).includes(q)));
    if (hit && !out.includes(hit.label)) out.push(hit.label);
  }
  return out;
}

function findSampleStakeholder(entity: { name: string; nameZh: string | null }, sources: PromptSource[]) {
  const n = normaliseName(entity.name);
  const zh = entity.nameZh ? normaliseName(entity.nameZh) : null;
  const named = sample.stakeholders.find(
    (s) => normaliseName(s.name) === n || (zh !== null && s.nameZh !== null && normaliseName(s.nameZh) === zh),
  );
  if (named) return named;
  // Otherwise the sample stakeholder whose cited URLs overlap most with the supplied sources.
  const urls = new Set(sources.map((s) => s.url));
  let best: { id: string; hits: number } | null = null;
  for (const st of sample.stakeholders) {
    const hits = sample.facts
      .filter((f) => f.stakeholderId === st.id)
      .flatMap((f) => f.sourceIds)
      .filter((id) => urls.has(sampleSource.get(id)?.url ?? null)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { id: st.id, hits };
  }
  return best ? sample.stakeholders.find((s) => s.id === best.id) : undefined;
}

export function mockRate(entity: { name: string; nameZh: string | null }, sources: PromptSource[]): RatingOutput {
  const out: RatingOutput = { role: null, head: null, ratings: [], statements: [], credibility: [], next_step: null, translations: [] };
  const st = findSampleStakeholder(entity, sources);
  if (!st) return out;
  const used = new Set<string>();
  for (const f of sample.facts.filter((x) => x.stakeholderId === st.id && x.status === "sourced")) {
    const ids = relabel(f.sourceIds, f.quote, sources);
    if (ids.length === 0 || f.quote === null) continue;
    ids.forEach((l) => used.add(l));
    const claim = { value: String(f.value), source_ids: ids, quote: f.quote };
    if (f.field === "role") out.role = claim;
    else if (f.field === "head") out.head = claim;
    else if (f.field === "action") out.next_step = claim;
    else if (f.rating !== null && (f.field === "authority" || f.field === "budget" || f.field === "access" || f.field === "recent")) {
      out.ratings.push({ factor: f.field, rating: f.rating, ...claim });
    }
  }
  for (const s of sample.statements.filter((x) => x.stakeholderId === st.id)) {
    const [label] = relabel([s.sourceId], s.quote, sources);
    if (!label || s.quote === null) continue;
    used.add(label);
    out.statements.push({ rating: s.rating, summary: s.summary, source_id: label, quote: s.quote, stated_at: s.statedAt });
  }
  for (const label of used) {
    const url = sources.find((s) => s.label === label)?.url;
    const ss = sample.sources.find((s) => s.url === url && s.accepted);
    if (ss) out.credibility.push({ source_id: label, credibility: ss.credibility, reason: ss.credibilityReason ?? "From the sample" });
  }
  return out;
}

const CHECK_LABEL: [RegExp, "sector" | "stage" | "experience" | "tie"][] = [
  [/^sector/i, "sector"],
  [/^stage/i, "stage"],
  [/^taiwan|experience/i, "experience"],
  [/^tie/i, "tie"],
];

export function mockLeads(entities: { key: string; name: string; nameZh: string | null; sources: PromptSource[] }[]): LeadsOutput {
  const leads: LeadsOutput["leads"] = [];
  for (const e of entities) {
    const st = findSampleStakeholder(e, e.sources);
    const lead = st && sample.leads.find((l) => l.stakeholderId === st.id);
    if (!lead?.why) continue;
    const why = relabel(lead.why.sourceIds, null, e.sources);
    if (why.length === 0) continue;
    const checks =
      lead.match.type === "checks"
        ? lead.match.checks.flatMap((c) => {
            const label = CHECK_LABEL.find(([re]) => re.test(c.label))?.[1];
            if (!label) return [];
            const ids = relabel(c.sourceIds, null, e.sources);
            return [{ label, passed: c.passed && ids.length > 0, source_ids: ids, note: c.label }];
          })
        : [];
    leads.push({ entity_key: e.key, kind: lead.kind, why: { text: lead.why.text, source_ids: why }, route: lead.route, checks, event_date: lead.eventDate });
  }
  return { leads };
}

/** For the brief (S4): sample sentences whose every source maps to a supplied one, relabelled. */
export function mockSentences(sentences: Sentence[], sources: PromptSource[]): Sentence[] {
  return sentences.flatMap((s) => {
    const ids = relabel(s.sourceIds, null, sources);
    return ids.length === s.sourceIds.length ? [{ text: s.text, sourceIds: ids }] : [];
  });
}
