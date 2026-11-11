// Partner candidates (spec NET-7, REP-14). Built by code only from data the dossier already has:
// Industry stakeholders on the map, their sourced facts, statements and ties to Government
// buyers. No Claude text and no new research. Flags are read from verbatim quotes and show the
// quote that triggered them. A card is a candidate ranked by public evidence, never an endorsement.
import { citations } from "@/lib/citation";
import { buildMapModel, NO_ROUTE } from "@/components/map/model";
import type { SourceRef } from "@/components/score/explain";
import { isEligible } from "@/lib/scoring";
import { marketInfo } from "@/lib/markets";
import type { Dossier, Market } from "@/lib/types";

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

/** Questions that only make sense in Taiwan (MND list, made-in-Taiwan rules, NCC). */
const TAIWAN_ONLY = new Set([
  "Are you on the MND list of qualified military suppliers?",
  "Can you assemble or integrate in Taiwan to meet made-in-Taiwan rules?",
  "Have you handled NCC approval and import of RF equipment?",
]);

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
  questions: string[];
}

/** trade.gov "Choosing a foreign representative", as questions; a flag swaps its question. */
export function partnerQuestions(flags: FlagKind[], market: Market = "TW"): string[] {
  const has = (k: FlagKind) => flags.includes(k);
  const all = [
    "How many sales and engineering staff work on government or defence projects?",
    has("contract")
      ? "What happened with the contract the source describes, and is it resolved?"
      : "Which government contracts have you delivered, and can we see the acceptance results?",
    "Which competing products do you already carry?",
    has("exclusive")
      ? "Does your existing exclusive deal cover our product's category?"
      : "Would you work with us without an exclusive deal on either side?",
    "Are you on the MND list of qualified military suppliers?",
    "Can you assemble or integrate in Taiwan to meet made-in-Taiwan rules?",
    "Have you handled NCC approval and import of RF equipment?",
  ];
  return market === "TW" ? all : all.filter((q) => !TAIWAN_ONLY.has(q));
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function buildPartners(d: Dossier, now: Date): PartnerVM[] {
  const refs = citations(d).allOf;
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
        questions: partnerQuestions(flags.map((f) => f.kind), d.market),
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

/** Ties to buyers first; an item citing exactly the same sources as an earlier one is dropped. */
function dedupe(xs: PartnerEvidence[]): PartnerEvidence[] {
  const key = (x: PartnerEvidence) => x.refs.map((r) => r.id).sort().join(",");
  return xs.filter((x, i) => xs.findIndex((y) => y.text === x.text || key(y) === key(x)) === i);
}
