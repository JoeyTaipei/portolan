import "server-only";
import type { WaitlistEntry } from "@/lib/waitlist/join";
import { db } from "./research";

// The waitlist table (spec §13). Write only: nothing in the app reads it back; the team reads
// it in the Supabase dashboard.

/** Insert, or update the row with the same (lower-cased) email. */
export async function saveWaitlistEntry(e: WaitlistEntry): Promise<{ created: boolean }> {
  const row = {
    company: e.company,
    phone: e.phone,
    came_from: e.cameFrom,
    consent_version: e.consentVersion,
    consented_at: e.consentedAt,
    updated_at: e.consentedAt,
  };
  const ins = await db()
    .from("waitlist")
    .insert({ ...row, email: e.email, created_at: e.consentedAt });
  if (!ins.error) return { created: true };
  if (ins.error.code !== "23505") throw new Error(`insert waitlist: ${ins.error.message}`);
  const upd = await db().from("waitlist").update(row).eq("email", e.email);
  if (upd.error) throw new Error(`update waitlist: ${upd.error.message}`);
  return { created: false };
}
