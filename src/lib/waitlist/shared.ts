// Waitlist helpers safe for the browser (no server imports). Spec §12 "09 Waitlist".

export type CameFrom = "direct" | "docs" | "share";
export type WaitlistField = "company" | "email" | "phone" | "consent";

export function normaliseFrom(v: string | null | undefined): CameFrom {
  return v === "docs" || v === "share" ? v : "direct";
}

/** The only properties sent with `waitlist_joined`. */
export function waitlistEventProps(from: CameFrom): { from: CameFrom } {
  return { from };
}
