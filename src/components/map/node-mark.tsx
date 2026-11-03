import { STANCE_LABEL } from "@/components/score/explain";
import { BothX } from "@/lib/i18n/client";
import type { Mark } from "./model";
import { s } from "./marks";

// Estimate stance marks (direction.md), shared by the map, matrix, list and legend. Fill, not
// colour, carries stance so a black-and-white print still reads: solid ink = supportive,
// hollow = neutral, 45° hatch (#hatch in the root layout) = resistant, hollow diamond = event,
// grey dashed hollow = Unknown.

export function NodeShape({ mark, r, dashed = false }: { mark: Mark; r: number; dashed?: boolean }) {
  const extra = dashed ? ` ${s.pending}` : "";
  if (mark === "event")
    return (
      <rect
        className={s.evt + extra}
        x={-r * 0.75}
        y={-r * 0.75}
        width={r * 1.5}
        height={r * 1.5}
        transform="rotate(45)"
        vectorEffect="non-scaling-stroke"
      />
    );
  const cls = mark === "supportive" ? s.sup : mark === "resistant" ? s.res : mark === "unknown" ? s.unk : s.neu;
  return <circle className={cls + (mark === "unknown" ? "" : extra)} r={r * 0.9} vectorEffect="non-scaling-stroke" />;
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
