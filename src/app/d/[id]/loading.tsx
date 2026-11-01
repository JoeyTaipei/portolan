import { LoadingState } from "@/components/shell/nis";

// Dossier overview loading: card skeleton, then "Still loading…" after 8 seconds.
export default function DossierLoading() {
  return <LoadingState />;
}
