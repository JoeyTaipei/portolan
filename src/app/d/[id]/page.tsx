import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildHomeModel } from "@/components/home/model";
import { HomeView } from "@/components/home/home-view";
import { RememberVisit } from "@/components/home/remember";
import { ResearchProgress } from "@/components/progress/research-progress";
import { PageSkeleton } from "@/components/shell/nis";
import { loadDossier } from "@/lib/db/load-dossier";
import { sampleDossier } from "@/lib/sample/reader";

// Dossier overview = screen 01 with this dossier selected; RES-1 progress while researching.
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
  await connection();
  if (d.status === "researching") return <ResearchProgress dossierId={d.id} />;
  const now = new Date();
  const m = buildHomeModel(d, now);
  const s = d.isSample ? m : buildHomeModel(sampleDossier, now);
  return (
    <>
      {!d.isSample && <RememberVisit id={d.id} name={d.name} />}
      <HomeView m={m} sample={{ id: s.id, name: s.name, level: s.confidence.level, sources: s.counts.sources }} />
    </>
  );
}
