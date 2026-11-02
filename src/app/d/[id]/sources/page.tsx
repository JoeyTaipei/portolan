import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildSourcesModel } from "@/components/sources/model";
import { SourceList } from "@/components/sources/source-list";
import { SourcesSkeleton } from "@/components/sources/sources-skeleton";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "Sources · Portolan" };

// Sources page (spec §12): all accepted sources, `?s=` stakeholder, `?type=`, `?id=S12`.
export default function SourcesPage({ params }: PageProps<"/d/[id]/sources">) {
  return (
    <Suspense fallback={<SourcesSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/d/[id]/sources">, "params">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  const m = buildSourcesModel(d, new Date(), { withFacts: true });
  return (
    <SourceList
      m={m}
      title="Sources"
      intro="Every accepted source behind this market, with its Admiralty grade, the date it was checked and what it backs up."
    />
  );
}
