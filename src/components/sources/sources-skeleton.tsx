import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

export function SourcesSkeleton() {
  return (
    <LoadingState
      label={<Both k="Loading sources…" />}
      skeleton={
        <div aria-hidden="true" className="grid gap-4 px-4 pb-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
          <div className="flex flex-col gap-3">
            <div className="skel h-16" />
            <div className="skel h-11" />
            <div className="skel h-11" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="skel h-40" />
            <div className="skel h-40" />
          </div>
        </div>
      }
    />
  );
}
