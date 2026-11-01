import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildReportModel } from "@/components/report/model";
import { SharedFrame } from "@/components/report/shared-frame";
import { buildSourcesModel } from "@/components/sources/model";
import { SourceList } from "@/components/sources/source-list";
import { SourcesSkeleton } from "@/components/sources/sources-skeleton";
import { loadByShareId } from "@/lib/db/load-dossier";

export const metadata = { title: "Report sources · Portolan" };

// /s/[shareId]/sources: only the sources the shared report cites, without the facts list.
// Malformed ids (a dossier id like "sample" is never a share id) are a real 404 via the
// rewrite in next.config.ts, before anything streams.
export default function SharedSourcesPage({ params }: PageProps<"/s/[shareId]/sources">) {
  return (
    <Suspense fallback={<SourcesSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/s/[shareId]/sources">, "params">) {
  const { shareId } = await params;
  const d = await loadByShareId(shareId);
  if (!d) notFound();
  await connection();
  const now = new Date();
  const brief = d.briefs.at(-1);
  const cited = new Set(brief ? buildReportModel(d, brief, now).citedIds : []);
  const m = buildSourcesModel(d, now, { only: cited, withFacts: false });
  return (
    <SharedFrame isSample={d.isSample}>
      <SourceList m={m} title="Report sources" intro="The sources this report cites, with their Admiralty grade and the date each was checked." />
    </SharedFrame>
  );
}
