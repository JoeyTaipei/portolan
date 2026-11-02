import { STANCE_LABEL } from "@/components/score/explain";
import { BothX } from "@/lib/i18n/client";
import type { Mark } from "./model";
import { s } from "./marks";

// Chart-buoy stance marks (direction.md), shared by the map, matrix, chart, list and legend:
// cone = supportive, square = resistant, hollow circle = neutral, diamond = event,
// grey dashed hollow circle = Unknown. Never colour alone.

export function NodeShape({ mark, r, dashed = false }: { mark: Mark; r: number; dashed?: boolean }) {
  const extra = dashed ? ` ${s.pending}` : "";
  if (mark === "supportive")
    return (
      <path
        className={s.sup + extra}
        d={`M0,${(-r * 1.15).toFixed(1)}L${r.toFixed(1)},${(r * 0.8).toFixed(1)}L${(-r).toFixed(1)},${(r * 0.8).toFixed(1)}Z`}
        vectorEffect="non-scaling-stroke"
      />
    );
  if (mark === "resistant")
    return <rect className={s.res + extra} x={-r * 0.85} y={-r * 0.85} width={r * 1.7} height={r * 1.7} vectorEffect="non-scaling-stroke" />;
  if (mark === "event")
    return (
      <rect
        className={s.evt + extra}
        x={-r * 0.7}
        y={-r * 0.7}
        width={r * 1.4}
        height={r * 1.4}
        transform="rotate(45)"
        vectorEffect="non-scaling-stroke"
      />
    );
  if (mark === "unknown") return <circle className={s.unk} r={r * 0.9} vectorEffect="non-scaling-stroke" />;
  return <circle className={s.neu + extra} r={r * 0.9} vectorEffect="non-scaling-stroke" />;
}

/** 15px mark for lists and the legend, with the stance word beside it where `withText`. */
export function MarkIcon({ mark, withText = false }: { mark: Mark; withText?: boolean }) {
  return (
    <>
      <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="shrink-0 overflow-visible">
        <NodeShape mark={mark} r={6} />
      </svg>
      {withText && (
        <span>
          <BothX en={STANCE_LABEL[mark]} />
        </span>
      )}
    </>
  );
}
