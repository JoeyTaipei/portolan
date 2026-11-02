import { describe, expect, it, vi } from "vitest";
import {
  ipScope,
  joinWaitlist,
  normaliseFrom,
  parseWaitlist,
  WAITLIST_LIMITS,
  WAITLIST_MESSAGES,
  waitlistEventProps,
  type JoinDeps,
  type WaitlistInput,
} from "./join";

const good: WaitlistInput = { company: "Skyline Robotics", email: " Ana@Skyline.example ", phone: "+61 412 345 678", consent: true };
const NOW = new Date("2026-11-02T03:00:00Z");

function deps(site = true) {
  const counts = new Map<string, number>();
  const bump = vi.fn(async (_day: string, scope: string, max: number) => {
    if (scope === "waitlist:site" && !site) return false;
    const n = counts.get(scope) ?? 0;
    if (n >= max) return false;
    counts.set(scope, n + 1);
    return true;
  });
  const save = vi.fn(async () => ({ created: true }));
  const notify = vi.fn();
  return { open: true, bump, save, notify, ip: "203.0.113.7", now: NOW } satisfies JoinDeps;
}

describe("parseWaitlist", () => {
  it("accepts good input and lower-cases the email", () => {
    const r = parseWaitlist(good);
    expect(r).toEqual({ ok: true, value: { company: "Skyline Robotics", email: "ana@skyline.example", phone: "+61 412 345 678" } });
  });

  it("flags every missing field, including consent", () => {
    const r = parseWaitlist({ company: " ", email: "", phone: "", consent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields).sort()).toEqual(["company", "consent", "email", "phone"]);
  });

  it.each([
    ["+886 2 2345 6789", true],
    ["(02) 2345-6789", true],
    ["123456", false], // 6 digits
    ["+1 555 CALL NOW", false], // letters
    ["1".repeat(21), false], // 21 digits
  ])("phone %s → %s", (phone, ok) => {
    expect(parseWaitlist({ ...good, phone }).ok).toBe(ok);
  });

  it("rejects a bad email and an over-long company", () => {
    expect(parseWaitlist({ ...good, email: "ana@skyline" }).ok).toBe(false);
    expect(parseWaitlist({ ...good, company: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("joinWaitlist", () => {
  it("saves once, notifies once and records consent", async () => {
    const d = deps();
    expect(await joinWaitlist({ ...good, from: "share" }, d)).toEqual({ ok: true });
    expect(d.save).toHaveBeenCalledWith({
      company: "Skyline Robotics",
      email: "ana@skyline.example",
      phone: "+61 412 345 678",
      cameFrom: "share",
      consentVersion: "v1",
      consentedAt: NOW.toISOString(),
    });
    expect(d.notify).toHaveBeenCalledTimes(1);
  });

  it("honeypot: replies ok but counts, stores and posts nothing", async () => {
    const d = deps();
    expect(await joinWaitlist({ ...good, website: "http://spam.example" }, d)).toEqual({ ok: true });
    expect(d.bump).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });

  it("invalid input counts and stores nothing", async () => {
    const d = deps();
    const r = await joinWaitlist({ ...good, consent: false }, d);
    expect(r.ok).toBe(false);
    expect(d.bump).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
  });

  it("refuses the 6th sign-up from one IP in a day, before the site counter and without writing", async () => {
    const d = deps();
    for (let i = 0; i < WAITLIST_LIMITS.perIp; i++) expect((await joinWaitlist(good, d)).ok).toBe(true);
    d.bump.mockClear();
    d.save.mockClear();
    expect(await joinWaitlist(good, d)).toEqual({ ok: false, error: WAITLIST_MESSAGES.limit });
    expect(d.bump).toHaveBeenCalledTimes(1);
    expect(d.bump.mock.calls[0][1]).toMatch(/^waitlist:ip:/);
    expect(d.save).not.toHaveBeenCalled();
  });

  it("refuses when the site-wide limit is reached", async () => {
    const d = deps(false);
    expect(await joinWaitlist(good, d)).toEqual({ ok: false, error: WAITLIST_MESSAGES.limit });
    expect(d.save).not.toHaveBeenCalled();
  });

  it("keys the IP counter by a salted hash, never the address", () => {
    const scope = ipScope("203.0.113.7", "salt");
    expect(scope).not.toContain("203.0.113.7");
    expect(scope).toMatch(/^waitlist:ip:[0-9a-f]{64}$/);
  });
});

describe("analytics", () => {
  it("unknown sources count as direct, and the event carries only `from`", () => {
    expect(normaliseFrom("newsletter")).toBe("direct");
    expect(normaliseFrom(null)).toBe("direct");
    expect(waitlistEventProps("docs")).toEqual({ from: "docs" });
  });
});
