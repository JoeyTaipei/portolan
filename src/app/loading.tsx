import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

// Home loading: card skeleton in the three-column frame (spec §12 01 states).
export default function HomeLoading() {
  return <LoadingState label={<Both k="Loading markets…" />} />;
}
