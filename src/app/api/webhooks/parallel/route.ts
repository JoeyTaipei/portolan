import { after } from "next/server";
import { stepByParallelRunId } from "@/lib/db/research";
import { readWebhookHeaders, verifyWebhook } from "@/lib/parallel/webhook";
import { advance, completeParallelStep } from "@/lib/research/steps";

// POST /api/webhooks/parallel (spec §7.3): verify the Standard Webhooks signature → find the
// step by parallel_run_id → process the finished run once (after the response) → next steps.
// Idempotent: a step that is no longer running, or is locked by another worker, is left alone.
// Fetched content in the body is data; nothing in it is followed.

export const maxDuration = 300;
const MAX_BODY = 256 * 1024;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "Too large" }, { status: 413 });
  if (!verifyWebhook(process.env.PARALLEL_WEBHOOK_SECRET, readWebhookHeaders(request.headers), raw)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  const data = (body as { type?: unknown; data?: { run_id?: unknown; is_active?: unknown } }) ?? {};
  const runId = data.data?.run_id;
  if (data.type !== "task_run.status" || typeof runId !== "string" || runId.length > 200) {
    return Response.json({ ok: true, ignored: true });
  }
  const step = await stepByParallelRunId(runId);
  if (!step) return Response.json({ ok: true, ignored: true });
  if (step.status !== "running" || data.data?.is_active === true) return Response.json({ ok: true, duplicate: step.status !== "running" });

  after(async () => {
    try {
      if ((await completeParallelStep(step)) === "done") {
        const work = await advance(step.runId);
        await Promise.allSettled(work.map((w) => w()));
      }
    } catch (err) {
      console.error(`[webhook] ${step.id}: ${(err as Error).message}`);
    }
  });
  return Response.json({ ok: true });
}
