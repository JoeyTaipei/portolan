import type { Category } from "@/lib/types";
import type { TaskSpec } from "@/lib/parallel/types";
import type { DiscoveredEntity } from "./filter";

// Task specs for the two Parallel steps (spec §7.2, decision 0001 approach C).
// discover: one `ultra` run, ≤ 20 schema properties, target 40–50 entities.
// enrich: one `core` run per entity in a Task Group; every field needs a Basis citation.

const str = (description: string) => ({ type: "string", description });
const strOrNull = (description: string) => ({ type: ["string", "null"], description });
const CATEGORIES: Category[] = ["gov", "ind", "cap", "leg", "evt"];

export interface ResearchClient {
  company: string;
  product: string;
  goal: string;
}

export const DISCOVER_SPEC: TaskSpec = {
  input_schema: {
    type: "json",
    json_schema: {
      type: "object",
      properties: { company: str("Client company"), product: str("Client product"), goal: str("Client goal"), market: str("Target market") },
      required: ["company", "product", "goal", "market"],
      additionalProperties: false,
    },
  },
  output_schema: {
    type: "json",
    json_schema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          description:
            "40 to 50 real organisations and events in the target market that matter for the client's goal: government agencies and regulators, legislative committees, industry partners and suppliers, investors, law firms, and upcoming events. Each needs its own public source. Never invent one.",
          items: {
            type: "object",
            properties: {
              name: str("Official English name"),
              name_zh: strOrNull("Official name in Traditional Chinese, or null"),
              category: { type: "string", enum: CATEGORIES, description: "gov government or legislature; ind industry; cap investor; leg law firm; evt event" },
              why_relevant: str("Why it matters for the client's goal, one sentence"),
              url: strOrNull("Official website, or null"),
              is_person: { type: "boolean", description: "True only if this entry is an individual person" },
              country: str("ISO 3166 alpha-2 country code of the organisation, e.g. TW"),
            },
            required: ["name", "name_zh", "category", "why_relevant", "url", "is_person", "country"],
            additionalProperties: false,
          },
        },
      },
      required: ["entities"],
      additionalProperties: false,
    },
  },
};

export function discoverInput(c: ResearchClient): Record<string, unknown> {
  return { company: c.company, product: c.product, goal: c.goal, market: "Taiwan" };
}

/** Parse discover output defensively: anything malformed is skipped, never guessed. */
export function parseDiscover(content: Record<string, unknown>): DiscoveredEntity[] {
  const raw = Array.isArray(content.entities) ? content.entities : [];
  return raw.flatMap((x): DiscoveredEntity[] => {
    if (!x || typeof x !== "object") return [];
    const e = x as Record<string, unknown>;
    if (typeof e.name !== "string" || !e.name.trim()) return [];
    const category = CATEGORIES.includes(e.category as Category) ? (e.category as Category) : "ind";
    return [
      {
        name: e.name.trim(),
        nameZh: typeof e.name_zh === "string" && e.name_zh.trim() ? e.name_zh.trim() : null,
        category,
        whyRelevant: typeof e.why_relevant === "string" ? e.why_relevant.trim() : "",
        url: typeof e.url === "string" && /^https?:\/\//.test(e.url) ? e.url : null,
        isPerson: e.is_person === true,
        country: typeof e.country === "string" ? e.country.trim() : null,
      },
    ];
  });
}

export const ENRICH_SPEC: TaskSpec = {
  input_schema: {
    type: "json",
    json_schema: {
      type: "object",
      properties: { entity_name: str("Organisation or event"), entity_kind: str("Kind"), context: str("Who is asking and why") },
      required: ["entity_name", "entity_kind", "context"],
      additionalProperties: false,
    },
  },
  output_schema: {
    type: "json",
    json_schema: {
      type: "object",
      properties: {
        official_url: strOrNull("Official website, or null"),
        name_local: strOrNull("Official name in Traditional Chinese, or null"),
        role: str("Its mandate: what it does that matters for the client's goal, one sentence"),
        key_person: strOrNull("Name and title of its head or a relevant senior official, as stated on an official or reputable public page; null if not found. Never guess."),
        budget: strOrNull("Budget or programme it controls that is relevant to the goal, with amount and date as stated, or null"),
        recent_fact: str("One concrete, dated recent fact (last 12 months) showing its relevance. Include the date."),
        stance_signal: str("What it has said or done about foreign companies like the client, with the reason"),
        ties: {
          type: "array",
          description: "Documented ties to other organisations relevant to the goal (oversight, funding, partnership, membership)",
          items: {
            type: "object",
            properties: { entity: str("The other organisation's name"), relation: str("The tie, a few words") },
            required: ["entity", "relation"],
            additionalProperties: false,
          },
        },
        events: {
          type: "array",
          description: "Upcoming dated events: budget votes, tender closing dates, committee reviews, exhibitions",
          items: {
            type: "object",
            properties: {
              title: str("What happens"),
              kind: { type: "string", enum: ["budget_vote", "tender_close", "committee_review", "event"] },
              date: strOrNull("YYYY-MM-DD as stated in a source, or null"),
            },
            required: ["title", "kind", "date"],
            additionalProperties: false,
          },
        },
        city: strOrNull("City of its headquarters or venue, or null"),
        recommended_next_step: str("One specific next step for the client with this organisation or event"),
      },
      required: ["official_url", "name_local", "role", "key_person", "budget", "recent_fact", "stance_signal", "ties", "events", "city", "recommended_next_step"],
      additionalProperties: false,
    },
  },
};

const KIND: Record<Category, string> = { gov: "government", ind: "company", cap: "investor", leg: "law firm", evt: "event" };

export function enrichInput(e: { name: string; category: Category }, c: ResearchClient): Record<string, unknown> {
  return {
    entity_name: e.name,
    entity_kind: KIND[e.category],
    context: `${c.company}; product: ${c.product}; market: Taiwan; goal: ${c.goal}`,
  };
}
