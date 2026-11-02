"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { joinWaitlistAction } from "@/app/waitlist/actions";
import { track } from "@/lib/analytics";
import { type CameFrom, waitlistEventProps, type WaitlistField } from "@/lib/waitlist/shared";

// Waitlist form (spec §12 "09 Waitlist", layout A). All checks run on the server; its field
// errors show under each field and the first one gets focus. Nothing typed here is sent to
// analytics: `waitlist_joined` carries only where the person came from.

const ORDER: WaitlistField[] = ["company", "email", "phone", "consent"];

const field =
  "min-h-11 rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-3 text-[15px] font-normal text-ink placeholder:text-ink3 aria-invalid:border-[var(--res)] aria-invalid:shadow-[inset_3px_0_0_var(--res)]";
const lab = "flex flex-col gap-1 text-[14px] font-semibold text-ink";

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <span id={id} className="text-[13px] font-medium text-[var(--res-text)]">
      {msg}
    </span>
  );
}

export function WaitlistForm({ from }: { from: CameFrom }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Partial<Record<WaitlistField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? "");
    setError(null);
    start(async () => {
      let r;
      try {
        r = await joinWaitlistAction({
          company: v("company"),
          email: v("email"),
          phone: v("phone"),
          consent: fd.get("consent") === "on",
          from,
          website: v("website"),
        });
      } catch {
        r = { ok: false as const, error: "Something went wrong on our side. Your details weren't saved; try again in a moment." };
      }
      if (r.ok) {
        setErrors({});
        setDone(true);
        track("waitlist_joined", waitlistEventProps(from));
        return;
      }
      const fields = r.fields ?? {};
      setErrors(fields);
      setError(r.fields ? null : r.error);
      const first = ORDER.find((k) => fields[k]);
      if (first) (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
    });
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <h2 className="m-0 text-[22px] font-bold leading-tight">You&rsquo;re on the list</h2>
        <p className="m-0 text-[15px]">
          Thank you. The Portolan team will contact you by email or phone, using the details you left here.
        </p>
        <p className="m-0 text-[14px] text-ink2">
          Sent the wrong details? Fill in the form again with the same email and we&rsquo;ll update them.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/d/sample" className="btn btn-main">
            See the sample market
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => setDone(false)}>
            Edit my details
          </button>
        </div>
      </div>
    );
  }

  const inv = (k: WaitlistField) => (errors[k] ? true : undefined);
  const desc = (k: WaitlistField, extra?: string) => [extra, errors[k] ? `${k}-err` : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} noValidate onSubmit={submit} aria-label="Join the waitlist" className="flex flex-col gap-4">
      <label className={lab}>
        Company name
        <input name="company" autoComplete="organization" required maxLength={200} aria-invalid={inv("company")} aria-describedby={desc("company")} className={field} />
        <FieldError id="company-err" msg={errors.company} />
      </label>
      <label className={lab}>
        Contact email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="name@company.com"
          aria-invalid={inv("email")}
          aria-describedby={desc("email")}
          className={field}
        />
        <FieldError id="email-err" msg={errors.email} />
      </label>
      <label className={lab}>
        Phone
        <span id="phone-hint" className="text-[13px] font-normal text-ink2">
          Include the country code, e.g. +61 412 345 678
        </span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={40}
          aria-invalid={inv("phone")}
          aria-describedby={desc("phone", "phone-hint")}
          className={field}
        />
        <FieldError id="phone-err" msg={errors.phone} />
      </label>
      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-[14px] leading-[1.4]">
          <input
            name="consent"
            type="checkbox"
            required
            aria-invalid={inv("consent")}
            aria-describedby={desc("consent")}
            className="mt-px size-5 shrink-0 accent-[var(--ink)]"
          />
          <span>
            I agree that the Portolan team may contact me by email or phone about Portolan. We keep only these details and the
            time you joined; see <Link href="/privacy#waitlist">Privacy</Link>.
          </span>
        </label>
        <FieldError id="consent-err" msg={errors.consent} />
      </div>
      {error && (
        <p role="alert" className="m-0 text-[14px] font-medium text-[var(--res-text)]">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-main" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Joining…" : "Join the waitlist"}
      </button>
    </form>
  );
}
