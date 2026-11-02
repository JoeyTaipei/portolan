import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

// Documents loading: the same three columns as the page (320 | 1fr | 340, ≥1600 360 | 1fr | 400).
export function DocsSkeleton() {
  return (
    <LoadingState
      label={<Both k="Loading your documents…" />}
      skeleton={
        <div aria-hidden="true" className="grid gap-4 px-4 pb-6 lg:grid-cols-[320px_minmax(0,1fr)_340px] lg:px-6 min-[1600px]:grid-cols-[360px_minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-3">
            <div className="skel h-10 w-2/3" />
            <div className="skel h-11" />
            <div className="skel h-24" />
          </div>
          <div className="grid gap-3 min-[1360px]:grid-cols-2">
            <div className="skel h-[180px]" />
            <div className="skel h-[180px]" />
          </div>
          <div className="skel min-h-[300px]" />
        </div>
      }
    />
  );
}
