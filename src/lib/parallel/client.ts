import "server-only";
import * as mock from "./mock";
import type { RunInput, TaskGroupStatus, TaskRun, TaskRunResult, TaskSpec } from "./types";

// Parallel Task API over plain fetch (plan P-4). Paid calls (creating runs) happen only when
// RESEARCH_MODE is exactly "live"; anything else replays the spike output from ./mock.
// The key is read here and nowhere else in the app, and never logged.

const BASE = "https://api.parallel.ai";
const RETRIES = 2;
/** Parallel accepts up to 1000 runs per add-runs request. */
export const MAX_RUNS_PER_POST = 1000;

/** The only switch to paid research. */
export function isLive(): boolean {
  return process.env.RESEARCH_MODE === "live";
}

export class ParallelError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ParallelError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.PARALLEL_API_KEY;
  if (!key) throw new ParallelError("Parallel isn't configured on this server.", null);
  let last: unknown = null;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(800 * 2 ** (attempt - 1) + Math.random() * 200);
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: { "x-api-key": key, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      const text = await res.text();
      if (res.ok) return (text ? JSON.parse(text) : null) as T;
      last = new ParallelError(`Parallel ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`, res.status);
      // Only rate limits and server errors are worth retrying.
      if (res.status !== 429 && res.status < 500) throw last;
    } catch (err) {
      if (err instanceof ParallelError && err.status !== null && err.status !== 429 && err.status < 500) throw err;
      last = err;
    }
  }
  throw last instanceof Error ? last : new ParallelError(String(last), null);
}

/** Webhook target for Parallel; omitted when the app isn't on a public https URL. */
export function webhookUrl(): string | null {
  const base = process.env.APP_BASE_URL ?? "";
  if (!base.startsWith("https://")) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/parallel`;
}

function webhook() {
  const url = webhookUrl();
  return url ? { webhook: { url, event_types: ["task_run.status"] } } : {};
}

/** Paid. One Task run (the discover step uses `ultra`). */
export async function createTaskRun(args: {
  processor: RunInput["processor"];
  input: Record<string, unknown>;
  taskSpec: TaskSpec;
  metadata?: Record<string, string>;
}): Promise<TaskRun> {
  if (!isLive()) return mock.createTaskRun(args.processor);
  return call<TaskRun>("POST", "/v1/tasks/runs", {
    processor: args.processor,
    input: args.input,
    task_spec: args.taskSpec,
    metadata: args.metadata,
    ...webhook(),
  });
}

/** Free. An empty Task Group. */
export async function createTaskGroup(): Promise<string> {
  if (!isLive()) return mock.createTaskGroup();
  const g = await call<{ taskgroup_id: string }>("POST", "/v1/tasks/groups", {});
  return g.taskgroup_id;
}

/**
 * Paid. Adds runs to a group, at most 1000 per request. Each input also carries the webhook
 * (Parallel's docs don't confirm group runs send it, plan P-5; polling stays the guarantee).
 * Returns run ids in input order.
 */
export async function addGroupRuns(groupId: string, inputs: RunInput[], defaultTaskSpec: TaskSpec): Promise<string[]> {
  if (!isLive()) return mock.addGroupRuns(groupId, inputs);
  const ids: string[] = [];
  for (let i = 0; i < inputs.length; i += MAX_RUNS_PER_POST) {
    const chunk = inputs.slice(i, i + MAX_RUNS_PER_POST).map((x) => ({ ...x, ...webhook() }));
    const res = await call<{ run_ids: string[] }>("POST", `/v1/tasks/groups/${encodeURIComponent(groupId)}/runs`, {
      default_task_spec: defaultTaskSpec,
      inputs: chunk,
      refresh_status: false,
    });
    ids.push(...res.run_ids);
  }
  return ids;
}

/** Free. Group summary: is it still active, and how many runs are in each status. */
export async function getTaskGroup(groupId: string): Promise<TaskGroupStatus> {
  if (!isLive()) return mock.getTaskGroup(groupId);
  return call<TaskGroupStatus>("GET", `/v1/tasks/groups/${encodeURIComponent(groupId)}`);
}

/** Free. One run's status. */
export async function getTaskRun(runId: string): Promise<TaskRun> {
  if (!isLive()) return mock.getTaskRun(runId);
  return call<TaskRun>("GET", `/v1/tasks/runs/${encodeURIComponent(runId)}`);
}

/** Free. A finished run's output and Basis. */
export async function getTaskRunResult(runId: string): Promise<TaskRunResult> {
  if (!isLive()) return mock.getTaskRunResult(runId);
  return call<TaskRunResult>("GET", `/v1/tasks/runs/${encodeURIComponent(runId)}/result`);
}
