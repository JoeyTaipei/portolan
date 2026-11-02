import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

// Network loading: the same three columns as the page (260 | 1fr | 360, ≥1600 280 | 1fr | 400).
export function NetworkSkeleton() {
  return (
    <LoadingState
      label={<Both k="Loading the network…" />}
      skeleton={
        <div aria-hidden="true" className="grid gap-4 px-4 pb-6 lg:grid-cols-[260px_minmax(0,1fr)_360px] lg:px-6 min-[1600px]:grid-cols-[280px_minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-3">
            <div className="skel h-10 w-2/3" />
            <div className="skel h-[150px]" />
            <div className="skel h-16" />
          </div>
          <div className="grid gap-3 min-[1360px]:grid-cols-2 min-[1800px]:grid-cols-3">
            <div className="skel h-[260px]" />
            <div className="skel h-[260px]" />
            <div className="skel h-[260px]" />
          </div>
          <div className="skel min-h-[300px]" />
        </div>
      }
    />
  );
}
