import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildReportModel } from "@/components/report/model";
import { SharedFrame } from "@/components/report/shared-frame";
import { buildSourcesModel } from "@/components/sources/model";
import { SourceList } from "@/components/sources/source-list";
import { SourcesSkeleton } from "@/components/sources/sources-skeleton";
import { loadByShareId } from "@/lib/db/load-dossier";
import { isShareId, SAMPLE_SHARE_ID } from "@/lib/ids";

export const metadata = { title: "Report sources · Portolan" };

// /s/[shareId]/sources: only the sources the shared report cites, without the facts list.
export function generateStaticParams() {
  return [{ shareId: SAMPLE_SHARE_ID }];
}

export default async function SharedSourcesPage({ params }: PageProps<"/s/[shareId]/sources">) {
  // A malformed id (a dossier id is never one: "sample" isn't 22 characters) is a real 404
  // before anything streams, with no lookup.
  const { shareId } = await params;
  if (!isShareId(shareId)) notFound();
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
