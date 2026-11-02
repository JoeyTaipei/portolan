import { LoadingState } from "@/components/shell/nis";
import { FormSkeleton } from "@/components/waitlist/form-skeleton";

// Waitlist loading (spec §12 "09 Waitlist").
export default function WaitlistLoading() {
  return <LoadingState label="Loading the waitlist…" skeleton={<div className="px-4 lg:px-12"><FormSkeleton /></div>} />;
}
