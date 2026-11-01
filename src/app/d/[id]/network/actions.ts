"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PURPOSE_MAX } from "@/components/network/model";
import { requestIntro as insertIntro, saveLead as insertLead } from "@/lib/db/network";
import { isDossierId, SAMPLE_DOSSIER_ID } from "@/lib/ids";
import type { ActionResult, IntroRequest, TrackerItem } from "@/lib/types";

// Network writes for real dossiers (spec §15): zod → dossier id check → work → ActionResult.
// The sample never reaches these: its changes stay in the browser (SHELL-3).

const SAMPLE = "Changes to the sample stay in this browser.";
const FAILED = "That didn't save. Your data is safe, so please try again.";

const id = z.string().min(1).max(64);

function checkDossier(dossierId: unknown): string | null {
  const parsed = z.string().safeParse(dossierId);
  return parsed.success && isDossierId(parsed.data) ? parsed.data : null;
}

async function run<T>(what: string, work: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await work();
  } catch (e) {
    console.error(`[network] ${what}:`, e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

/** NET-4: "Save lead" / "Add to plan" → a tracker item in Found. */
export async function saveLead(dossierId: string, leadId: string): Promise<ActionResult<TrackerItem>> {
  if (dossierId === SAMPLE_DOSSIER_ID) return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const lid = id.safeParse(leadId);
  if (!did || !lid.success) return { ok: false, error: "That lead couldn't be saved. Reload the page and try again." };
  return run("save lead", async () => {
    const item = await insertLead(did, lid.data);
    if (!item) return { ok: false, error: "That lead isn't in this dossier." };
    refresh();
    return { ok: true, data: item };
  });
}

const IntroInput = z.object({ stakeholderId: id, purpose: z.string().trim().min(1).max(PURPOSE_MAX) });

/** NET-6: a Portolan intro request; the team updates it with the ops script (spec §11.4). */
export async function requestIntro(dossierId: string, input: z.input<typeof IntroInput>): Promise<ActionResult<IntroRequest>> {
  if (dossierId === SAMPLE_DOSSIER_ID) return { ok: false, error: SAMPLE };
  const did = checkDossier(dossierId);
  const parsed = IntroInput.safeParse(input);
  if (!did || !parsed.success) return { ok: false, error: `Write one line on the purpose (up to ${PURPOSE_MAX} characters), then send.` };
  return run("request intro", async () => {
    const intro = await insertIntro(did, parsed.data.stakeholderId, parsed.data.purpose);
    if (!intro) return { ok: false, error: "That stakeholder isn't in this dossier." };
    refresh();
    return { ok: true, data: intro };
  });
}
