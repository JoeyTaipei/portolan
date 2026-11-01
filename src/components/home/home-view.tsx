import Link from "next/link";
import { Suspense } from "react";
import { Exhibit } from "@/components/score/exhibit";
import { PickFirstNotice } from "@/components/shell/pick-first";
import { AlertCard } from "./alert-card";
import { BrandBar } from "./brand-bar";
import { DossierCard } from "./dossier-card";
import { DossierSelect } from "./dossier-select";
import { HomeFrame } from "./home-frame";
import { KeyJudgments } from "./key-judgments";
import type { HomeModel } from "./model";
import { QuickNav } from "./quick-nav";
import { TaiwanChart } from "./taiwan-chart";
import { BIG } from "./taiwan-coast";

// Screen 01 Dossiers (`/` and `/d/[id]`). Phone order: brand → title → tiles → dossier card →
// key judgments → alerts → select dossier.

const col = "max-lg:contents lg:flex lg:min-h-0 lg:flex-col lg:gap-[22px] lg:overflow-y-auto lg:px-6 lg:pt-6 lg:pb-10 min-[1600px]:px-8";

export function HomeView({ m, sample }: { m: HomeModel; sample: { id: string; name: string; level: HomeModel["confidence"]["level"]; sources: number } }) {
  return (
    <HomeFrame>
      <div className={`${col} lg:border-r lg:border-rule-strong`}>
        <div className="flex flex-col gap-2 max-lg:order-1">
          <Suspense fallback={null}>
            <PickFirstNotice />
          </Suspense>
          <h1 className="sr-only">Portolan dossiers</h1>
          <BrandBar />
          {!m.isSample || (
            <Link href="/d/sample" className="btn btn-ghost mt-1 self-start">
              Open the sample dossier
            </Link>
          )}
        </div>
        <div className="max-lg:order-2">
          <QuickNav m={m} />
        </div>
        <div className="max-lg:order-6">
          <DossierSelect selectedId={m.id} sample={sample} />
        </div>
      </div>

      <div className="hidden lg:flex lg:min-h-0 lg:flex-col lg:p-6">
        <Exhibit
          n={1}
          className="min-h-0 flex-1"
          bodyClassName="flex-1 bg-[var(--water0)]"
          finding={
            m.placed.length > 0
              ? `${m.placed.length} of ${m.nav.mapTotal} stakeholders have a sourced address in Taiwan.`
              : "No stakeholder has a sourced address yet, so none are placed on the chart."
          }
          howToRead={
            <>
              Marks show stance: cone supportive, square resistant, circle neutral, diamond event. Click a mark to open it on
              the stakeholder map. Coastline simplified. Source: Portolan analysis of {m.counts.sources} sources
              {m.isSample ? ", sample data" : ""}.
            </>
          }
        >
          <div className="absolute inset-0">
            <TaiwanChart
              dossierId={m.id}
              placed={m.placed}
              bounds={BIG}
              w={600}
              h={760}
              rose={[119.75, 24.6]}
              roseR={46}
              label="Sketch chart of Taiwan with port names and the stakeholders that have a sourced address"
            />
          </div>
        </Exhibit>
      </div>

      <div className={`${col} lg:border-l lg:border-rule-strong`}>
        <div className="max-lg:order-3">
          <DossierCard m={m} />
        </div>
        <div className="max-lg:order-4">
          <KeyJudgments m={m} />
        </div>
        <div className="empty:hidden max-lg:order-5">
          <AlertCard m={m} />
        </div>
      </div>
    </HomeFrame>
  );
}
