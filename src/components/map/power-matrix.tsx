"use client";

import { quadrant } from "@/lib/scoring/ranking";
import type { NodeVM } from "./model";
import { MarkIcon, NodeShape } from "./node-mark";
import { nodeRadius } from "./project";
import { useSize } from "./use-size";
import { s } from "./marks";

// MAP-6: x = support −100…+100, y = influence; three depth bands (deepest on top); quadrants
// from docs/scoring.md §5. Stakeholders with Unknown support or no influence sit beside it.

export function PowerMatrix({
  nodes,
  selected,
  onSelect,
}: {
  nodes: NodeVM[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const placed = nodes.filter((n) => quadrant({ id: n.id, influence: n.influence, support: n.support }) !== null);
  const beside = nodes.filter((n) => !placed.includes(n));
  const px = 34;
  const py = 26;
  const bt = H - py - 14;
  const x0 = W / 2;
  const y0 = py + (bt - py) / 2;
  const h3 = (bt - py) / 3;
  const pos = (n: NodeVM) => {
    const sup = n.support.kind === "known" ? n.support.score : 0;
    return {
      x: px + ((sup + 100) / 200) * (W - px * 2),
      y: py + (1 - (n.influence?.score ?? 0) / 100) * (bt - py),
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div ref={ref} className={s.stage} style={{ cursor: "default" }}>
        <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Power matrix: support from left to right, influence from bottom to top.">
          <g aria-hidden="true">
            <rect className={s.qb3} x={px} y={py} width={W - 2 * px} height={h3} />
            <rect className={s.qb2} x={px} y={py + h3} width={W - 2 * px} height={h3} />
            <rect className={s.qb1} x={px} y={py + 2 * h3} width={W - 2 * px} height={h3} />
            <line className={s.qLine} x1={x0} y1={py} x2={x0} y2={bt} />
            <line className={s.qLine} x1={px} y1={y0} x2={W - px} y2={y0} />
            <text className={s.qLabRes} x={px + 6} y={py + 15}>Blockers</text>
            <text className={s.qLabSup} x={W - px - 6} y={py + 15} textAnchor="end">Champions</text>
            <text className={s.qLab} x={px + 6} y={bt - 7}>Monitor</text>
            <text className={s.qLab} x={W - px - 6} y={bt - 7} textAnchor="end">Allies to grow</text>
            <text className={s.qAx} x={px} y={H - 8}>Support −100</text>
            <text className={s.qAx} x={x0} y={H - 8} textAnchor="middle">0</text>
            <text className={s.qAx} x={W - px} y={H - 8} textAnchor="end">+100</text>
            <text className={s.qAx} transform={`translate(14,${y0}) rotate(-90)`} textAnchor="middle">Influence</text>
          </g>
          {placed.map((n) => {
            const p = pos(n);
            const r = nodeRadius(n.influence?.score ?? null);
            const isSel = selected === n.id;
            const right = p.x > W - 130;
            return (
              <g
                key={n.id}
                data-id={n.id}
                data-testid="map-node"
                className={`${s.node} ${selected && !isSel ? s.dim : ""} ${isSel ? s.selected : ""}`}
                transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}
                onClick={() => onSelect(isSel ? null : n.id)}
              >
                <title>{n.short}</title>
                <g className={s.shape}>
                  <NodeShape mark={n.mark} r={r} />
                  <circle r={Math.max(r + 4, 10)} fill="transparent" />
                </g>
                {(isSel || (n.influence?.score ?? 0) >= 60) && (
                  <text className={s.label} dy="0.35em" x={(right ? -1 : 1) * (r + 5)} textAnchor={right ? "end" : "start"}>
                    {n.short}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {placed.length === 0 && (
          <p className={s.hint} style={{ bottom: "auto", top: "45%", textAlign: "center" }}>
            No stakeholder has both a sourced influence score and a sourced statement yet, so the matrix is empty.
          </p>
        )}
      </div>
      {beside.length > 0 && (
        <div className="text-[13px] text-ink2">
          <p className="m-0 mb-1 font-semibold text-ink">
            Not in the matrix: {beside.length} with Unknown support or no sourced influence
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
            {beside.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] text-ink underline-offset-2 hover:underline"
                  onClick={() => onSelect(n.id)}
                  aria-current={selected === n.id ? "true" : undefined}
                >
                  <MarkIcon mark={n.mark} />
                  {n.short}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
