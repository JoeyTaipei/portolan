import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrackerSkeleton } from "@/components/tracker/tracker-skeleton";
import { TrackerView } from "@/components/tracker/tracker-view";
import { loadDossier } from "@/lib/db/load-dossier";
import { trackerState } from "@/lib/tracker/flow";

export const metadata = { title: "Tracker · Portolan" };

// 06 Tracker (spec §12). Only the tracker's slice of the dossier goes to the browser; support is
// recomputed from statements with src/lib/scoring on every change.
export default function TrackerPage({ params }: PageProps<"/d/[id]/tracker">) {
  return (
    <Suspense fallback={<TrackerSkeleton />}>
      <TrackerContent params={params} />
    </Suspense>
  );
}

async function TrackerContent({ params }: Pick<PageProps<"/d/[id]/tracker">, "params">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  return <TrackerView initial={trackerState(d)} isSample={d.isSample} name={d.name} nowIso={new Date().toISOString()} />;
}
