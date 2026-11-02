"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createDossier, type CreateDossierInput } from "@/app/actions/research";
import { rememberDossier } from "@/lib/browser-dossiers";
import type { Key } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

// HOME-8 (spec §7.1). Required: company, product, goal, email; optional fields feed the
// brief's "Needs from you". Lengths match the server-side check. Taiwan only for now; China is
// not offered. The email is sent once with the request and never kept in this browser.

export const LIMITS = { company: 120, product: 200, goal: 300, email: 254, optional: 200 } as const;

const REQUIRED: { name: "company" | "product" | "goal" | "email"; label: Key; what: Key; placeholder: Key }[] = [
  { name: "company", label: "Your company", what: "your company", placeholder: "e.g. Skyward Robotics" },
  { name: "product", label: "Product or service", what: "the product or service", placeholder: "e.g. Counter-UAS sensor kit" },
  { name: "goal", label: "Goal", what: "a goal", placeholder: "e.g. First government pilot within 12 months" },
  { name: "email", label: "Email for the market link", what: "an email", placeholder: "you@company.com" },
];

const field =
  "min-h-11 rounded-[var(--r-s)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 text-[15px] font-normal text-ink placeholder:text-ink3 aria-invalid:border-[var(--res)] aria-invalid:shadow-[inset_3px_0_0_var(--res)]";
const lab = "flex flex-col gap-1 text-[13px] font-medium text-ink2";

export function NewDossierForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const t = useT();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    for (const r of REQUIRED) {
      const val = v(r.name);
      const ok = val && (r.name !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
      if (!ok) {
        setInvalid(r.name);
        setError(r.name === "email" && val ? t("Enter a valid email to start research.") : t("Fill in {what|t} to start research.", { what: t(r.what) }));
        (e.currentTarget.elements.namedItem(r.name) as HTMLInputElement | null)?.focus();
        return;
      }
    }
    setInvalid(null);
    setError(null);
    const opt = (k: string) => v(k) || undefined;
    const input: CreateDossierInput = {
      company: v("company"),
      product: v("product"),
      goal: v("goal"),
      email: v("email"),
      market: "TW",
      certifications: opt("certifications"),
      priceRange: opt("priceRange"),
      twPartners: opt("twPartners"),
      clientDeadline: opt("clientDeadline"),
      website: v("website"),
    };
    start(async () => {
      const r = await createDossier(input);
      if (!r.ok) {
        setError(t.x(r.error));
        return;
      }
      rememberDossier(r.data.id, input.company); // the user's own words; the real name replaces it on first visit
      setCreated(r.data);
      formRef.current?.reset();
    });
  }

  if (created) {
    return (
      <div className="flex flex-col gap-2.5 rounded-[var(--r-m)] border border-rule-strong bg-panel p-3.5" role="status">
        <p className="m-0 text-[15px] font-bold">{t("Research started")}</p>
        <p className="m-0 text-[14px] font-semibold text-[var(--notice-text)]">
          {t("This link is the only key to your market. Save it now.")}
        </p>
        <code className="block break-all rounded-[var(--r-s)] bg-panel2 px-2 py-1.5 text-[13px]">{created.url}</code>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-s flex-1"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? t("Copied") : t("Copy link")}
          </button>
          <Link href={`/d/${created.id}`} className="btn btn-main btn-s flex-1">
            {t("Open the market")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-label={t("New market")}
      className="flex flex-col gap-2.5 rounded-[var(--r-m)] border border-dashed border-rule-strong bg-panel p-3.5"
    >
      {REQUIRED.slice(0, 2).map((r) => (
        <label key={r.name} className={lab}>
          {t(r.label)}
          <input name={r.name} required maxLength={LIMITS[r.name]} placeholder={t(r.placeholder)} aria-invalid={invalid === r.name || undefined} className={field} />
        </label>
      ))}
      <label className={lab}>
        {t("Target market")}
        <select name="market" defaultValue="TW" className={field}>
          <option value="TW">{t("Taiwan")}</option>
          <option disabled>{t("United States (coming soon)")}</option>
          <option disabled>{t("Japan (coming soon)")}</option>
          <option disabled>{t("Singapore (coming soon)")}</option>
        </select>
      </label>
      {REQUIRED.slice(2).map((r) => (
        <label key={r.name} className={lab}>
          {t(r.label)}
          <input
            name={r.name}
            type={r.name === "email" ? "email" : "text"}
            autoComplete={r.name === "email" ? "email" : "off"}
            required
            maxLength={LIMITS[r.name]}
            placeholder={t(r.placeholder)}
            aria-invalid={invalid === r.name || undefined}
            className={field}
          />
        </label>
      ))}
      <details className="text-[13px] text-ink2">
        <summary className="min-h-8 cursor-pointer py-1 font-semibold text-ink">{t("Optional: details that sharpen the brief")}</summary>
        <div className="mt-2 flex flex-col gap-2.5">
          <label className={lab}>
            {t("Product certifications")}
            <input name="certifications" maxLength={LIMITS.optional} className={field} />
          </label>
          <label className={lab}>
            {t("Price range")}
            <input name="priceRange" maxLength={LIMITS.optional} className={field} />
          </label>
          <label className={lab}>
            {t("Partners you already have in Taiwan")}
            <input name="twPartners" maxLength={LIMITS.optional} className={field} />
          </label>
          <label className={lab}>
            {t("Your own deadline")}
            <input name="clientDeadline" type="date" className={field} />
          </label>
        </div>
      </details>
      {/* honeypot: hidden from people, filled by bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" className="btn btn-main" disabled={pending}>
        {pending ? t("Starting research…") : t("Start research")}
      </button>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-bold text-[var(--res-text)]">
          {error}
        </p>
      )}
    </form>
  );
}
