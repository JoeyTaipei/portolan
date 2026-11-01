// Re-fetch FindAll snapshots (free GETs) to see whether enrichment finished after the run went idle.
// Usage: node scripts/spike/refetch.mjs <label...>   reads findall ids from out/findall-<label>.log
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api, save, OUT } from "./lib.mjs";
for (const q of process.argv.slice(2)) {
  const id = readFileSync(join(OUT, `findall-${q}.log`), "utf8").match(/findall_[a-f0-9]+/)[0];
  const run = await api("GET", `/v1beta/findall/runs/${id}`);
  const result = await api("GET", `/v1beta/findall/runs/${id}/result`);
  const m = result.candidates.filter((c) => c.match_status === "matched");
  const enriched = m.filter((c) => Object.values(c.output ?? {}).some((o) => o.type === "enrichment")).length;
  console.log(q, run.status.status, run.status.termination_reason, `matched=${m.length} enriched=${enriched}`);
  save(`findall-${q}-refetch.json`, { run, result });
}
