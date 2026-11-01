import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResearchProgress } from "@/components/progress/research-progress";
import { PageSkeleton } from "@/components/shell/nis";
import { loadDossier } from "@/lib/db/load-dossier";

// Minimal dossier overview until S1 builds screen 01.
export default function DossierPage({ params }: PageProps<"/d/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: Pick<PageProps<"/d/[id]">, "params">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  if (d.status === "researching") return <ResearchProgress dossierId={d.id} />;
  const accepted = d.sources.filter((s) => s.accepted).length;
  const counts = [
    { n: d.stakeholders.length, label: "stakeholders" },
    { n: accepted, label: "accepted sources" },
    { n: d.events.length, label: "timed events" },
  ];
  return (
    <section className="flex max-w-[68ch] flex-col gap-4 px-[18px] py-6 lg:px-6">
      <p className="m-0 text-[13px] font-semibold text-ink2">Taiwan · {d.goal}</p>
      <h1 className="m-0 text-[31px] font-bold leading-none tracking-[-.01em]">{d.name}</h1>
      <p className="m-0 text-ink2">
        Prepared for {d.company} · {d.product}
      </p>
      <dl className="m-0 grid grid-cols-3 border-y border-rule-strong">
        {counts.map((c, i) => (
          <div key={c.label} className={`py-2.5 ${i > 0 ? "border-l border-rule pl-3" : ""}`}>
            <dd className="num m-0 text-[34px] font-semibold leading-none">{c.n}</dd>
            <dt className="text-[12.5px] text-ink2">{c.label}</dt>
          </div>
        ))}
      </dl>
      {accepted === 0 && (
        <p className="m-0 text-[14px] text-ink2">
          No accepted sources yet, so every fact here is marked Unverified and nothing is scored.
        </p>
      )}
      <ul className="m-0 flex flex-col gap-1 p-0 text-[14px]">
        {d.stakeholders.slice(0, 8).map((s) => (
          <li key={s.id} className="flex list-none items-baseline justify-between gap-3 border-b border-rule py-1.5">
            <span className="font-semibold">{s.short ?? s.name}</span>
            <span className="text-[12.5px] text-ink2">Unverified</span>
          </li>
        ))}
      </ul>
      <Link href="/" className="btn btn-ghost self-start">
        Back to Dossiers
      </Link>
    </section>
  );
}
