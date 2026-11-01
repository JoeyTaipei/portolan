// Manual-service ops (spec §11.4): the team runs these on its own machine; there is no web back
// office. Run with `npm run ops -- <command> …`. Reads SUPABASE_URL and SUPABASE_SECRET_KEY
// from .env.local and never prints them. Every action writes one ops_log row.
//
// One file on purpose: Node runs it directly (type stripping), and the project's tsconfig
// doesn't allow the ".ts" import paths that splitting it would need.
//
//   doc:start <docId>                                      requested → in_progress (risk deck, watch list)
//   doc:approve <docId> --reviewer "Name" --kind founder|expert --checked 2026-11-05
//   doc:changes <docId> --note "…"                          in_review → changes_needed
//   doc:upload <dossierId> --type risk_deck|watch_list --file x.pdf --pages 4 [--next 2026-12-01] [--title "…"]
//   intro:update <introId> --status in_progress|introduced|not_possible [--note "…"]
//   outbox:list                                            dossier links waiting to be emailed
//   dossier:delete <dossierId>                             cascades everything; playbook rows stay
//
// Add --actor "Name" to any command (default: this computer's user name).

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

type Args = { _: string[]; [flag: string]: string | string[] };

function parse(argv: string[]): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      out[a.slice(2)] = next && !next.startsWith("--") ? (i++, next) : "true";
    } else out._.push(a);
  }
  return out;
}

function flag(args: Args, name: string, required = true): string {
  const v = args[name];
  if (typeof v === "string" && v !== "true") return v;
  if (required) fail(`Missing --${name}`);
  return "";
}

function fail(message: string): never {
  console.error(`ops: ${message}`);
  process.exit(1);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOSSIER = /^[A-Za-z0-9_-]{22}$/;

function db() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // already in the environment
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) fail("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Db = ReturnType<typeof db>;

async function log(c: Db, action: string, targetId: string, actor: string, note: string | null) {
  const r = await c.from("ops_log").insert({ action, target_id: targetId, actor, note });
  if (r.error) fail(`Done, but the ops_log row failed: ${r.error.message}`);
}

async function getDoc(c: Db, id: string) {
  if (!UUID.test(id)) fail("Document ids are UUIDs");
  const r = await c.from("documents").select("id, dossier_id, type, status, title").eq("id", id).maybeSingle();
  if (r.error) fail(r.error.message);
  if (!r.data) fail(`No document ${id}`);
  return r.data as { id: string; dossier_id: string; type: string; status: string; title: string };
}

async function setDoc(c: Db, id: string, fields: Record<string, unknown>) {
  const r = await c.from("documents").update(fields).eq("id", id);
  if (r.error) fail(r.error.message);
}

const commands: Record<string, (c: Db, args: Args, actor: string) => Promise<void>> = {
  async "doc:start"(c, args, actor) {
    const doc = await getDoc(c, args._[1]);
    if (doc.status !== "requested") fail(`"${doc.title}" is ${doc.status}, not requested`);
    await setDoc(c, doc.id, { status: "in_progress" });
    await log(c, "doc:start", doc.id, actor, null);
    console.log(`Started "${doc.title}".`);
  },

  async "doc:approve"(c, args, actor) {
    const doc = await getDoc(c, args._[1]);
    const reviewer = flag(args, "reviewer");
    const kind = flag(args, "kind");
    const checked = flag(args, "checked");
    if (kind !== "founder" && kind !== "expert") fail("--kind is founder or expert");
    if (!DAY.test(checked)) fail("--checked is a date like 2026-11-05");
    if (!["draft_ready", "in_review", "changes_needed"].includes(doc.status)) fail(`"${doc.title}" is ${doc.status}; only drafts and reviews can be approved`);
    await setDoc(c, doc.id, { status: "approved", reviewer_name: reviewer, reviewer_kind: kind, facts_checked_at: checked });
    await log(c, "doc:approve", doc.id, actor, `${kind}: ${reviewer}, checked ${checked}`);
    console.log(`Approved "${doc.title}" (${kind === "expert" ? "Expert approved" : `Reviewed by ${reviewer}`}).`);
  },

  async "doc:changes"(c, args, actor) {
    const doc = await getDoc(c, args._[1]);
    const note = flag(args, "note");
    if (doc.status !== "in_review") fail(`"${doc.title}" is ${doc.status}, not in review`);
    await setDoc(c, doc.id, { status: "changes_needed", changes_note: note });
    await log(c, "doc:changes", doc.id, actor, note);
    console.log(`Marked "${doc.title}" as needing changes.`);
  },

  async "doc:upload"(c, args, actor) {
    const dossierId = args._[1];
    if (!DOSSIER.test(dossierId ?? "")) fail("Give the dossier id (22 characters)");
    const type = flag(args, "type");
    if (type !== "risk_deck" && type !== "watch_list") fail("--type is risk_deck or watch_list");
    const file = flag(args, "file");
    const pages = Number(flag(args, "pages"));
    if (!Number.isInteger(pages) || pages < 1 || pages > 40) fail("--pages is a whole number");
    const next = flag(args, "next", false) || null;
    if (next && !DAY.test(next)) fail("--next is a date like 2026-12-01");
    const bytes = readFileSync(file);
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") fail(`${basename(file)} isn't a PDF`);

    const dossier = await c.from("dossiers").select("id").eq("id", dossierId).maybeSingle();
    if (dossier.error) fail(dossier.error.message);
    if (!dossier.data) fail(`No dossier ${dossierId}`);

    // Private bucket; the app streams it after checking the dossier id. Never a public URL.
    const path = `${dossierId}/${randomUUID()}.pdf`;
    const up = await c.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (up.error) fail(`Upload failed: ${up.error.message}`);

    // A risk deck fills the oldest open request; each watch-list update is a new document (old ones kept).
    const open =
      type === "risk_deck"
        ? await c.from("documents").select("id").eq("dossier_id", dossierId).eq("type", type).in("status", ["requested", "in_progress"]).order("created_at").limit(1).maybeSingle()
        : { data: null, error: null };
    if (open.error) fail(open.error.message);
    const title = flag(args, "title", false) || (type === "risk_deck" ? "Taiwan market and policy risk" : "90–180 day watch");
    const fields = { status: "ready", storage_path: path, pages, next_update_at: next, title };
    let id: string;
    if (open.data) {
      id = open.data.id as string;
      await setDoc(c, id, fields);
    } else {
      const ins = await c.from("documents").insert({ dossier_id: dossierId, type, ...fields }).select("id").single();
      if (ins.error) fail(ins.error.message);
      id = ins.data.id as string;
    }
    await log(c, "doc:upload", id, actor, `${type}, ${pages} pages${next ? `, next ${next}` : ""}`);
    console.log(`Uploaded ${basename(file)} as "${title}" (${id}).`);
  },

  async "intro:update"(c, args, actor) {
    const id = args._[1];
    if (!UUID.test(id ?? "")) fail("Intro ids are UUIDs");
    const status = flag(args, "status");
    if (!["in_progress", "introduced", "not_possible"].includes(status)) fail("--status is in_progress, introduced or not_possible");
    const note = flag(args, "note", false) || null;
    const intro = await c.from("intro_requests").select("id, dossier_id, stakeholder_id").eq("id", id).maybeSingle();
    if (intro.error) fail(intro.error.message);
    if (!intro.data) fail(`No intro request ${id}`);
    const up = await c.from("intro_requests").update({ status, result_note: note }).eq("id", id);
    if (up.error) fail(up.error.message);
    if (status === "introduced") {
      // The matching tracker item moves to Contacted with the next step (spec §11.4).
      const nextStep = note ?? "Follow up on the Portolan introduction";
      const item = await c.from("tracker_items").select("id, stage").eq("dossier_id", intro.data.dossier_id).eq("stakeholder_id", intro.data.stakeholder_id).maybeSingle();
      if (item.error) fail(item.error.message);
      const r = item.data
        ? await c
            .from("tracker_items")
            .update({ stage: item.data.stage === "found" ? "contacted" : item.data.stage, next_step: nextStep })
            .eq("id", item.data.id)
        : await c.from("tracker_items").insert({ dossier_id: intro.data.dossier_id, stakeholder_id: intro.data.stakeholder_id, stage: "contacted", next_step: nextStep, origin: "intro" });
      if (r.error) fail(r.error.message);
    }
    await log(c, "intro:update", id, actor, `${status}${note ? `: ${note}` : ""}`);
    console.log(`Intro ${id} is now ${status}.`);
  },

  async "outbox:list"(c, _args, actor) {
    const r = await c.from("email_outbox").select("id, dossier_id, to_email, kind, created_at").eq("status", "pending").order("created_at");
    if (r.error) fail(r.error.message);
    for (const x of r.data ?? []) console.log(`${x.created_at}  ${x.kind}  ${x.to_email}  /d/${x.dossier_id}`);
    if (!r.data?.length) console.log("Nothing waiting.");
    await log(c, "outbox:list", "email_outbox", actor, `${r.data?.length ?? 0} pending`);
  },

  async "dossier:delete"(c, args, actor) {
    const id = args._[1];
    if (!DOSSIER.test(id ?? "")) fail("Give the dossier id (22 characters)");
    const files = await c.storage.from("documents").list(id);
    if (files.error) fail(files.error.message);
    if (files.data.length) {
      const rm = await c.storage.from("documents").remove(files.data.map((f) => `${id}/${f.name}`));
      if (rm.error) fail(`Removing files failed: ${rm.error.message}`);
    }
    const r = await c.from("dossiers").delete().eq("id", id).select("id");
    if (r.error) fail(r.error.message);
    if (!r.data?.length) fail(`No dossier ${id}`);
    await log(c, "dossier:delete", id, actor, `${files.data.length} file(s) removed`);
    console.log(`Deleted dossier ${id} and everything in it.`);
  },
};

async function main() {
  const args = parse(process.argv.slice(2));
  const name = args._[0];
  const run = name ? commands[name] : undefined;
  if (!run) fail(`Commands: ${Object.keys(commands).join(", ")}`);
  const actor = flag(args, "actor", false) || userInfo().username;
  await run(db(), args, actor);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
