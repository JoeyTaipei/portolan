// Run approach 1: one Task API run that returns the whole stakeholder map.
// Usage: node scripts/spike/task-run.mjs <processor>   (pro | ultra | core ...)
import { api, spend, save, sleep } from "./lib.mjs";
import { CASE, TASK_SPEC } from "./case.mjs";

// $ per run, from https://docs.parallel.ai/getting-started/pricing (Task API table).
const PRICE = { lite: 0.005, base: 0.01, core: 0.025, core2x: 0.05, pro: 0.1, ultra: 0.3, ultra2x: 0.6 };

const processor = process.argv[2];
if (!PRICE[processor]) throw new Error(`Unknown processor ${processor}`);

spend(`task:${processor}`, PRICE[processor]);
const t0 = Date.now();
const run = await api("POST", "/v1/tasks/runs", {
  processor,
  input: CASE,
  task_spec: TASK_SPEC,
  metadata: { spike: "0001-taiwan-uas" },
});
console.log(`created ${run.run_id} status=${run.status}`);

let status = run;
while (status.is_active) {
  await sleep(15000);
  status = await api("GET", `/v1/tasks/runs/${run.run_id}`);
  console.log(`${Math.round((Date.now() - t0) / 1000)}s status=${status.status}`);
}
const result = await api("GET", `/v1/tasks/runs/${run.run_id}/result`);
const wall_s = Math.round((Date.now() - t0) / 1000);
save(`task-${processor}.json`, { processor, wall_s, run: status, result });
console.log(`done in ${wall_s}s, status=${status.status}`);
