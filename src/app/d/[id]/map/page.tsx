import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { buildMapModel } from "@/components/map/model";
import { MapView } from "@/components/map/map-view";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { Nis } from "@/components/shell/nis";
import { TeamProvider, type TeamData } from "@/components/team/team-context";
import { loadDossier } from "@/lib/db/load-dossier";
import type { Dossier } from "@/lib/types";

// 02 Map (spec §12). Scores are computed on the server per request (explicit `now`).
// The team layer (spec §10) gets its data through TeamProvider. Until the privacy review
// (TEAM_NETWORK_REAL_ENABLED=false) only the sample sends a team; real dossiers get the notice.
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
    const t = await getT();
    return (
      <Nis
        kind="empty"
        headingLevel={1}
        title={t("No stakeholders on the map yet")}
        desc={t("Research hasn't placed anyone yet. Follow its progress on the market page.")}
        actions={[{ label: t("See research progress"), href: `/d/${d.id}` }]}
      />
    );
  }
  const model = buildMapModel(d, new Date());
  return (
    <TeamProvider data={teamData(d)}>
      <MapView model={model} tracker={d.tracker} />
    </TeamProvider>
  );
}

function teamData(d: Dossier): TeamData {
  const team = d.isSample;
  const edges = d.edges.filter((e) => e.status === "sourced" && e.sourceIds.length > 0);
  const cited = new Set([...edges.flatMap((e) => e.sourceIds), ...d.introDrafts.flatMap((x) => x.sourceIds)]);
  return {
    dossierId: d.id,
    isSample: d.isSample,
    client: { company: d.company, product: d.product },
    base: team ? { team: d.team, contacts: d.contacts, ties: d.ties, introDrafts: d.introDrafts } : { team: [], contacts: [], ties: [], introDrafts: [] },
    stakeholders: d.stakeholders.map((s) => ({ id: s.id, name: s.name, short: s.short, nameZh: s.nameZh, isChina: s.isChina })),
    aliases: d.aliases.map((a) => ({ alias: a.alias, stakeholderKey: a.stakeholderKey })),
    edges: team ? edges.map((e) => ({ aId: e.aId, bId: e.bId, relation: e.relation, sourceIds: e.sourceIds, status: e.status })) : [],
    sourceLabels: Object.fromEntries(d.sources.filter((s) => s.accepted && cited.has(s.id)).map((s) => [s.id, s.label])),
  };
}
