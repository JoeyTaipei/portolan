import { LoadingState } from "@/components/shell/nis";

// Home loading: card skeleton in the three-column frame (spec §12 01 states).
export default function HomeLoading() {
  return <LoadingState label="Loading dossiers…" />;
}
