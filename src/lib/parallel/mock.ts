import "server-only";
import { randomBytes } from "node:crypto";
import type { BasisEntry, RunInput, TaskGroupStatus, TaskRun, TaskRunResult } from "./types";

// RESEARCH_MODE=mock (the default): replays the spike runs already paid for
// (scripts/spike/out/task-ultra.json and task-ultra-enriched-core.json) with short delays.
// No network. Run ids carry everything needed to answer later requests, so replays survive a
// server restart: mock_trun_<processor>_<createdMs>_<random>_<spike index>.

const ULTRA_DELAY_MS = 4_000;
const CORE_DELAY_MS = 2_000;
const CORE_STAGGER_MS = 700;

interface SpikeEnrichRun {
  name: string;
  kind: string;
  result: TaskRunResult;
}

let cache: Promise<SpikeEnrichRun[]> | null = null;
async function spikeRuns(): Promise<SpikeEnrichRun[]> {
  cache ??= import("../../../scripts/spike/out/task-ultra-enriched-core.json").then(
    (m) => (m.default as unknown as { runs: SpikeEnrichRun[] }).runs,
  );
  return cache;
}

const KIND_TO_CATEGORY: Record<string, "gov" | "ind" | "cap" | "leg" | "evt"> = {
  government: "gov",
  regulator: "gov",
  legislature: "gov",
  research_institute: "gov",
  industry_association: "ind",
  company: "ind",
  investor: "cap",
  "law firm": "leg",
  event: "evt",
};

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function newId(processor: string, idx: number): string {
  return `mock_trun_${processor}_${Date.now()}_${randomBytes(4).toString("hex")}_${idx}`;
}

function parseId(runId: string): { processor: string; createdMs: number; idx: number } | null {
  const m = /^mock_trun_(ultra|core)_(\d+)_[0-9a-f]{8}_(-?\d+)$/.exec(runId);
  return m ? { processor: m[1], createdMs: Number(m[2]), idx: Number(m[3]) } : null;
}

function readyAt(p: { processor: string; createdMs: number; idx: number }): number {
  return p.processor === "ultra"
    ? p.createdMs + ULTRA_DELAY_MS
    : p.createdMs + CORE_DELAY_MS + (Math.max(p.idx, 0) % 8) * CORE_STAGGER_MS;
}

function runOf(runId: string, now = Date.now()): TaskRun {
  const p = parseId(runId);
  if (!p) return { run_id: runId, status: "failed", is_active: false, error: { message: "Unknown mock run" } };
  const done = now >= readyAt(p);
  return {
    run_id: runId,
    status: done ? "completed" : "running",
    is_active: !done,
    processor: p.processor,
    created_at: new Date(p.createdMs).toISOString(),
    modified_at: new Date(done ? readyAt(p) : p.createdMs).toISOString(),
    error: null,
  };
}

export async function createTaskRun(processor: string): Promise<TaskRun> {
  return runOf(newId(processor, -1));
}

// Group membership lives in memory; an unknown group (after a restart) reads as finished,
// and the per-run polling still finds every result.
const groups = new Map<string, string[]>();

export async function createTaskGroup(): Promise<string> {
  const id = `mock_tgrp_${Date.now()}_${randomBytes(4).toString("hex")}`;
  groups.set(id, []);
  return id;
}

export async function addGroupRuns(groupId: string, inputs: RunInput[]): Promise<string[]> {
  const runs = await spikeRuns();
  const ids = inputs.map((x) => {
    const name = norm(String(x.input.entity_name ?? ""));
    const idx = runs.findIndex((r) => norm(r.name) === name);
    return newId(x.processor, idx);
  });
  groups.set(groupId, [...(groups.get(groupId) ?? []), ...ids]);
  return ids;
}

export async function getTaskGroup(groupId: string): Promise<TaskGroupStatus> {
  const ids = groups.get(groupId) ?? [];
  const runs = ids.map((id) => runOf(id));
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  return {
    taskgroup_id: groupId,
    status: {
      is_active: runs.some((r) => r.is_active),
      task_run_status_counts: { completed, failed, running: runs.length - completed - failed },
      num_task_runs: runs.length,
    },
  };
}

export async function getTaskRun(runId: string): Promise<TaskRun> {
  return runOf(runId);
}

export async function getTaskRunResult(runId: string): Promise<TaskRunResult> {
  const run = runOf(runId);
  const p = parseId(runId);
  if (!p || run.is_active) throw new Error(`Mock run ${runId} isn't finished`);
  const runs = await spikeRuns();
  if (p.processor === "ultra") return discoverResult(run, runs);
  const spike = runs[p.idx];
  // An entity the spike never enriched comes back empty: it stays Unverified.
  if (!spike) return { run, output: { type: "json", content: {}, basis: [] } };
  return { run, output: { type: "json", content: spike.result.output.content, basis: spike.result.output.basis } };
}

/** The discover step's shape (src/lib/research/discover.ts), built from the 38 spike entities. */
function discoverResult(run: TaskRun, runs: SpikeEnrichRun[]): TaskRunResult {
  const basis: BasisEntry[] = [];
  const entities = runs.map((r, i) => {
    const c = r.result.output.content as Record<string, unknown>;
    const url = typeof c.official_url === "string" ? c.official_url : null;
    const role = r.result.output.basis.find((b) => b.field === "role");
    if (role) basis.push({ ...role, field: `entities.${i}` });
    return {
      name: r.name,
      name_zh: typeof c.name_local === "string" ? c.name_local : null,
      category: KIND_TO_CATEGORY[r.kind] ?? "ind",
      why_relevant: typeof c.role === "string" ? c.role : "",
      url,
      is_person: false,
      country: "TW",
    };
  });
  return { run, output: { type: "json", content: { entities }, basis } };
}
