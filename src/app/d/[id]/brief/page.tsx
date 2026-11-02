import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefSkeleton } from "@/components/brief/brief-skeleton";
import { Evidence } from "@/components/brief/evidence";
import { ExecPath } from "@/components/brief/exec-path";
import { Metrics } from "@/components/brief/metrics";
import { buildBriefModel, pickBrief } from "@/components/brief/model";
import { Rationale } from "@/components/brief/rationale";
import { Requirements } from "@/components/brief/requirements";
import { Routes } from "@/components/brief/routes";
import { Unverified } from "@/components/brief/unverified";
import { SevenDay } from "@/components/brief/seven-day";
import { Versions } from "@/components/brief/versions";
import { Nis } from "@/components/shell/nis";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "Strategy brief · Portolan" };

// 03 Strategy brief (spec §12). `?v=2` shows an older version. Metrics are recomputed per
// request; every sentence shown has passed the pre-display check in the model.
export default function BriefPage({ params, searchParams }: PageProps<"/d/[id]/brief">) {
  return (
    <Suspense fallback={<BriefSkeleton />}>
      <BriefContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BriefContent({ params, searchParams }: Pick<PageProps<"/d/[id]/brief">, "params" | "searchParams">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  const sp = await searchParams;
  const brief = pickBrief(d, typeof sp.v === "string" ? sp.v : null);
  if (!brief) {
    return (
      <Nis
        kind="empty"
        headingLevel={1}
        title="The brief is still being written"
        desc="It appears here once research has finished and every sentence has a source."
        actions={[{ label: "See research progress", href: `/d/${d.id}` }]}
      />
    );
  }
  const m = buildBriefModel(d, brief, new Date());

  const sections = [
    { id: "rat-h", label: "Position rationale" },
    { id: "path-h", label: "Executive path" },
    { id: "plan-h", label: "7-day plan" },
    ...(m.requirements.length > 0 ? [{ id: "req-h", label: "Entry requirements" }] : []),
    ...(m.routes.length > 0 ? [{ id: "route-h", label: "Procurement routes" }] : []),
    { id: "gap-h", label: "Not verified" },
    { id: "evi-h", label: "Evidence" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pt-[18px] pb-10 lg:gap-8 lg:px-10 lg:pt-8 lg:pb-14">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[14px] text-ink2">Strategy brief</p>
          <h1 className="mt-1 mb-0 text-[32px] font-bold leading-[1.05] lg:text-[40px]">{m.name}</h1>
        </div>
        <Link href={`/d/${m.dossierId}/report`} className="btn btn-main">
          Export one-page A4 PDF
        </Link>
      </header>
      <Metrics metrics={m.metrics} dossierId={m.dossierId} />
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[220px_minmax(0,720px)] lg:items-start lg:gap-12">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-4">
          <Versions dossierId={m.dossierId} isSample={m.isSample} version={m.version} versions={m.versions} status={m.status} />
          <nav aria-label="In this brief" className="hidden flex-col lg:flex">
            {sections.map((x) => (
              <a key={x.id} href={`#${x.id}`} className="border-l-[3px] border-rule py-2 pl-3 text-[15px] text-ink2 no-underline hover:border-rule-strong hover:text-ink">
                {x.label}
              </a>
            ))}
          </nav>
        </aside>
        <article className="flex min-w-0 flex-col gap-10">
          <Rationale items={m.rationale} changesNote={m.changesNote} dossierId={m.dossierId} />
          <ExecPath path={m.path} reduce={m.reduce} dossierId={m.dossierId} />
          <SevenDay plan={m.plan} dossierId={m.dossierId} />
          <Requirements items={m.requirements} exportCheck={m.exportCheck} dossierId={m.dossierId} />
          <Routes routes={m.routes} firstBuyer={m.firstBuyer} dossierId={m.dossierId} />
          <Unverified gaps={m.gaps} />
          {m.needs.length > 0 && (
            <section aria-labelledby="needs-h" className="rounded-[var(--r-l)] border border-dashed border-rule-strong p-3">
              <h2 id="needs-h" className="m-0 mb-1 text-[14.5px] font-bold">
                Missing from your form
              </h2>
              <ul className="m-0 pl-4 text-[14px] leading-[1.5]">
                {m.needs.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}
          <Evidence items={m.evidence} total={m.acceptedCount} dossierId={m.dossierId} />
        </article>
      </div>
    </div>
  );
}
