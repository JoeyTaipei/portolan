import { Suspense } from "react";
import { DossierShell } from "@/components/shell/dossier-shell";
import { LoadingState, StatePreview } from "@/components/shell/nis";
import { loadDossier } from "@/lib/db/load-dossier";
import { SAMPLE_DOSSIER_ID, SAMPLE_VN_ID } from "@/lib/ids";

// Every /d/[id] page: the shell, the sample bar on the sample, and a 404 for any id that
// doesn't open a dossier (malformed ids return before any database call).

export async function generateStaticParams() {
  return [{ id: SAMPLE_DOSSIER_ID }, { id: SAMPLE_VN_ID }];
}

export default function DossierLayout({ children, params }: LayoutProps<"/d/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="frame">
          <LoadingState />
        </div>
      }
    >
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ params, children }: Pick<LayoutProps<"/d/[id]">, "params" | "children">) {
  const { id } = await params;
  const dossier = await loadDossier(id);
  // Unknown ids still get the shell; each page calls notFound() so its 404 renders inside it.
  return (
    <DossierShell dossierId={dossier?.id ?? null} isSample={dossier?.isSample ?? false}>
      {dossier ? (
        <Suspense fallback={children}>
          <StatePreview>{children}</StatePreview>
        </Suspense>
      ) : (
        children
      )}
    </DossierShell>
  );
}
