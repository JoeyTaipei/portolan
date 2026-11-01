import Link from "next/link";
import { Suspense } from "react";
import { DossierShell } from "@/components/shell/dossier-shell";
import { StatePreview } from "@/components/shell/nis";
import { PickFirstNotice } from "@/components/shell/pick-first";

// Minimal home until S1 builds the Dossiers screen.
export default function Home() {
  return (
    <DossierShell dossierId={null} isSample={false}>
      <Suspense fallback={<HomeContent />}>
        <StatePreview>
          <HomeContent />
        </StatePreview>
      </Suspense>
    </DossierShell>
  );
}

function HomeContent() {
  return (
    <section className="flex max-w-[68ch] flex-col gap-4 px-[18px] py-10 lg:px-6">
      <Suspense fallback={null}>
        <PickFirstNotice />
      </Suspense>
      <p className="m-0 text-[13px] font-semibold text-ink2">Market entry intelligence</p>
      <h1 className="m-0 text-[50px] font-bold uppercase leading-[.95] tracking-[.02em] lg:text-[40px]">Portolan</h1>
      <p className="m-0 max-w-[34ch] text-[15.5px] text-ink2">
        Sourced stakeholder maps and briefs for entering a new market.
      </p>
      <Link className="btn btn-main self-start" href="/d/sample">
        Open the sample dossier
      </Link>
    </section>
  );
}
