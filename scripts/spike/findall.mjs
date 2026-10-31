// Run approach 2: FindAll to discover stakeholders, then Task enrichment on each match.
// Usage:
//   node scripts/spike/findall.mjs ingest
//   node scripts/spike/findall.mjs run <broad|gov|industry|investors|law|events> <preview|base|core> <match_limit>
//   node scripts/spike/findall.mjs enrich <findall_id> <processor> <expected_matches> <label>
//   node scripts/spike/findall.mjs wait <findall_id> <label>
import { api, spend, save, sleep } from "./lib.mjs";

// From https://docs.parallel.ai/getting-started/pricing (FindAll + Task tables).
const GEN = { preview: [0.1, 0], base: [0.25, 0.03], core: [2, 0.15], pro: [10, 1] };
const TASK = { lite: 0.005, base: 0.01, core: 0.025, pro: 0.1 };

// The preview of one broad "all organizations" query matched 1 of 13 (random LinkedIn pages),
// so the real runs use one narrow query per stakeholder type.
const recent = "There is public evidence from 2024 or later";
export const QUERIES = {
  broad: {
    objective: "FindAll organizations and events in Taiwan that a US counter-drone (counter-UAS) sensor startup must deal with to win a first Taiwan government pilot within 12 months: government agencies and procurement bodies, defense R&D and test institutes, regulators, legislative committees, industry associations, defense and drone companies, investors in drone or defense startups, law firms advising on defense procurement or export controls, and drone or defense trade events.",
    entity_type: "organizations",
    match_conditions: [
      { name: "taiwan_presence", description: "The organization is based in Taiwan or has an office or active programme in Taiwan; for events, the event is held in Taiwan." },
      { name: "uas_defense_role", description: `${recent} that the organization buys, regulates, funds, tests, builds, supplies, advises on, legislates on, or hosts events about drones, counter-drone systems or defense technology in Taiwan.` },
    ],
  },
  gov: {
    objective: "FindAll Taiwan government bodies (ministries, agencies, procurement offices, state defense research institutes, regulators, Legislative Yuan committees) that procure, test, certify, regulate, fund or legislate on military or civilian drones or counter-drone systems.",
    entity_type: "government bodies",
    match_conditions: [
      { name: "taiwan_public_body", description: "The entity is a Taiwan (Republic of China) central or local government ministry, agency, procurement office, regulator, Legislative Yuan committee, or a government-owned or government-funded research institute." },
      { name: "drone_role", description: `${recent} that it procures, tests, certifies, regulates, funds, budgets for or legislates on drones or counter-drone systems.` },
    ],
  },
  industry: {
    objective: "FindAll Taiwan-based companies and industry associations active in drones, counter-drone systems, or defense electronics and sensors that could be partners, integrators, suppliers or competitors for a foreign counter-drone sensor startup.",
    entity_type: "companies and industry associations",
    match_conditions: [
      { name: "taiwan_based", description: "The company or association is headquartered in Taiwan." },
      { name: "drone_business", description: `${recent} that it makes, integrates or supplies drones, counter-drone systems, drone components, or defense radar/RF/electro-optical sensors, or is an industry association for drones or defense.` },
    ],
  },
  investors: {
    objective: "FindAll investors (venture funds, corporate venture arms, government-backed funds, accelerators) that have invested in Taiwanese drone, counter-drone, defense or dual-use hardware startups since 2023.",
    entity_type: "investors",
    match_conditions: [
      { name: "investor", description: "The entity is an investor: a venture capital fund, corporate venture arm, government-backed fund, family office or accelerator." },
      { name: "taiwan_drone_deal", description: "There is public evidence that since 2023 it invested in a Taiwan-based drone, counter-drone, defense or dual-use hardware company, or launched a fund for that sector in Taiwan." },
    ],
  },
  law: {
    objective: "FindAll law firms in Taiwan with a public practice in defense or government procurement, export controls, or foreign investment approval and entity setup for foreign technology companies.",
    entity_type: "law firms",
    match_conditions: [
      { name: "taiwan_law_firm", description: "The entity is a law firm with an office in Taiwan." },
      { name: "relevant_practice", description: "Its own website or a legal directory lists a practice in government or defense procurement, export controls or trade controls, or foreign investment approval for companies entering Taiwan." },
    ],
  },
  events: {
    objective: "FindAll trade shows, conferences, summits and government supplier briefings held in Taiwan in 2026 or 2027 about drones, counter-drone systems, defense or aerospace.",
    entity_type: "events",
    match_conditions: [
      { name: "in_taiwan", description: "The event is held in Taiwan." },
      { name: "dates_2026_2027", description: "An edition of the event takes place in 2026 or 2027, or a 2026/2027 edition has been announced." },
      { name: "drone_defense_topic", description: "The event is focused on, or has a dedicated track or pavilion for, drones, counter-drone systems, defense or aerospace." },
    ],
  },
};

const str = (d) => ({ type: "string", description: d });
const strOrNull = (d) => ({ type: ["string", "null"], description: d });
const ENRICH_SCHEMA = {
  type: "json",
  json_schema: {
    type: "object",
    properties: {
      name_local: strOrNull("Official name in Traditional Chinese, or null"),
      category: { type: "string", enum: ["government", "legislature", "research_institute", "regulator", "industry_association", "company", "capital", "legal", "event"], description: "Category" },
      role: str("What this organization does that matters for a US startup selling counter-UAS sensors into Taiwan, one sentence"),
      recent_fact: str("One concrete, dated recent fact (2025-2026) showing its relevance, e.g. a tender, budget, regulation, MOU, deal or event date. Include the date."),
      stance_signal: str("Evidence of whether it is likely supportive, neutral or resistant to a foreign counter-UAS supplier, with the reason"),
      key_person: strOrNull("Name and title of a relevant senior official or executive as stated on an official or reputable public page, or null if not found. Never guess."),
      recommended_next_step: str("One specific next step for the startup with this organization"),
    },
    required: ["name_local", "category", "role", "recent_fact", "stance_signal", "key_person", "recommended_next_step"],
    additionalProperties: false,
  },
};

async function wait(id, label, t0 = Date.now()) {
  let r;
  for (;;) {
    r = await api("GET", `/v1beta/findall/runs/${id}`);
    const m = r.status.metrics ?? {};
    console.log(`${Math.round((Date.now() - t0) / 1000)}s ${r.status.status} generated=${m.generated_candidates_count} matched=${m.matched_candidates_count}`);
    if (!r.status.is_active) break;
    await sleep(20000);
  }
  const result = await api("GET", `/v1beta/findall/runs/${id}/result`);
  save(`findall-${label}.json`, { wall_s: Math.round((Date.now() - t0) / 1000), run: r, result });
}

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "run" && !QUERIES[a]) throw new Error(`unknown query ${a}`);
if (cmd === "ingest") {
  // Ingest has no listed price; it only converts the objective into a suggested schema.
  save("findall-ingest.json", await api("POST", "/v1beta/findall/ingest", { objective: QUERIES.broad.objective }));
} else if (cmd === "run") {
  // run <query> <generator> <match_limit>
  const [fixed, per] = GEN[b];
  const limit = Number(c);
  spend(`findall:${a}:${b}:${limit}`, fixed + per * limit);
  const t0 = Date.now();
  const run = await api("POST", "/v1beta/findall/runs", { ...QUERIES[a], generator: b, match_limit: limit, metadata: { spike: "0001", query: a } });
  console.log(`created ${run.findall_id}`);
  await wait(run.findall_id, `${a}-${b}`, t0);
} else if (cmd === "enrich") {
  // enrich <findall_id> <processor> <matches> <label>
  spend(`findall-enrich:${process.argv[6]}:${b}:x${c}`, TASK[b] * Number(c));
  const t0 = Date.now();
  await api("POST", `/v1beta/findall/runs/${a}/enrich`, { processor: b, output_schema: ENRICH_SCHEMA });
  await wait(a, `${process.argv[6]}-enriched-${b}`, t0);
} else if (cmd === "wait") {
  await wait(a, b);
} else {
  throw new Error("unknown command");
}
