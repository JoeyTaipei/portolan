import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildNetworkModel, parseTab } from "@/components/network/model";
import { NetworkSkeleton } from "@/components/network/network-skeleton";
import { NetworkView } from "@/components/network/network-view";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "Network · Portolan" };

// 04 Network (spec §12). Partners is the default tab; `?tab=investors|lawyers|events` opens another. Only the cards' view model goes
// to the browser; matches are the sourced checks research stored, never computed here.
export default function NetworkPage({ params, searchParams }: PageProps<"/d/[id]/network">) {
  return (
    <Suspense fallback={<NetworkSkeleton />}>
      <NetworkContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NetworkContent({ params, searchParams }: Pick<PageProps<"/d/[id]/network">, "params" | "searchParams">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  const sp = await searchParams;
  return <NetworkView vm={buildNetworkModel(d, new Date())} tab={parseTab(sp.tab)} />;
}
