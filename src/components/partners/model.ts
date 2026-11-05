// Partner candidates (spec NET-7, REP-14). Built by code only from data the dossier already has:
// Industry stakeholders on the map, their sourced facts, statements and ties to Government
// buyers. No Claude text and no new research. Flags are read from verbatim quotes and show the
// quote that triggered them. A card is a candidate ranked by public evidence, never an endorsement.
import { citable } from "@/components/brief/model";
import { buildMapModel, NO_ROUTE } from "@/components/map/model";
import { sourceRef, type SourceRef } from "@/components/score/explain";
import { isEligible } from "@/lib/scoring";
import { marketInfo } from "@/lib/markets";
import { bankQuestions, classifyRelationship } from "@/lib/partner-bank";
import type { Dossier, Market, PartnerQuestionEntry, PartnerRelationship, QuestionPurpose, Source } from "@/lib/types";

/** NET-7: the fixed line under the cards (shown as the Partners tab note). */
export const PARTNER_NOTE =
  "No public list of MND-qualified suppliers or TEDIBOA members was found, so this list may be incomplete. Ranked by public evidence, not endorsed.";

/** MKT-1: the Partners note for a market (Taiwan keeps PARTNER_NOTE). */
export function partnerNote(market: Market): string {
  return market === "TW" ? PARTNER_NOTE : "No public list of qualified local partners was checked, so this list may be incomplete. Ranked by public evidence, not endorsed.";
}

/** MKT-1: the empty Partners tab, "…finds Vietnamese firms…". */
export function partnersEmpty(market: Market): string {
  return `Candidates appear once research finds ${marketInfo(market).adjective} firms with public, sourced evidence.`;
}

/** MKT-1: the A4's empty partner line, "No Vietnamese firm…". */
export function partnersEmptyA4(market: Market): string {
  return `No ${marketInfo(market).adjective} firm with sourced evidence yet.`;
}

export interface PartnerEvidence {
  text: string;
  refs: SourceRef[];
}

export type FlagKind = "exclusive" | "contract";

export const FLAG_LABEL: Record<FlagKind, string> = {
  exclusive: "Exclusive deal",
  contract: "Contract trouble",
};

const FLAG_RE: Record<FlagKind, RegExp> = {
  exclusive: /(?<!non-)\bexclusive|獨家/i,
  contract: /\bannul|\bterminat|\bcancel|failed to meet|解約|終止/i,
};

export interface PartnerFlag {
  kind: FlagKind;
  label: string;
  /** The verbatim text in the source that triggered the flag. */
  quote: string;
  refs: SourceRef[];
}

export interface PartnerVM {
  id: string;
  name: string;
  /** Short name, for the A4 row. */
  short: string;
  nameZh: string | null;
  role: PartnerEvidence | null;
  evidence: PartnerEvidence[];
  /** Government buyers on the map it has a sourced tie to (short names). */
  buyers: string[];
  sourceCount: number;
  flags: PartnerFlag[];
  next: { text: string; verified: boolean; refs: SourceRef[] };
  /** NET-8: written for this client and this candidate. `tailored` false = starter questions from code. */
  questions: { text: string; purpose: QuestionPurpose; refs: SourceRef[] }[];
  tailored: boolean;
  relationship: PartnerRelationship;
  /** Why the relationship was chosen (tailored only). */
  basis: PartnerEvidence | null;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function buildPartners(d: Dossier, now: Date): PartnerVM[] {
  const ok = citable(d);
  const refs = (ids: string[]) => (ids.length > 0 && ids.every((id) => ok.has(id)) ? ids.map((id) => sourceRef(ok.get(id) as Source)) : null);
  const byId = new Map(d.stakeholders.map((s) => [s.id, s]));
  const nodes = new Map(buildMapModel(d, now).nodes.map((n) => [n.id, n]));

  const cards = d.stakeholders
    .filter((s) => s.category === "ind" && isEligible(s) && !s.isChina)
    .map((s) => {
      const evidence: PartnerEvidence[] = [];
      const flags: PartnerFlag[] = [];
      const flag = (quote: string | null, r: SourceRef[]) => {
        if (!quote) return;
        for (const kind of Object.keys(FLAG_RE) as FlagKind[])
          if (FLAG_RE[kind].test(quote) && !flags.some((f) => f.kind === kind)) flags.push({ kind, label: FLAG_LABEL[kind], quote, refs: r });
      };

      let role: PartnerEvidence | null = null;
      for (const f of d.facts) {
        if (f.stakeholderId !== s.id || f.status !== "sourced") continue;
        if (f.field !== "role" && f.field !== "recent" && f.field !== "access") continue;
        const r = refs(f.sourceIds);
        if (!r || !text(f.value)) continue;
        if (f.field === "role" && !role) role = { text: text(f.value), refs: r };
        else evidence.push({ text: text(f.value), refs: r });
        flag(f.quote, r);
      }
      for (const st of d.statements) {
        if (st.stakeholderId !== s.id) continue;
        const r = refs([st.sourceId]);
        if (!r) continue;
        evidence.push({ text: st.summary, refs: r });
        flag(st.quote, r);
      }
      const buyers: string[] = [];
      const ties: PartnerEvidence[] = [];
      for (const e of d.edges) {
        if (e.status !== "sourced" || (e.aId !== s.id && e.bId !== s.id)) continue;
        const other = byId.get(e.aId === s.id ? e.bId : e.aId);
        const r = refs(e.sourceIds);
        if (!other || other.category !== "gov" || !r) continue;
        const who = other.short ?? other.name;
        if (!buyers.includes(who)) buyers.push(who);
        ties.push({ text: `${who}: ${e.relation}`, refs: r });
      }

      const ids = new Set([...(role?.refs ?? []), ...evidence.flatMap((x) => x.refs), ...ties.flatMap((x) => x.refs)].map((x) => x.id));
      const node = nodes.get(s.id);
      const verified = !!node?.action.verified;
      const stored = d.partnerQuestions?.entries.find((e) => e.stakeholderId === s.id);
      const tailored = storedQuestions(stored, refs);
      const relationship = tailored ? stored!.relationship : classifyRelationship([role?.text ?? "", ...evidence.map((x) => x.text)].join(" "));
      const starter = tailored
        ? []
        : bankQuestions({
            client: d.company,
            partner: s.short ?? s.name,
            relationship,
            market: d.market,
            flags: flags.map((f) => ({ kind: f.kind, sourceIds: f.refs.map((r) => r.id) })),
          }).flatMap((q) => {
            const r = q.sourceIds.length ? refs(q.sourceIds) : [];
            return r ? [{ text: q.text, purpose: q.purpose, refs: r }] : [];
          });
      return {
        id: s.id,
        name: s.name,
        short: s.short ?? s.name,
        nameZh: s.nameZh,
        role,
        evidence: dedupe([...ties, ...evidence]),
        buyers,
        sourceCount: ids.size,
        flags,
        next: { text: verified ? node!.action.text : NO_ROUTE, verified, refs: verified ? node!.action.sources : [] },
        questions: tailored ?? starter,
        tailored: !!tailored,
        relationship,
        basis: tailored && stored?.basis ? { text: stored.basis.text, refs: refs(stored.basis.sourceIds) ?? [] } : null,
        influence: node?.influence?.score ?? -1,
      };
    })
    .filter((c) => c.role !== null || c.evidence.length > 0);

  // A buyer ending its contract with them outweighs any amount of evidence: those go last.
  const trouble = (c: { flags: PartnerFlag[] }) => Number(c.flags.some((f) => f.kind === "contract"));
  cards.sort(
    (a, b) =>
      trouble(a) - trouble(b) ||
      Number(b.buyers.length > 0) - Number(a.buyers.length > 0) ||
      b.sourceCount - a.sourceCount ||
      b.influence - a.influence ||
      a.name.localeCompare(b.name),
  );
  return cards.map(({ influence: _, ...c }) => c);
}

/** A stored set's questions for one candidate, kept only while every cited source is still citable. */
function storedQuestions(entry: PartnerQuestionEntry | undefined, refs: (ids: string[]) => SourceRef[] | null): PartnerVM["questions"] | null {
  if (!entry) return null;
  const qs = entry.questions.flatMap((q) => {
    const r = refs(q.sourceIds);
    return r ? [{ text: q.text, purpose: q.purpose, refs: r }] : [];
  });
  return qs.length >= 2 ? qs : null;
}

/** Ties to buyers first; an item citing exactly the same sources as an earlier one is dropped. */
function dedupe(xs: PartnerEvidence[]): PartnerEvidence[] {
  const key = (x: PartnerEvidence) => x.refs.map((r) => r.id).sort().join(",");
  return xs.filter((x, i) => xs.findIndex((y) => y.text === x.text || key(y) === key(x)) === i);
}
