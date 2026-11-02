import { z } from "zod";
import { type Bump, hashEmail, taipeiDay } from "@/lib/limits/counters";
import { type CameFrom, normaliseFrom, type WaitlistField } from "./shared";

export { normaliseFrom, waitlistEventProps, type CameFrom, type WaitlistField } from "./shared";

// Waitlist (spec §12 "09 Waitlist", plan S12). Pure core so it can be tested without a
// database: validation, honeypot, daily limits, then save and notify through injected deps.

export const CONSENT_VERSION = "v1";
export const CONSENT_TEXT =
  "I agree that the Portolan team may contact me by email or phone about Portolan. We keep only these details and the time you joined; see Privacy.";

export const WAITLIST_LIMITS = { perIp: 5, site: 200 } as const;

export const WAITLIST_MESSAGES = {
  limit: "Too many sign-ups from here today. Try again tomorrow, or mention it to the person who showed you Portolan.",
  failed: "Something went wrong on our side. Your details weren't saved; try again in a moment.",
  closed: "The waitlist isn't open here yet.",
} as const;


export interface WaitlistInput {
  company: string;
  email: string;
  phone: string;
  consent: boolean;
  from?: string;
  /** Honeypot: a value means a bot; we reply "joined" and do nothing. */
  website?: string;
}

export interface WaitlistEntry {
  company: string;
  email: string;
  phone: string;
  cameFrom: CameFrom;
  consentVersion: string;
  consentedAt: string;
}

export type JoinResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Partial<Record<WaitlistField, string>> };

export interface JoinDeps {
  /** False when the database isn't configured: fields are still checked, then nothing is written. */
  open: boolean;
  bump: Bump;
  /** Inserts, or updates the row with the same email. Returns whether a new row was made. */
  save: (entry: WaitlistEntry) => Promise<{ created: boolean }>;
  notify: (entry: WaitlistEntry, created: boolean) => void;
  /** The caller's IP address (never stored; only its salted hash is used as a counter key). */
  ip: string;
  now: Date;
}

/** The counter key for one IP: a salted hash, never the address itself. */
export function ipScope(ip: string, salt?: string): string {
  return `waitlist:ip:${hashEmail(ip, salt)}`;
}

const PHONE_CHARS = /^\+?[\d\s\-()]+$/;

const Schema = z.object({
  company: z.string().trim().min(1, "Fill in your company name.").max(200, "Keep the company name under 200 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Enter a valid email, like name@company.com.")
    .pipe(z.email("Enter a valid email, like name@company.com.")),
  phone: z
    .string()
    .trim()
    .min(1, "Fill in a phone number.")
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => {
      const digits = v.replace(/\D/g, "").length;
      return PHONE_CHARS.test(v) && digits >= 7 && digits <= 20;
    }, "Enter a phone number with its country code, e.g. +61 412 345 678."),
  consent: z.literal(true, "Tick the box so we may contact you."),
});

export function parseWaitlist(
  input: WaitlistInput,
): { ok: true; value: { company: string; email: string; phone: string } } | { ok: false; fields: Partial<Record<WaitlistField, string>> } {
  const r = Schema.safeParse({
    company: typeof input.company === "string" ? input.company : "",
    email: typeof input.email === "string" ? input.email : "",
    phone: typeof input.phone === "string" ? input.phone : "",
    consent: input.consent === true,
  });
  if (r.success) return { ok: true, value: { company: r.data.company, email: r.data.email, phone: r.data.phone } };
  const fields: Partial<Record<WaitlistField, string>> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as WaitlistField;
    if (!fields[k]) fields[k] = issue.message;
  }
  return { ok: false, fields };
}

export async function joinWaitlist(input: WaitlistInput, deps: JoinDeps): Promise<JoinResult> {
  if (typeof input.website === "string" && input.website.trim() !== "") return { ok: true };

  const parsed = parseWaitlist(input);
  if (!parsed.ok) return { ok: false, error: "Check the highlighted fields.", fields: parsed.fields };

  if (!deps.open) return { ok: false, error: WAITLIST_MESSAGES.closed };

  const day = taipeiDay(deps.now);
  if (!(await deps.bump(day, ipScope(deps.ip), WAITLIST_LIMITS.perIp))) return { ok: false, error: WAITLIST_MESSAGES.limit };
  if (!(await deps.bump(day, "waitlist:site", WAITLIST_LIMITS.site))) return { ok: false, error: WAITLIST_MESSAGES.limit };

  const entry: WaitlistEntry = {
    ...parsed.value,
    cameFrom: normaliseFrom(input.from),
    consentVersion: CONSENT_VERSION,
    consentedAt: deps.now.toISOString(),
  };
  const { created } = await deps.save(entry);
  deps.notify(entry, created);
  return { ok: true };
}
