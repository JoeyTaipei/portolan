// Run approach 3: take the entities from one Task run and enrich each with its own Task run,
// so every entity gets its own Basis (citations + excerpts), like FindAll enrichment.
// Usage: node scripts/spike/task-enrich.mjs <source: task-ultra> <processor: core>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api, spend, save, sleep, OUT } from "./lib.mjs";
import { CASE } from "./case.mjs";

const PRICE = { lite: 0.005, base: 0.01, core: 0.025 };
const [source, processor] = process.argv.slice(2);
const src = JSON.parse(readFileSync(join(OUT, `${source}.json`), "utf8")).result.output.content;
const entities = [
  ...src.stakeholders.map((s) => ({ name: s.name, kind: s.category })),
  ...src.investors.map((s) => ({ name: s.name, kind: "investor" })),
  ...src.law_firms.map((s) => ({ name: s.name, kind: "law firm" })),
  ...src.events.map((s) => ({ name: s.name, kind: "event" })),
];

const str = (d) => ({ type: "string", description: d });
const strOrNull = (d) => ({ type: ["string", "null"], description: d });
const props = {
  official_url: strOrNull("Official website of the organization or event, or null"),
  name_local: strOrNull("Official name in Traditional Chinese, or null"),
  role: str("What it does that matters for a US startup selling counter-UAS sensors into Taiwan, one sentence"),
  recent_fact: str("One concrete, dated recent fact (2025-2026) showing its relevance. Include the date."),
  stance_signal: str("Evidence of whether it is likely supportive, neutral or resistant to a foreign counter-UAS supplier, with the reason"),
  key_person: strOrNull("Name and title of a relevant senior official or executive as stated on an official or reputable public page, or null if not found. Never guess."),
  recommended_next_step: str("One specific next step for the startup with this organization or event"),
};
const task_spec = {
  input_schema: { type: "json", json_schema: { type: "object", properties: { entity_name: str("Organization or event"), entity_kind: str("Kind"), context: str("Who is asking and why") }, required: ["entity_name", "entity_kind", "context"], additionalProperties: false } },
  output_schema: { type: "json", json_schema: { type: "object", properties: props, required: Object.keys(props), additionalProperties: false } },
};
const context = `${CASE.client}; product: ${CASE.product}; market: ${CASE.target_market}; goal: ${CASE.goal}`;

spend(`task-enrich:${source}:${processor}:x${entities.length}`, PRICE[processor] * entities.length);
const t0 = Date.now();
const runs = [];
for (const e of entities) {
  const r = await api("POST", "/v1/tasks/runs", { processor, input: { entity_name: e.name, entity_kind: e.kind, context }, task_spec, metadata: { spike: "0001-enrich" } });
  runs.push({ ...e, run_id: r.run_id });
}
console.log(`created ${runs.length} runs`);
let pending = runs.map((r) => r.run_id);
while (pending.length) {
  await sleep(15000);
  const still = [];
  for (const id of pending) {
    const s = await api("GET", `/v1/tasks/runs/${id}`);
    if (s.is_active) still.push(id);
  }
  pending = still;
  console.log(`${Math.round((Date.now() - t0) / 1000)}s pending=${pending.length}`);
}
for (const r of runs) r.result = await api("GET", `/v1/tasks/runs/${r.run_id}/result`);
save(`${source}-enriched-${processor}.json`, { wall_s: Math.round((Date.now() - t0) / 1000), runs });
