import { LoadingState } from "@/components/shell/nis";
import { Both } from "@/lib/i18n/client";

// Brief loading: the same three columns as the brief, so nothing jumps when it arrives.
export function BriefSkeleton() {
  return (
    <LoadingState
      label={<Both k="Loading the strategy brief…" />}
      skeleton={
        <div
          aria-hidden="true"
          className="grid gap-4 px-4 pb-6 lg:grid-cols-[280px_minmax(0,1fr)_380px] lg:px-6 min-[1600px]:grid-cols-[300px_minmax(0,1fr)_440px]"
        >
          <div className="flex flex-col gap-3">
            <div className="skel h-28" />
            <div className="skel h-64" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="skel h-10 w-2/3" />
            <div className="skel h-48" />
            <div className="skel h-40" />
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
