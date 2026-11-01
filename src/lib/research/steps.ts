import "server-only";
import { writeLeads } from "@/lib/claude/leads";
import { rateEntity } from "@/lib/claude/rate";
import {
  claimSteps,
  getDossierBasics,
  getRun,
  insertSteps,
  insertStepsOnce,
  ledgerStore,
  listAliases,
  listSteps,
  lockStep,
  requeueStale,
  setStepsStatus,
  updateDossier,
  updateRun,
  updateStep,
} from "@/lib/db/research";
import {
  insertEdges,
  insertEvents,
  insertLeads,
  insertSources,
  insertStakeholders,
  listStakeholders,
  setStakeholdersStatus,
  sourceIndex,
  sourcesByLabel,
  updateStakeholder,
  writeRating,
  type StakeholderLite,
} from "@/lib/db/write";
import { affordableRuns, reserve } from "@/lib/limits/ledger";
import { PARALLEL_PER_RUN } from "@/lib/limits/prices";
import { addGroupRuns, createTaskGroup, createTaskRun, getTaskGroup, getTaskRun, getTaskRunResult, isLive } from "@/lib/parallel/client";
import type { TaskRunResult } from "@/lib/parallel/types";
import type { Json, ResearchRun, ResearchStep, TimedEventKind } from "@/lib/types";
import { DISCOVER_SPEC, ENRICH_SPEC, discoverInput, enrichInput, parseDiscover } from "./discover";
import { filterEntities, normaliseName } from "./filter";
import { nameVariants } from "./quality";
import { basisToSources } from "./sources";

// The research state machine (spec §7.2–7.3; simpler version, plan P-16):
//   discover (Parallel ultra) → filter (code) → enrich (Parallel core, one Task Group)
//   → sources (code) → rate + check (Sonnet + code, per entity) → score (code, on every read)
//   → leads (Sonnet). The brief is S4.
// Nothing waits: Parallel results arrive by webhook or are found by polling in `advance`
// (called from the progress endpoint every 3 s); Claude steps are claimed and run in after().
// At 20 minutes everything unfinished stops: entities still being researched become
// `incomplete`, and the run ends `partial`.

export const DEADLINE_MS = 20 * 60_000;
/** A Parallel run with no webhook for this long is checked directly (spec §7.3). */
const WEBHOOK_GRACE_MS = 2 * 60_000;
/** A Claude step whose worker hasn't finished in this long is put back in the queue. */
const CLAUDE_STALE_MS = 5 * 60_000;
/** A processing lock older than this is taken over. */
const LOCK_STALE_MS = 3 * 60_000;
/** At most this many queued Claude steps start per progress request (spec §7.3). */
export const MAX_CLAIM = 8;

const day = (d: Date) => d.toISOString().slice(0, 10);
type Work = () => Promise<void>;

function log(runId: string, msg: string) {
  console.info(`[research ${runId}] ${msg}`);
}

// ─── Parallel steps (discover, enrich) ───────────────────────────────────────

/**
 * Process a finished Parallel run for one step, exactly once: the webhook and the poll both call
 * this; the step lock lets one of them through. Returns what happened.
 */
export async function completeParallelStep(step: ResearchStep, now = new Date()): Promise<"done" | "running" | "busy" | "failed"> {
  if (step.status !== "running" || !step.parallelRunId) return "busy";
  if (!(await lockStep(step.id, now, LOCK_STALE_MS))) return "busy";
  try {
    const run = await getTaskRun(step.parallelRunId);
    if (run.is_active) {
      await updateStep(step.id, { locked_at: null });
      return "running";
    }
    const r = await getRun(step.runId);
    if (!r) return "busy";
    if (run.status !== "completed") {
      await updateStep(step.id, { status: "failed", result: { error: run.error?.message ?? run.status } });
      if (step.kind === "discover") await failRun(r, "Research didn't finish.");
      else if (step.entityKey) await updateStakeholder(step.entityKey, { status: "incomplete" });
      return "failed";
    }
    const result = await getTaskRunResult(step.parallelRunId);
    if (step.kind === "discover") await afterDiscover(r, step, result, now);
    else await afterEnrich(r, step, result, now);
    return "done";
  } catch (err) {
    log(step.runId, `step ${step.kind} ${step.id} failed to process: ${(err as Error).message}`);
    await updateStep(step.id, { locked_at: null }).catch(() => {});
    return "busy";
  }
}

async function startDiscover(run: ResearchRun, step: ResearchStep) {
  const d = await getDossierBasics(run.dossierId);
  if (!d) return;
  const r = await reserve(ledgerStore, {
    runId: run.id,
    dossierId: run.dossierId,
    provider: "parallel",
    purpose: "discover",
    estimatedUsd: PARALLEL_PER_RUN.ultra,
    model: "ultra",
  });
  if (!r.ok) {
    await updateStep(step.id, { status: "failed", result: { error: r.reason } });
    await failRun(run, r.reason);
    return;
  }
  try {
    const t = await createTaskRun({ processor: "ultra", input: discoverInput(d), taskSpec: DISCOVER_SPEC, metadata: { run: run.id } });
    await updateStep(step.id, { parallel_run_id: t.run_id, locked_at: null });
  } catch (err) {
    await updateStep(step.id, { status: "failed", result: { error: (err as Error).message.slice(0, 300) } });
    await failRun(run, "Research didn't finish.");
  }
}

async function afterDiscover(run: ResearchRun, step: ResearchStep, result: TaskRunResult, now: Date) {
  const d = await getDossierBasics(run.dossierId);
  if (!d) return;
  const found = parseDiscover(result.output.content);
  const { kept, dropped } = filterEntities(found, await listAliases(run.dossierId));
  const ids = await insertStakeholders(run.dossierId, run.id, kept);

  // Parallel cap (spec §8): no new core runs past US$2; the rest are marked incomplete.
  const room = await affordableRuns(ledgerStore, run.id, "parallel", "enrich", PARALLEL_PER_RUN.core);
  const toEnrich = kept.filter((e) => ids.has(e.key)).slice(0, room);
  for (const e of kept.slice(toEnrich.length)) {
    const id = ids.get(e.key);
    if (id) await updateStakeholder(id, { status: "incomplete" });
  }

  let taskgroupId: string | null = null;
  if (toEnrich.length) {
    const r = await reserve(ledgerStore, {
      runId: run.id,
      dossierId: run.dossierId,
      provider: "parallel",
      purpose: "enrich",
      estimatedUsd: PARALLEL_PER_RUN.core * toEnrich.length,
      model: "core",
    });
    if (r.ok) {
      taskgroupId = await createTaskGroup();
      const runIds = await addGroupRuns(
        taskgroupId,
        toEnrich.map((e) => ({ input: enrichInput(e, d), processor: "core", metadata: { stakeholder: ids.get(e.key)! } })),
        ENRICH_SPEC,
      );
      await insertSteps(
        run.id,
        toEnrich.map((e, i) => ({ kind: "enrich", entityKey: ids.get(e.key)!, parallelRunId: runIds[i], status: "running" })),
      );
    }
  }
  await updateStep(step.id, {
    status: "done",
    locked_at: null,
    result: { taskgroupId, found: found.length, kept: kept.length, enriched: toEnrich.length, dropped: dropped as unknown as Json, at: now.toISOString() },
  });
  log(run.id, `discover: ${found.length} found, ${kept.length} kept, ${toEnrich.length} sent to enrich`);
}

const asText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const fieldIds = (byField: Map<string, string[]>, prefix: string) =>
  [...byField].filter(([f]) => f === prefix || f.startsWith(`${prefix}.`)).flatMap(([, v]) => v);

async function afterEnrich(run: ResearchRun, step: ResearchStep, result: TaskRunResult, now: Date) {
  const stakeholders = await listStakeholders(run.dossierId);
  const me = stakeholders.find((s) => s.id === step.entityKey);
  if (!me) return;
  const content = result.output.content ?? {};
  const nameZh = me.nameZh ?? asText(content.name_local);
  const verifiedAt = (result.run.modified_at ?? now.toISOString()).slice(0, 10);

  const { known, nextLabel } = await sourceIndex(run.dossierId);
  const out = basisToSources({
    basis: result.output.basis ?? [],
    entity: { name: me.name, nameZh },
    officialUrl: asText(content.official_url),
    verifiedAt,
    known,
    nextLabel,
  });
  await insertSources(run.dossierId, run.id, out.drafts);
  const accepted = await sourcesByLabel(run.dossierId, out.accepted);
  const idOf = new Map(accepted.map((s) => [s.label, s.id]));
  const toIds = (labels: string[]) => [...new Set(labels.map((l) => idOf.get(l)).filter((x): x is string => !!x))];

  // Ties → sourced edges to stakeholders on this map.
  const ties = Array.isArray(content.ties) ? (content.ties as { entity?: unknown; relation?: unknown }[]) : [];
  const edges = ties.flatMap((t, i) => {
    const other = matchStakeholder(asText(t.entity), stakeholders, me.id);
    const ids = toIds([...fieldIds(out.byField, `ties.${i}`), ...(out.byField.get("ties") ?? [])]);
    return other && ids.length ? [{ aId: me.id, bId: other.id, relation: asText(t.relation) ?? "Tie", sourceIds: ids }] : [];
  });
  await insertEdges(run.dossierId, edges);

  // Dated upcoming events with a source.
  const today = day(now);
  const evs = Array.isArray(content.events) ? (content.events as { title?: unknown; kind?: unknown; date?: unknown }[]) : [];
  const KINDS: TimedEventKind[] = ["budget_vote", "tender_close", "committee_review", "event"];
  const events = evs.flatMap((e, i) => {
    const date = asText(e.date);
    const title = asText(e.title);
    const kind = KINDS.includes(e.kind as TimedEventKind) ? (e.kind as TimedEventKind) : "event";
    const ids = toIds([...fieldIds(out.byField, `events.${i}`), ...(out.byField.get("events") ?? [])]);
    return title && date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && ids.length
      ? [{ title, kind, date, stakeholderIds: [me.id], sourceIds: ids, relevantToGoal: kind !== "event" }]
      : [];
  });
  await insertEvents(run.dossierId, events);

  await updateStakeholder(me.id, { name_zh: nameZh, city: asText(content.city) });
  await updateStep(step.id, {
    status: "done",
    locked_at: null,
    result: { labels: out.accepted, accepted: out.accepted.length, rejected: out.drafts.filter((x) => !x.accepted).length },
  });
  await insertStepsOnce(run.id, [{ kind: "rate", entityKey: me.id, parallelRunId: `rate:${me.id}` }]);
}

function matchStakeholder(name: string | null, all: StakeholderLite[], notId: string): StakeholderLite | null {
  if (!name) return null;
  const n = normaliseName(name);
  return (
    all.find((s) => s.id !== notId && (normaliseName(s.name) === n || (s.nameZh && normaliseName(s.nameZh) === n))) ??
    all.find((s) => s.id !== notId && nameVariants({ name: s.name, nameZh: s.nameZh }).includes(n)) ??
    null
  );
}

// ─── Claude steps (rate, leads) ──────────────────────────────────────────────

async function labelsFor(runId: string, stakeholderId: string, steps?: ResearchStep[]): Promise<string[]> {
  const enrich = (steps ?? (await listSteps(runId))).find((s) => s.kind === "enrich" && s.entityKey === stakeholderId);
  const labels = (enrich?.result as { labels?: unknown } | null)?.labels;
  return Array.isArray(labels) ? labels.filter((x): x is string => typeof x === "string") : [];
}

async function runRate(run: ResearchRun, step: ResearchStep, now: Date) {
  const d = await getDossierBasics(run.dossierId);
  const me = (await listStakeholders(run.dossierId)).find((s) => s.id === step.entityKey);
  if (!d || !me) {
    await updateStep(step.id, { status: "skipped" });
    return;
  }
  const sources = (await sourcesByLabel(run.dossierId, await labelsFor(run.id, me.id))).filter((s) => s.accepted);
  const res = await rateEntity({
    entity: { key: me.id, name: me.name, nameZh: me.nameZh, category: me.category, whyRelevant: me.role ?? "", isChina: me.isChina },
    client: d,
    sources,
    runId: run.id,
    ledger: { store: ledgerStore, runId: run.id, dossierId: run.dossierId, purpose: "rate" },
    today: day(now),
  });
  await writeRating(me.id, run.id, res);
  await updateStep(step.id, { status: "done", result: { log: res.log.slice(0, 20), model: res.model } });
}

async function runLeads(run: ResearchRun, step: ResearchStep, now: Date) {
  const d = await getDossierBasics(run.dossierId);
  if (!d) return;
  const all = await listStakeholders(run.dossierId);
  const steps = await listSteps(run.id);
  const candidates = all.filter((s) => (s.category === "cap" || s.category === "leg" || s.category === "evt") && s.status === "active");
  const entities = [];
  for (const s of candidates) {
    const sources = (await sourcesByLabel(run.dossierId, await labelsFor(run.id, s.id, steps))).filter((x) => x.accepted);
    entities.push({ stakeholderId: s.id, name: s.name, nameZh: s.nameZh, category: s.category, sources });
  }
  const { leads, log: notes } = await writeLeads({
    entities,
    mapNames: all.filter((s) => s.status === "active").map((s) => s.name),
    client: d,
    runId: run.id,
    ledger: { store: ledgerStore, runId: run.id, dossierId: run.dossierId, purpose: "leads" },
    today: day(now),
  });
  await insertLeads(run.dossierId, leads);
  await updateStep(step.id, { status: "done", result: { leads: leads.length, log: notes.slice(0, 20) } });
}

/** Run one claimed step (inside after()). Errors put it back in the queue via the stale check. */
export async function runStep(step: ResearchStep, now = new Date()): Promise<void> {
  const run = await getRun(step.runId);
  if (!run) return;
  try {
    if (step.kind === "discover") await startDiscover(run, step);
    else if (step.kind === "rate") await runRate(run, step, now);
    else if (step.kind === "leads") await runLeads(run, step, now);
    else await updateStep(step.id, { status: "skipped" });
  } catch (err) {
    log(run.id, `step ${step.kind} ${step.id} error: ${(err as Error).message}`);
  }
}

// ─── Run lifecycle ───────────────────────────────────────────────────────────

async function failRun(run: ResearchRun, error: string) {
  await updateRun(run.id, { status: "failed", finished_at: new Date().toISOString(), error });
  await updateDossier(run.dossierId, { status: "failed" });
  log(run.id, `failed: ${error}`);
}

async function finishRun(run: ResearchRun, now: Date) {
  await setStakeholdersStatus(run.dossierId, "still_researching", "incomplete");
  const partial = (await listStakeholders(run.dossierId)).some((s) => s.status === "incomplete");
  await updateRun(run.id, { status: partial ? "partial" : "done", finished_at: now.toISOString() });
  await updateDossier(run.dossierId, { status: partial ? "partial" : "ready", refreshed_at: now.toISOString() });
  log(run.id, `finished (${partial ? "partial" : "done"})`);
}

/** At 20 minutes: stop Parallel waits and queued ratings; what's done is used (simpler version). */
async function stopAtDeadline(run: ResearchRun, steps: ResearchStep[]) {
  const discover = steps.find((s) => s.kind === "discover");
  if (!discover || discover.status !== "done") {
    if (discover) await updateStep(discover.id, { status: "failed", result: { error: "Over the time limit" } });
    await failRun(run, "Research didn't finish in time.");
    return;
  }
  await setStepsStatus(run.id, ["enrich"], ["queued", "running"], "skipped");
  await setStepsStatus(run.id, ["rate"], ["queued"], "skipped");
  await setStakeholdersStatus(run.dossierId, "still_researching", "incomplete");
}

const shuffle = <T>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/**
 * Move a run forward. Called by the progress endpoint; returns work for after(): finished
 * Parallel runs to process and claimed Claude steps to run. Safe to call concurrently.
 */
export async function advance(runId: string, now = new Date()): Promise<Work[]> {
  const run = await getRun(runId);
  if (!run || run.status !== "running") return [];
  let steps = await listSteps(run.id);
  if (run.deadlineAt && now.getTime() > Date.parse(run.deadlineAt)) {
    const pastStop = steps.some((s) => s.kind === "leads");
    if (!pastStop) {
      await stopAtDeadline(run, steps);
      const again = await getRun(run.id);
      if (!again || again.status !== "running") return [];
      steps = await listSteps(run.id);
    }
  }
  await requeueStale(run.id, ["discover", "rate", "leads"], new Date(now.getTime() - CLAUDE_STALE_MS));

  const work: Work[] = [];
  const discover = steps.find((s) => s.kind === "discover");
  if (discover?.status === "running" && discover.parallelRunId) {
    const waited = now.getTime() - Date.parse(discover.createdAt);
    if (!isLive() || waited > WEBHOOK_GRACE_MS) work.push(async () => void (await completeParallelStep(discover, now)));
  }

  const enrichRunning = steps.filter((s) => s.kind === "enrich" && s.status === "running");
  if (enrichRunning.length && discover?.status === "done") {
    const groupId = (discover.result as { taskgroupId?: string } | null)?.taskgroupId;
    const doneCount = steps.filter((s) => s.kind === "enrich" && s.status !== "running").length;
    let check = enrichRunning;
    if (groupId && isLive()) {
      const g = await getTaskGroup(groupId);
      const c = g.status.task_run_status_counts ?? {};
      const finished = (c.completed ?? 0) + (c.failed ?? 0) + (c.cancelled ?? 0);
      check = finished > doneCount || !g.status.is_active ? shuffle(enrichRunning).slice(0, 10) : [];
    }
    // One after another: each writes sources with the next S-labels for this dossier.
    if (check.length) work.push(async () => {
      for (const s of check) await completeParallelStep(s, now);
    });
  }

  // Everything enriched and rated → leads, once.
  const pending = (k: string) => steps.some((s) => s.kind === k && (s.status === "queued" || s.status === "running"));
  const leads = steps.find((s) => s.kind === "leads");
  if (discover?.status === "done" && !pending("enrich") && !pending("rate") && !leads) {
    await insertStepsOnce(run.id, [{ kind: "leads", parallelRunId: `leads:${run.id}` }]);
  }
  if (leads && (leads.status === "done" || leads.status === "failed" || leads.status === "skipped")) {
    await finishRun(run, now);
    return work;
  }

  const claimed = await claimSteps(run.id, MAX_CLAIM);
  for (const s of claimed) work.push(() => runStep(s, now));
  return work;
}
