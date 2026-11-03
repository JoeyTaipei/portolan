import Link from "next/link";
import { Suspense } from "react";
import { PickFirstNotice } from "@/components/shell/pick-first";
import { getT } from "@/lib/i18n/server";
import { AlertCard } from "./alert-card";
import { TAGLINE } from "./brand-bar";
import { ChartInset } from "./chart-inset";
import { DossierSelect } from "./dossier-select";
import { EvidencePanel } from "./evidence-panel";
import { KeyJudgments } from "./key-judgments";
import { MarketHeader } from "./market-header";
import type { HomeModel } from "./model";
import { NextMoves } from "./next-moves";
import { QuickNav } from "./quick-nav";

// Screen 01 Markets (`/` and `/d/[id]`), layout "Briefing room" (spec §12 01). Desktop: header +
// evidence, then next moves + side column. Phone order: header → evidence → next moves → key
// judgments → alert → chart inset → workspace → your markets.

export async function HomeView({ m, sample, atHome = false }: { m: HomeModel; atHome?: boolean; sample: { id: string; name: string; level: HomeModel["confidence"]["level"]; sources: number } }) {
  const t = await getT();
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-7 px-[18px] pt-[22px] pb-10 lg:gap-9 lg:px-10 lg:pt-9 lg:pb-14">
      <Suspense fallback={null}>
        <PickFirstNotice />
      </Suspense>
      {atHome && m.isSample && (
        <Link href="/d/sample" className="btn btn-ghost btn-s self-start">
          {t("Open the sample market")}
        </Link>
      )}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10 min-[1600px]:grid-cols-[minmax(0,1fr)_380px]">
        <MarketHeader m={m} />
        <EvidencePanel m={m} />
      </div>
      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 min-[1600px]:grid-cols-[minmax(0,1fr)_420px]">
        <NextMoves m={m} />
        <div className="flex flex-col gap-7">
          <div className="empty:hidden">
            <AlertCard m={m} />
          </div>
          <KeyJudgments m={m} />
          {/* MKT-1: the inset draws Taiwan's coast, so only Taiwan markets show it. */}
          {m.market === "TW" && <ChartInset m={m} />}
          <QuickNav m={m} />
          <div className="flex flex-col gap-2">
            <DossierSelect selectedId={m.id} sample={sample} />
            <p className="m-0 text-[13.5px] leading-[1.45] text-ink2">{t(TAGLINE)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
