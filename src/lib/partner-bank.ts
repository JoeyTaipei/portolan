import type { Market, PartnerQuestion, PartnerRelationship, QuestionPurpose } from "@/lib/types";

// NET-8 starter questions, built in code (no Claude, no cost). Used on samples, in mock mode and
// for any candidate with too little sourced fact to tailor. They are written for the relationship
// between the client and the candidate, aim at a strategic partnership, and carry no source
// except when a flag (exclusive deal, contract trouble) is raised by a quote the card already shows.

/** Words in a candidate's sourced role or evidence that point to a relationship. Order matters. */
const HINTS: [PartnerRelationship, RegExp][] = [
  ["channel", /\b(integrator|distribut|reseller|dealer|agent|representative|trading|import)|代理|經銷|整合商/i],
  ["adjacent", /\b(association|institute|university|laborator|standard|consortium|alliance|council|research)|協會|研究|大學|聯盟/i],
  ["complement", /\b(supplier|component|battery|motor|sensor|payload|antenna|chip|module|software|AI|autopilot|engine|manufactur)|供應|零組件|模組|晶片|電池/i],
];

/** Guess the relationship from sourced text only; `peer_vendor` is the default for an industry firm. */
export function classifyRelationship(text: string): PartnerRelationship {
  for (const [kind, re] of HINTS) if (re.test(text)) return kind;
  return text.trim() ? "peer_vendor" : "unclear";
}

export const RELATIONSHIP_LABEL: Record<PartnerRelationship, string> = {
  peer_vendor: "Sells to the same buyers",
  complement: "Supplies or needs what you make",
  channel: "Can carry you to buyers",
  adjacent: "Research or industry body",
  unclear: "Relationship not clear yet",
};

export const PURPOSE_LABEL: Record<QuestionPurpose, string> = {
  "find fit": "Find the fit",
  "joint bid": "Joint bid",
  pilot: "Pilot",
  channel: "Channel",
  terms: "Terms",
};

type Q = [QuestionPurpose, string];

/** Templates with {c} (client) and {p} (candidate); the Chinese dictionary has the same keys, so t.x translates them. */
function forRelationship(r: PartnerRelationship): Q[] {
  switch (r) {
    case "complement":
      return [
        ["find fit", "Which parts of {c}'s product could use what {p} supplies, and which of {p}'s products could use what {c} makes?"],
        ["pilot", "Would {p} run an integration test with {c}, and what would a first test need to show?"],
        ["joint bid", "If a buyer wants one combined offer, would {p} bid together with {c}, and who would lead?"],
        ["terms", "What volume, lead time and support would {p} expect from {c} before committing to a supply or co-development deal?"],
      ];
    case "channel":
      return [
        ["channel", "Which buyers does {p} already serve, and which of them have bought products like {c}'s?"],
        ["channel", "Which competing lines does {p} carry, and would it carry {c}'s alongside them?"],
        ["pilot", "Which approvals or certifications does {p} already hold that {c}'s product would need locally?"],
        ["terms", "Would {p} work with {c} without an exclusive deal on either side, and what margin and support would it expect?"],
      ];
    case "adjacent":
      return [
        ["find fit", "Which programmes, working groups or standards work at {p} could {c} join?"],
        ["pilot", "Could {p} test or validate {c}'s product, and would buyers accept the results?"],
        ["channel", "Which of {p}'s members or partners buy or specify products like {c}'s, and would {p} introduce {c}?"],
        ["terms", "What does {p} need from {c} to take part: data, samples, membership or funding?"],
      ];
    default:
      // A vendor like the client, or not yet clear: ask about fit and teaming, never about delivery records.
      return [
        ["find fit", "Where do {p}'s products overlap with {c}'s, and where could they fit together in one offer to the same buyers?"],
        ["joint bid", "Would {p} consider a joint bid or teaming arrangement where each side supplies what the other lacks?"],
        ["pilot", "Is there a small pilot or demonstration where {p} and {c} could show their products to a buyer together?"],
        ["terms", "What would {p} need from {c} (data, certifications, pricing, limits on exclusivity) before agreeing to work together?"],
      ];
  }
}

/** Taiwan-only checks a channel partner is asked (MND list, made-in-Taiwan rules, NCC). */
const TAIWAN_CHANNEL: Q[] = [
  ["pilot", "Are you on the MND list of qualified military suppliers?"],
  ["pilot", "Can you assemble or integrate in Taiwan to meet made-in-Taiwan rules?"],
  ["pilot", "Have you handled NCC approval and import of RF equipment?"],
];

export interface BankFlag {
  kind: "exclusive" | "contract";
  /** Source ids of the quote that raised the flag. */
  sourceIds: string[];
}

/** 4–5 starter questions (8 for a Taiwan channel partner) for one candidate. A flag swaps in a pointed question citing its quote. */
export function bankQuestions(args: { client: string; partner: string; relationship: PartnerRelationship; market: Market; flags: BankFlag[] }): PartnerQuestion[] {
  const { partner: p, relationship, market, flags } = args;
  // "X (sample client)" reads badly in a question: drop the bracket.
  const c = args.client.replace(/\s*\([^)]*\)\s*$/, "").trim() || args.client;
  const fill = (t: string) => t.replaceAll("{c}", c).replaceAll("{p}", p);
  let qs: PartnerQuestion[] = forRelationship(relationship).map(([purpose, text]) => ({ purpose, text: fill(text), sourceIds: [] }));
  if (market === "TW" && relationship === "channel") qs = [...qs, ...TAIWAN_CHANNEL.map(([purpose, text]) => ({ purpose, text, sourceIds: [] }))];
  const ex = flags.find((f) => f.kind === "exclusive");
  if (ex) {
    const i = qs.findIndex((q) => q.purpose === "terms");
    const q: PartnerQuestion = { purpose: "terms", text: fill("Does {p}'s existing exclusive deal cover {c}'s product category, and what would it take to work around it?"), sourceIds: ex.sourceIds };
    if (i >= 0) qs[i] = q;
    else qs.push(q);
  }
  const bad = flags.find((f) => f.kind === "contract");
  if (bad) qs.push({ purpose: "terms", text: fill("What happened with the contract the source describes, and is it resolved, before {c} commits to {p}?"), sourceIds: bad.sourceIds });
  return qs;
}
