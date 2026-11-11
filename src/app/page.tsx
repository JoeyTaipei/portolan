import { connection } from "next/server";
import { Suspense } from "react";
import { buildHomeModel } from "@/components/home/model";
import { HomeView } from "@/components/home/home-view";
import { OpenLastDossier } from "@/components/home/remember";
import { DossierShell } from "@/components/shell/dossier-shell";
import { PageSkeleton, StatePreview } from "@/components/shell/nis";
import { sampleDossier } from "@/lib/sample/reader";

// 01 Markets: the most recently opened market is selected (client check), else the sample.
export default function Home() {
  return (
    <DossierShell dossierId={sampleDossier.id} isSample>
      <Suspense fallback={<PageSkeleton />}>
        <StatePreview>
          <HomeContent />
        </StatePreview>
      </Suspense>
    </DossierShell>
  );
}

async function HomeContent() {
  await connection();
  const m = buildHomeModel(sampleDossier, new Date());
  return (
    <>
      <OpenLastDossier />
      <HomeView atHome m={m} samples={[{ id: m.id, name: m.name, level: m.confidence.level, sources: m.counts.sources }]} />
    </>
  );
}
