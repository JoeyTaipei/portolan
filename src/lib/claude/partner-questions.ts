import "server-only";
import { z } from "zod";
import { buildPartners, type PartnerVM } from "@/components/partners/model";
import { sentenceProblem } from "@/lib/checks/pre-display";
import { indexSources } from "@/lib/checks/source-check";
import { MODELS } from "@/lib/limits/prices";
import { marketInfo } from "@/lib/markets";
import type { Dossier, PartnerQuestionEntry, PartnerRelationship } from "@/lib/types";
import { callStructured, claudeLive, type LedgerContext } from "./client";
import { attr, dataRules, fence, sourceBlocks, type PromptSource } from "./prompts";

// NET-8 tailored partner questions (spec NET-8, plan S23; risky change: paid API). One Opus call
// for all candidates. Claude sees only accepted, verified sources of each candidate and names the
// relationship first; code then keeps a question only if it cites ids that candidate has, passes
// the pre-display check and is not a repeat. A candidate left with fewer than 2 questions is not
// stored, so the card keeps its starter questions. Live only: mock mode and samples use the bank.

/** Typical and worst-case cost shown before the call (about 8k tokens in, 3k out; max 8k out). */
export const PARTNER_Q_TYPICAL_USD = 0.1;
const MAX_TOKENS = 8_000;
/** Candidates sent per call, best-evidenced first. */
export const MAX_CANDIDATES = 12;
const MIN_QUESTIONS = 2;
const MAX_QUESTIONS = 5;

const Q = z.object({
  text: z.string().describe("One question, at most 35 words, addressed to the candidate"),
  purpose: z.enum(["find fit", "joint bid", "pilot", "channel", "terms"]),
  source_ids: z.array(z.string()).describe("Labels of the <source> blocks inside this candidate's <entity> that the question relies on; at least one"),
});

export const PartnerQuestionsOutput = z.object({
  candidates: z.array(
    z.object({
      entity_key: z.string().describe("The key attribute of the <entity> block"),
      relationship: z.enum(["peer_vendor", "complement", "channel", "adjacent", "unclear"]),
      basis: z.object({ text: z.string().describe("One sentence on why this relationship, from the sources"), source_ids: z.array(z.string()) }),
      questions: z.array(Q).describe("3 to 5 questions"),
    }),
  ),
});
export type PartnerQuestionsOutput = z.infer<typeof PartnerQuestionsOutput>;

export const partnerQuestionsSystem = (d: Pick<Dossier, "market">) => `You write questions for a startup entering ${marketInfo(d.market).name} to ask companies and bodies that could become its strategic partners. The goal of every question is a strategic partnership: finding where the two sides fit, teaming on a bid, piloting together, reaching buyers, and the terms that make it work.

${dataRules(marketInfo(d.market).procurementLaw)}

For each candidate, first name the relationship between the client and the candidate from the sources:
- peer_vendor: also sells to the same buyers, so a peer, rival or possible teammate.
- complement: supplies something the client's product needs, or needs the client's product.
- channel: an integrator, distributor or local representative that could carry the product to buyers.
- adjacent: a research body, standards body or industry association.
- unclear: the sources do not show it. Then ask only about fit and what each side would need.
Then write 3 to 5 questions that fit that relationship and this one candidate, using what its sources say (its products, recent actions, buyers, deals). Rules:
- Tailor every question: it must name something specific from this candidate's sources, not a question that would suit any firm.
- Never ask a peer_vendor or complement about its delivery record, acceptance results, qualifications to supply the client, or sales staff: they are not the client's supplier. Ask what a partnership would need from each side.
- Each question is one sentence addressed to the candidate, uses the company names given, and has a purpose: find fit, joint bid, pilot, channel or terms.
- If a source shows an exclusive deal or a cancelled contract, one question must ask about it directly.
- Never put a person's name in a question. No bracketed placeholders.`;

function candidateBlock(p: PartnerVM, sources: PromptSource[]): string {
  const facts = [p.role?.text, ...p.evidence.map((e) => e.text)].filter(Boolean).map((t) => `- ${fence(t as string)}`);
  const flags = p.flags.map((f) => `- Flag: ${f.label}: "${fence(f.quote)}"`);
  return `<entity key="${attr(p.id)}" name="${attr(p.name)}">\n${[...facts, ...flags].join("\n")}\n\n${sourceBlocks(sources)}\n</entity>`;
}

export function partnerQuestionsPrompt(d: Dossier, blocks: string[], today: string): string {
  return `Today is ${today}.

<client>
Company: ${fence(d.company)}
Product: ${fence(d.product)}
Goal: ${fence(d.goal)}
Target market: ${marketInfo(d.market).name}
</client>

${blocks.join("\n\n")}

Write the questions for each candidate.`;
}

/** The labels of the sources a candidate may cite → their source ids. */
function poolFor(d: Dossier, p: PartnerVM): { sources: PromptSource[]; byLabel: Map<string, string> } {
  const ids = new Set([...(p.role?.refs ?? []), ...p.evidence.flatMap((e) => e.refs), ...p.flags.flatMap((f) => f.refs)].map((r) => r.id));
  const pool = d.sources.filter((s) => ids.has(s.id) && s.accepted && s.verifiedAt);
  return {
    sources: pool.slice(0, 5).map((s) => ({ label: s.label, url: s.url, title: s.title, excerpt: s.excerpt.slice(0, 1600) })),
    byLabel: new Map(pool.slice(0, 5).map((s) => [s.label, s.id])),
  };
}

/** A peer or complement is not the client's supplier: delivery and acceptance questions are wrong for them. */
const SUPPLIER_STYLE = /\bacceptance\b|delivery record|delivered (any|which)|which (government )?contracts have you|sales and engineering staff/i;

/** Keep only questions that cite this candidate's own sources, pass the check and are not repeats. */
export function checkEntry(
  d: Dossier,
  stakeholderId: string,
  out: PartnerQuestionsOutput["candidates"][number],
  byLabel: ReadonlyMap<string, string>,
): PartnerQuestionEntry | null {
  const ctx = { sources: indexSources(d.sources), offMapNames: [], chinaPeople: [] };
  const ids = (labels: string[]) => [...new Set(labels.flatMap((l) => byLabel.get(l) ?? []))];
  const seen = new Set<string>();
  const questions = out.questions.flatMap((q) => {
    const sourceIds = ids(q.source_ids);
    const key = q.text.toLowerCase().replace(/\W+/g, " ").trim();
    if (!sourceIds.length || !q.text.trim() || seen.has(key)) return [];
    if ((out.relationship === "peer_vendor" || out.relationship === "complement") && SUPPLIER_STYLE.test(q.text)) return [];
    if (sentenceProblem({ text: q.text, sourceIds }, ctx)) return [];
    seen.add(key);
    return [{ text: q.text.trim(), purpose: q.purpose, sourceIds }];
  });
  if (questions.length < MIN_QUESTIONS) return null;
  const basisIds = ids(out.basis.source_ids);
  const basis = basisIds.length && !sentenceProblem({ text: out.basis.text, sourceIds: basisIds }, ctx) ? { text: out.basis.text.trim(), sourceIds: basisIds } : null;
  const relationship: PartnerRelationship = basis ? out.relationship : "unclear";
  return { stakeholderId, relationship, basis: relationship === "unclear" ? null : basis, questions: questions.slice(0, MAX_QUESTIONS) };
}

export type PartnerQuestionsResult = { ok: true; entries: PartnerQuestionEntry[]; model: string } | { ok: false; reason: string };

/** Candidates that would be sent: the same cards the Partners tab shows, best-evidenced first. */
export function questionCandidates(d: Dossier, now: Date): PartnerVM[] {
  return buildPartners({ ...d, partnerQuestions: null }, now)
    .filter((p) => poolFor(d, p).sources.length > 0)
    .slice(0, MAX_CANDIDATES);
}

export async function writePartnerQuestions(d: Dossier, ledger: LedgerContext, now: Date): Promise<PartnerQuestionsResult> {
  const cands = questionCandidates(d, now);
  if (!cands.length) return { ok: false, reason: "No partner candidate has sourced facts to write from yet." };
  const pools = new Map(cands.map((p) => [p.id, poolFor(d, p)]));
  const r = await callStructured({
    model: MODELS.opus,
    system: partnerQuestionsSystem(d),
    user: partnerQuestionsPrompt(d, cands.map((p) => candidateBlock(p, pools.get(p.id)!.sources)), now.toISOString().slice(0, 10)),
    schema: PartnerQuestionsOutput,
    maxTokens: MAX_TOKENS,
    effort: "medium",
    ledger,
  });
  if (!r.ok) return { ok: false, reason: r.reason === "budget" ? "Today's AI budget for this dossier is used up." : r.detail };
  const entries = r.data.candidates.flatMap((c) => {
    const pool = pools.get(c.entity_key);
    const e = pool ? checkEntry(d, c.entity_key, c, pool.byLabel) : null;
    return e ? [e] : [];
  });
  if (!entries.length) return { ok: false, reason: "None of the questions passed the source check. Nothing was saved." };
  return { ok: true, entries, model: r.model };
}

/** Live only; the sample and mock mode keep the starter questions. */
export function partnerQuestionsLive(): boolean {
  return claudeLive();
}
