import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReportScreen, ReportSkeleton } from "@/components/report/report-page";
import { SharedFrame } from "@/components/report/shared-frame";
import { loadByShareId } from "@/lib/db/load-dossier";

// Titles never contain an id (spec §9).
export const metadata = { title: "Shared report · Portolan" };

// /s/[shareId]: the A4 report only, looked up by the separate share id. A dossier id (or
// "sample") is not a share id, so it 404s. Nothing else from the dossier is rendered here.
// Malformed ids (a dossier id like "sample" is never a share id) are a real 404 via the
// rewrite in next.config.ts, before anything streams.
export default function SharedReportPage({ params }: PageProps<"/s/[shareId]">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/s/[shareId]">, "params">) {
  const { shareId } = await params;
  const d = await loadByShareId(shareId);
  if (!d) notFound();
  await connection();
  return (
    <SharedFrame isSample={d.isSample}>
      <ReportScreen d={d} shared />
    </SharedFrame>
  );
}
