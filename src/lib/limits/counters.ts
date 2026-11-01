import { createHash } from "node:crypto";

// Daily usage limits (spec §8). A day is 00:00–24:00 Taipei/Perth time (UTC+8). Counting goes
// through the `bump_usage` RPC, which adds one only while the count is under the max, atomically.
// Simpler version (plan P-16): RE-BRIEF, documents and intro drafts share one per-dossier AI
// counter, `dossier:<id>:ai`, 10 per day.

export const LIMITS = {
  researchPerEmail: 2,
  researchSiteWide: 30,
  dossierAi: 10,
} as const;

export const MESSAGES = {
  email: "Today's research limit is reached. Your link still works; try again after 00:00 Taipei time.",
  site: "Portolan's daily research capacity is full. Your link still works; try again after 00:00 Taipei time.",
  dossierAi: "Today's AI limit for this dossier is reached. Try again after 00:00 Taipei time.",
} as const;

/** Atomic "add one if under max" (the bump_usage RPC). */
export type Bump = (day: string, scope: string, max: number) => Promise<boolean>;

/** "YYYY-MM-DD" in UTC+8. */
export function taipeiDay(now: Date): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** sha256(lower(email) + salt), hex. The salt is server config, never sent to the browser. */
export function hashEmail(email: string, salt = emailSalt()): string {
  return createHash("sha256").update(email.trim().toLowerCase() + salt).digest("hex");
}

function emailSalt(): string {
  const s = process.env.EMAIL_HASH_SALT;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("EMAIL_HASH_SALT is not set");
  return "portolan-dev-salt";
}

export type LimitResult = { ok: true } | { ok: false; error: string };

/**
 * Research (new dossier or refresh). The email count goes first so a blocked email never
 * uses up site-wide capacity.
 */
export async function useResearch(bump: Bump, emailHash: string, now: Date): Promise<LimitResult> {
  const day = taipeiDay(now);
  if (!(await bump(day, `email:${emailHash}`, LIMITS.researchPerEmail))) return { ok: false, error: MESSAGES.email };
  if (!(await bump(day, "site", LIMITS.researchSiteWide))) return { ok: false, error: MESSAGES.site };
  return { ok: true };
}

/** One AI action on a dossier (RE-BRIEF, document draft, intro draft). */
export async function useDossierAi(bump: Bump, dossierId: string, now: Date): Promise<LimitResult> {
  const ok = await bump(taipeiDay(now), `dossier:${dossierId}:ai`, LIMITS.dossierAi);
  return ok ? { ok: true } : { ok: false, error: MESSAGES.dossierAi };
}
