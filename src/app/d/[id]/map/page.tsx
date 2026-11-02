import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildMapModel } from "@/components/map/model";
import { MapView } from "@/components/map/map-view";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { Nis } from "@/components/shell/nis";
import { loadDossier } from "@/lib/db/load-dossier";

// 02 Map (spec §12). Scores are computed on the server per request (explicit `now`).
export default function MapPage({ params }: PageProps<"/d/[id]/map">) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapContent params={params} />
    </Suspense>
  );
}

async function MapContent({ params }: Pick<PageProps<"/d/[id]/map">, "params">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  if (d.stakeholders.length === 0) {
    return (
      <Nis
        kind="empty"
        headingLevel={1}
        title="No stakeholders on the map yet"
        desc="Research hasn't placed anyone yet. Follow its progress on the market page."
        actions={[{ label: "See research progress", href: `/d/${d.id}` }]}
      />
    );
  }
  const model = buildMapModel(d, new Date());
  return <MapView model={model} tracker={d.tracker} />;
}
