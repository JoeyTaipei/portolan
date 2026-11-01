import { LoadingState } from "@/components/shell/nis";

// Map loading: same three-column frame as the map page, so nothing jumps when it arrives.
export function MapSkeleton() {
  return (
    <LoadingState
      label="Placing stakeholders…"
      skeleton={
        <div
          aria-hidden="true"
          className="grid gap-4 px-4 pb-6 lg:grid-cols-[290px_minmax(0,1fr)_380px] lg:px-6 min-[1600px]:grid-cols-[320px_minmax(0,1fr)_440px]"
        >
          <div className="flex flex-col gap-3">
            <div className="skel h-16" />
            <div className="skel h-11" />
            <div className="skel h-24" />
          </div>
          <div className="skel min-h-[350px] lg:min-h-[420px]" />
          <div className="flex flex-col gap-3">
            <div className="skel h-44" />
            <div className="skel h-64" />
          </div>
        </div>
      }
    />
  );
}
