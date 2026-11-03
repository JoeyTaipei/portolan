import { LangSwitch } from "@/components/shell/lang-switch";
import type { Key } from "@/lib/i18n";
import { Both } from "@/lib/i18n/client";
import Link from "next/link";
import { Suspense } from "react";
import { StatePreview } from "@/components/shell/nis";
import { FormSkeleton } from "@/components/waitlist/form-skeleton";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { normaliseFrom } from "@/lib/waitlist/shared";

export const metadata = { title: "Join the waitlist · Portolan" };

// 09 Waitlist (spec §12, layout A from design/waitlist-options): the page opened after a
// pitch. Left: what happens next. Right: the form. Outside the five tabs.

const NEXT: { title: Key; body: Key }[] = [
  { title: "We contact you", body: "by email or phone, using the details you leave here." },
  { title: "We ask about your goal", body: "the product, the buyer you want to reach and your deadline." },
  { title: "You get a sourced market map", body: "stakeholders, a strategy brief and a one-page A4 report." },
];

export default function WaitlistPage({ searchParams }: PageProps<"/waitlist">) {
  return (
    <div className="frame flex flex-col">
      <header className="flex items-center border-b border-rule-strong bg-[var(--bar)] px-4 py-3 lg:h-[58px] lg:px-6 lg:py-0">
        <Link href="/" className="text-[17px] font-bold uppercase tracking-[.12em] text-[var(--bar-ink)] no-underline">
          Portolan
        </Link>
        <span className="ml-auto flex items-center gap-4">
          <Link href="/d/sample" className="text-[14px] text-ink2">
            <Both k="See the sample market" />
          </Link>
          <LangSwitch />
        </span>
      </header>
      <main className="mx-auto grid w-full max-w-[1180px] flex-1 content-start gap-8 px-4 pt-8 pb-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:px-12 lg:pt-14">
        <div>
          <h1 className="m-0 text-[31px] font-extrabold leading-[1.05]">
            <Both k="Join the Portolan waitlist" />
          </h1>
          <p className="mt-2 mb-0 max-w-[52ch] text-[16px] text-ink2">
            <Both k="Leave your company and how to reach you. We’ll follow up about mapping your first meetings in Taiwan." />
          </p>
          <h2 className="mt-8 mb-3 text-[16px] font-bold">
            <Both k="What happens next" />
          </h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {NEXT.map((n, i) => (
              <li key={n.title} className="grid grid-cols-[26px_1fr] text-[15px]">
                <span className="num font-bold">{i + 1}.</span>
                <span>
                  <b className="block">
                    <Both k={n.title} />
                  </b>
                  <Both k={n.body} />
                </span>
              </li>
            ))}
          </ol>
        </div>
        <section aria-labelledby="wl-details" className="self-start rounded-[var(--r-l)] border border-rule-strong bg-panel p-5 lg:p-6">
          <h2 id="wl-details" className="sr-only">
            <Both k="Your details" />
          </h2>
          <Suspense fallback={<FormSkeleton />}>
            <StatePreview>
              <FormWithSource searchParams={searchParams} />
            </StatePreview>
          </Suspense>
        </section>
      </main>
    </div>
  );
}

async function FormWithSource({ searchParams }: Pick<PageProps<"/waitlist">, "searchParams">) {
  const sp = await searchParams;
  return <WaitlistForm from={normaliseFrom(typeof sp.from === "string" ? sp.from : null)} />;
}
