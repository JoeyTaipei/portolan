import { DossierShell } from "@/components/shell/dossier-shell";
import { NotFoundState } from "@/components/shell/not-found-state";

// SHELL-2 404 for unknown dossier ids and any unmatched URL.
export default function NotFound() {
  return (
    <DossierShell dossierId={null} isSample={false}>
      <NotFoundState />
    </DossierShell>
  );
}
