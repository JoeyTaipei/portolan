"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { bumpUsage } from "@/lib/db/research";
import { saveWaitlistEntry } from "@/lib/db/waitlist";
import { joinWaitlist, type JoinResult, WAITLIST_MESSAGES, type WaitlistInput } from "@/lib/waitlist/join";
import { notifySlack } from "@/lib/waitlist/notify";

// Waitlist Server Action (spec §12 "09 Waitlist"). A public POST: every field is checked here,
// the honeypot and daily limits run before any write, and the Slack post runs after the
// response so it never slows or fails the sign-up. Logs never include the details people enter.

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function joinWaitlistAction(input: WaitlistInput): Promise<JoinResult> {
  try {
    return await joinWaitlist(input, {
      open: getDb() !== null,
      bump: bumpUsage,
      save: saveWaitlistEntry,
      notify: (entry, created) => after(() => notifySlack(entry, created)),
      ip: await clientIp(),
      now: new Date(),
    });
  } catch (e) {
    console.error("waitlist: sign-up failed", e instanceof Error ? e.message.replace(/\S+@\S+/g, "<email>") : "");
    return { ok: false, error: WAITLIST_MESSAGES.failed };
  }
}
