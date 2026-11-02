"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { NodeShape } from "@/components/map/node-mark";
import { round } from "@/components/map/project";
import { s } from "@/components/map/marks";
import type { PlacedStakeholder } from "./model";
import { chartProj, COAST, PORTS, type Bounds } from "./taiwan-coast";

// Middle column chart (spec §12 01): fixed Taiwan outline, rhumb lines from a compass rose,
// shoal bands, and only the stakeholders with a sourced address. Clicking one opens the map
// with it selected.

function Rose({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`} aria-hidden="true">
      <circle r={r} className={s.roseRing} />
      <circle r={r * 0.82} className={s.roseRingThin} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8 - Math.PI / 2;
        const len = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.7 : r * 0.48;
        const w = i % 4 === 0 ? r * 0.12 : r * 0.07;
        const tx = Math.cos(a) * len;
        const ty = Math.sin(a) * len;
        const px = Math.cos(a + Math.PI / 2) * w;
        const py = Math.sin(a + Math.PI / 2) * w;
        return (
          <path
            key={i}
            className={i % 2 ? s.rosePtL : s.rosePt}
            d={`M${px.toFixed(1)},${py.toFixed(1)}L${tx.toFixed(1)},${ty.toFixed(1)}L${(-px).toFixed(1)},${(-py).toFixed(1)}Z`}
          />
        );
      })}
      <text className={s.roseN} y={-r - 5} textAnchor="middle">
        N
      </text>
    </g>
  );
}

export function TaiwanChart({
  dossierId,
  placed,
  bounds,
  w,
  h,
  rose,
  roseR,
  label,
}: {
  dossierId: string;
  placed: PlacedStakeholder[];
  bounds: Bounds;
  w: number;
  h: number;
  rose: [number, number];
  roseR: number;
  label: string;
}) {
  const router = useRouter();
  const t = useT();
  const pr = chartProj(bounds, w, h);
  const [rx, ry] = pr(rose[0], rose[1]);
  const coast = `M${COAST.map(([lon, lat]) => pr(lon, lat).map((v) => v.toFixed(1)).join(",")).join("L")}Z`;
  const L = Math.max(w, h) * 1.6;
  const inView = placed.filter((p) => p.lat >= bounds.lat0 && p.lat <= bounds.lat1 && p.lng >= bounds.lon0 && p.lng <= bounds.lon1);
  const open = (id: string) => router.push(`/d/${dossierId}/map?s=${encodeURIComponent(id)}`);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="group" aria-label={label} className="block h-full w-full">
      <g aria-hidden="true">
        {Array.from({ length: 32 }, (_, i) => {
          const a = (i * Math.PI) / 16;
          return (
            <line
              key={i}
              className={i % 4 === 0 ? s.chartRhumbMain : s.chartRhumb}
              x1={rx}
              y1={ry}
              x2={round(rx + Math.cos(a) * L, 10)}
              y2={round(ry + Math.sin(a) * L, 10)}
            />
          );
        })}
        <path className={s.shoal1} d={coast} />
        <path className={s.shoal2} d={coast} />
        <path className={s.land} d={coast} />
        {PORTS.filter((p) => p.lat >= bounds.lat0 && p.lat <= bounds.lat1).map((p) => {
          const [x, y] = pr(p.lon, p.lat);
          return (
            <g key={p.name}>
              <circle className={s.port} cx={x} cy={y} r={1.8} />
              <text className={s.portName} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${p.rot})`} x={5} dy="0.35em">
                {t.k(p.name)}
              </text>
            </g>
          );
        })}
        <Rose x={rx} y={ry} r={roseR} />
      </g>
      {inView.map((p, i) => {
        const [x, y] = pr(p.lng, p.lat);
        const left = i % 2 === 1;
        return (
          <g
            key={p.id}
            role="link"
            tabIndex={0}
            aria-label={t("{name}. Open on the stakeholder map", { name: `${p.short}${p.city ? `, ${p.city}` : ""}` })}
            className={s.placed}
            transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
            onClick={() => open(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") open(p.id);
            }}
          >
            <g className={s.shape}>
              <NodeShape mark={p.mark} r={6.5} />
              <circle r={12} fill="transparent" />
            </g>
            <text className={s.markL} x={left ? -9 : 9} y={4} textAnchor={left ? "end" : "start"}>
              {p.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
