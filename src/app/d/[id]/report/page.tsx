import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReportScreen, ReportSkeleton } from "@/components/report/report-page";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "One-page report · Portolan" };

// 05 One-page A4 report with the print and share toolbar (spec §12).
export default function ReportPage({ params }: PageProps<"/d/[id]/report">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/d/[id]/report">, "params">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  return <ReportScreen d={d} shared={false} />;
}
