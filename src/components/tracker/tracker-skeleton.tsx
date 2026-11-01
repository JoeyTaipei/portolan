import { LoadingState } from "@/components/shell/nis";

// Tracker loading: the same two columns as the page (1fr | 420, ≥1600 1fr | 480), so nothing jumps.
export function TrackerSkeleton() {
  return (
    <LoadingState
      label="Loading the tracker…"
      skeleton={
        <div aria-hidden="true" className="grid gap-4 px-4 pb-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6 min-[1600px]:grid-cols-[minmax(0,1fr)_480px]">
          <div className="flex flex-col gap-3">
            <div className="skel h-10 w-2/3" />
            <div className="skel h-[70px]" />
            <div className="skel h-20" />
            <div className="skel h-20" />
            <div className="skel h-20" />
          </div>
          <div className="skel min-h-[420px]" />
        </div>
      }
    />
  );
}
