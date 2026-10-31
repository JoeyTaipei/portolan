// The Taiwan UAS case from src/fixtures/taiwan-uas.ts and the 01 Dossiers form placeholders.
// The client company is fictional, so the research is about the market, not the client.
export const CASE = {
  client: "A US counter-drone (counter-UAS) startup, not yet present in Taiwan",
  product: "Counter-UAS sensor kit (drone detection: RF and radar sensors, datalink)",
  target_market: "Taiwan",
  goal: "Win a first government pilot in 12 months",
};

const str = (description) => ({ type: "string", description });
const strOrNull = (description) => ({ type: ["string", "null"], description });
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const list = (description, item) => ({ type: "array", description, items: obj(item) });

const sourceUrl = str("The single best public source URL that supports this entry (official site, government gazette, legislative record, or reputable news).");

export const TASK_SPEC = {
  input_schema: {
    type: "json",
    json_schema: obj({
      client: str("Who the client is"),
      product: str("What the client sells"),
      target_market: str("Country the client is entering"),
      goal: str("What the client wants in the next 12 months"),
    }),
  },
  output_schema: {
    type: "json",
    json_schema: obj({
      stakeholders: list(
        "25 to 40 real organizations in the target market that matter for this client's goal: government agencies and procurement bodies, defense R&D and test institutes, regulators (airspace, spectrum), legislative committees, industry associations, local primes, OEMs and component suppliers that could be partners or competitors. Organizations only; do not list the client. Only include entities you can source. Prefer Taiwanese official and Chinese-language sources where they exist.",
        {
          name: str("Official English name"),
          name_local: strOrNull("Official name in Traditional Chinese, or null"),
          category: { type: "string", enum: ["government", "legislature", "research_institute", "regulator", "industry_association", "company", "capital", "legal", "event"], description: "Category" },
          role: str("What this organization does that matters for selling counter-UAS sensors into Taiwan, in one sentence"),
          recent_fact: str("One concrete, dated recent fact (2025-2026) showing its relevance, e.g. a tender, budget line, regulation, MOU or statement. Include the date."),
          stance_signal: str("Evidence of whether it is likely supportive, neutral or resistant to a foreign counter-UAS supplier, with the reason"),
          key_person: strOrNull("Name and title of a relevant senior official or executive as stated on an official or reputable public page, or null if not found. Never guess."),
          recommended_next_step: str("One specific next step for the client with this organization"),
          source_url: sourceUrl,
        }
      ),
      investors: list(
        "Up to 8 investors (VC funds, corporate VCs, government funds, family offices) active in Taiwan defense, drone or dual-use hardware deals",
        {
          name: str("Investor name"),
          type: str("Fund type"),
          focus: str("Stage, ticket size or sector focus if published"),
          why_relevant: str("Concrete evidence they invest in drones, defense or dual-use, with date"),
          source_url: sourceUrl,
        }
      ),
      law_firms: list(
        "Up to 6 Taiwan law firms or lawyers with public practice in defense procurement, export controls, foreign investment approval or entity setup",
        {
          name: str("Firm name"),
          practice: str("Relevant practice area"),
          why_relevant: str("Concrete evidence of relevant work"),
          source_url: sourceUrl,
        }
      ),
      events: list(
        "Up to 8 upcoming events in Taiwan (trade shows, procurement briefings, drone summits) in late 2026 to 2027 where these stakeholders gather",
        {
          name: str("Event name"),
          dates: strOrNull("Dates as published, or null if not yet announced. Never guess."),
          venue: strOrNull("Venue as published, or null"),
          why_relevant: str("Who attends and why it matters for the client"),
          source_url: sourceUrl,
        }
      ),
    }),
  },
};
