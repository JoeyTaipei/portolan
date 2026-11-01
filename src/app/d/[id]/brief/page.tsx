import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefColumns } from "@/components/brief/columns";
import { BriefSkeleton } from "@/components/brief/brief-skeleton";
import { Evidence } from "@/components/brief/evidence";
import { ExecPath } from "@/components/brief/exec-path";
import { Metrics } from "@/components/brief/metrics";
import { buildBriefModel, pickBrief } from "@/components/brief/model";
import { Rationale } from "@/components/brief/rationale";
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

  return (
    <BriefColumns
      left={
        <>
          <Versions dossierId={m.dossierId} isSample={m.isSample} version={m.version} versions={m.versions} status={m.status} />
          <Metrics metrics={m.metrics} dossierId={m.dossierId} />
        </>
      }
      middle={
        <div className="flex flex-col gap-7">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-[13px] text-ink2">Strategy brief</p>
              <h1 className="mt-0.5 mb-0 text-[28px] font-extrabold leading-[1.02] min-[1600px]:text-[31px]">{m.name}</h1>
            </div>
            <Link href={`/d/${m.dossierId}/report`} className="btn btn-main">
              Export one-page A4 PDF
            </Link>
          </header>
          <Rationale items={m.rationale} changesNote={m.changesNote} />
          <ExecPath path={m.path} reduce={m.reduce} dossierId={m.dossierId} />
          <SevenDay plan={m.plan} />
          {m.needs.length > 0 && (
            <section aria-labelledby="needs-h" className="max-w-[68ch] rounded-[var(--r-l)] border border-dashed border-rule-strong p-3">
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
        </div>
      }
      right={<Evidence items={m.evidence} total={m.acceptedCount} dossierId={m.dossierId} />}
    />
  );
}
