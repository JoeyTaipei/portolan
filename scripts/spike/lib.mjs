// Spike helpers (not app code). Reads PARALLEL_API_KEY from .env.local, never prints it.
// Every paid call goes through spend(), which refuses to go past the US$10 spike budget.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });

const BUDGET_USD = 10;
const LEDGER = join(OUT, "ledger.json");
const BASE = "https://api.parallel.ai";

function loadKey() {
  if (process.env.PARALLEL_API_KEY) return process.env.PARALLEL_API_KEY;
  const env = readFileSync(join(here, "../../.env.local"), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("PARALLEL_API_KEY="));
  if (!line) throw new Error("PARALLEL_API_KEY missing in .env.local");
  return line.slice("PARALLEL_API_KEY=".length).trim().replace(/^"|"$/g, "");
}
const KEY = loadKey();

export async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "x-api-key": KEY, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

export function ledger() {
  return existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : [];
}

// Record an estimated charge before making the call; throws if it would break the budget.
export function spend(label, estimateUsd) {
  if (!Number.isFinite(estimateUsd)) throw new Error(`Budget guard: bad estimate for ${label}`);
  const rows = ledger();
  const total = rows.reduce((s, r) => s + r.estimate_usd, 0);
  if (total + estimateUsd > BUDGET_USD) {
    throw new Error(`Budget guard: ${label} ($${estimateUsd}) would take spend to $${(total + estimateUsd).toFixed(2)} > $${BUDGET_USD}`);
  }
  rows.push({ label, estimate_usd: estimateUsd, at: new Date().toISOString() });
  writeFileSync(LEDGER, JSON.stringify(rows, null, 2));
  console.log(`[budget] ${label}: est $${estimateUsd.toFixed(3)} (running total $${(total + estimateUsd).toFixed(3)})`);
}

export function save(name, data) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2));
  console.log(`[saved] scripts/spike/out/${name}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
