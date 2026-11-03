"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTeam } from "@/components/team/team-context";
import { useT } from "@/lib/i18n/client";
import { TeamLayer } from "@/components/team/team-layer";
import { TeamPanel } from "@/components/team/team-panel";
import type { Category } from "@/lib/types";
import { LABEL_THRESHOLD } from "@/lib/scoring/influence";
import type { NodeVM } from "./model";
import { NodeShape } from "./node-mark";
import { FLOOR_Y, nodeRadius, project } from "./project";
import { useSize } from "./use-size";
import { s } from "./marks";

// MAP-3/4/5/11: SVG pseudo-3D map. Auto-rotates (paused under reduced motion and while the
// pointer is over it or a node is selected), drag or ← → to rotate, click a node to focus it,
// click again or Esc to clear. The contact-first three are joined by a dashed route.
// TEAM-1: the "Your team" switch lives here because the team layer exists only in 3D; with it on,
// the team layer is drawn over the map and the team panel sits beside it (spec §10.5).

export interface MapControls {
  paused: boolean;
  setPaused: (p: boolean) => void;
  rotate: (d: number) => void;
}

const SPEED = 0.00024;

function floorEllipse(rr: number, ang: number, W: number, H: number) {
  let d = "";
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const p = project({ x: Math.cos(t) * rr, y: FLOOR_Y, z: Math.sin(t) * rr }, ang, W, H);
    d += `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return `${d}Z`;
}

export function InfluenceMap({
  nodes,
  edges,
  route,
  filter,
  selected,
  onSelect,
  controlsRef,
  onPausedChange,
}: {
  nodes: NodeVM[];
  edges: { a: string; b: string }[];
  route: string[];
  filter: Category | "all";
  selected: string | null;
  onSelect: (id: string | null) => void;
  controlsRef: React.MutableRefObject<MapControls | null>;
  onPausedChange: (paused: boolean) => void;
}) {
  const [hostRef, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [ang, setAng] = useState(0.6);
  const [paused, setPausedState] = useState(false);
  const [hover, setHover] = useState(false);
  const drag = useRef<{ x: number; y: number; lx: number; id: string | null; member: string | null; moved: boolean } | null>(null);
  const team = useTeam();
  const t = useT();

  // Reduced motion: paused by default (MAP-3).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPausedState(true);
  }, []);

  useEffect(() => {
    onPausedChange(paused);
  }, [paused, onPausedChange]);

  useEffect(() => {
    controlsRef.current = {
      paused,
      setPaused: setPausedState,
      rotate: (d) => setAng((a) => a + d),
    };
  }, [paused, controlsRef]);

  // Animation loop. Stops when hidden (Activity runs this cleanup) and when not rotating.
  const spinning = !paused && !hover && !selected && !team?.memberId;
  useEffect(() => {
    if (!spinning) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      if (!drag.current) setAng((a) => a + dt * SPEED);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning]);

  const linked = useMemo(() => {
    const out = new Set<string>();
    if (!selected) return out;
    for (const e of edges) {
      if (e.a === selected) out.add(e.b);
      if (e.b === selected) out.add(e.a);
    }
    return out;
  }, [edges, selected]);

  const pts = new Map(nodes.map((n) => [n.id, project(n, ang, W, H)]));
  const inF = (n: NodeVM) => filter === "all" || n.category === filter;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order = [...nodes].sort((a, b) => pts.get(b.id)!.z - pts.get(a.id)!.z);

  // Backdrop: one fine ellipse with ticks on paper (direction.md: no sea, land or depth).
  const routePts = route.map((id) => pts.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const g = (e.target as Element).closest?.("[data-id]");
    const m = (e.target as Element).closest?.("[data-member]");
    drag.current = { x: e.clientX, y: e.clientY, lx: e.clientX, id: g?.getAttribute("data-id") ?? null, member: m?.getAttribute("data-member") ?? null, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // some browsers refuse capture on synthetic events
    }
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) d.moved = true;
    if (d.moved) setAng((a) => a + (e.clientX - d.lx) * 0.012);
    d.lx = e.clientX;
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved && d.member && team) {
      team.setMemberId(team.memberId === d.member ? null : d.member);
      return;
    }
    if (d && !d.moved) {
      team?.setMemberId(null);
      onSelect(d.id && d.id === selected ? null : d.id);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-2.5 lg:flex-1 lg:flex-row">
      <div
        ref={hostRef}
        className={`${s.stage} lg:min-w-0`}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <svg
          className={s.svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t("Stakeholder map. Drag or use the left and right arrow keys to rotate, click a stakeholder for details. The full list is beside the map.")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
        >
          <g aria-hidden="true">
            <path className={s.gEll} d={floorEllipse(1, ang, W, H)} />
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const p1 = project({ x: Math.cos(a), y: FLOOR_Y, z: Math.sin(a) }, ang, W, H);
              const p2 = project({ x: Math.cos(a) * 1.06, y: FLOOR_Y, z: Math.sin(a) * 1.06 }, ang, W, H);
              return <line key={i} className={s.gTk} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
            })}
            {!selected && routePts.length > 1 && (
              <path
                className={s.route}
                d={routePts.map((p, k) => `${k ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("")}
              />
            )}
          </g>
          <g aria-hidden="true">
            {edges.map((e) => {
              const a = byId.get(e.a);
              const b = byId.get(e.b);
              const pa = pts.get(e.a);
              const pb = pts.get(e.b);
              if (!a || !b || !pa || !pb) return null;
              const hot = !!selected && (e.a === selected || e.b === selected);
              const vis = inF(a) && inF(b) && (!selected || hot);
              return (
                <line
                  key={`${e.a}-${e.b}`}
                  className={hot ? s.edgeHot : s.edge}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  opacity={vis ? (hot ? 1 : 0.22) : 0.05}
                />
              );
            })}
          </g>
          <g>
            {order.map((n) => {
              const p = pts.get(n.id)!;
              const r = nodeRadius(n.influence?.score ?? null);
              const rank = route.indexOf(n.id);
              const isSel = selected === n.id;
              const lk = linked.has(n.id);
              const on = inF(n);
              const dim = !on || (!!selected && !isSel && !lk);
              const showLabel =
                on && (isSel || (selected ? lk : (n.influence?.score ?? 0) >= LABEL_THRESHOLD || rank >= 0));
              const right = p.x > W - 130;
              const dashed = n.status === "still_researching" || n.status === "pending_check";
              return (
                <g
                  key={n.id}
                  data-id={n.id}
                  data-testid="map-node"
                  className={`${s.node} ${dim ? s.dim : ""} ${isSel ? s.selected : ""}`}
                  transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}
                >
                  <title>{n.short}</title>
                  <g className={s.shape} transform={`scale(${p.f.toFixed(3)})`}>
                    {(rank >= 0 || isSel) && <circle className={s.hl} r={r + 7} />}
                    <NodeShape mark={n.mark} r={r} dashed={dashed} />
                    {rank >= 0 && (
                      <text className={s.recN} x={-r - 6} y={-r - 3} textAnchor="end">
                        {rank + 1}
                      </text>
                    )}
                    {/* larger invisible hit target */}
                    <circle r={Math.max(r + 4, 10)} fill="transparent" />
                  </g>
                  {showLabel && (
                    <text
                      className={s.label}
                      dy="0.35em"
                      x={(right ? -1 : 1) * (r * p.f + 5)}
                      textAnchor={right ? "end" : "start"}
                    >
                      {n.short}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          <TeamLayer pts={pts} ang={ang} W={W} H={H} selected={selected} />
        </svg>
        {team && (
          <button
            type="button"
            role="switch"
            aria-checked={team.on}
            onClick={() => {
              team.setOn(!team.on);
              team.setMemberId(null);
            }}
            className="absolute top-2.5 right-2.5 flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-m)] border-2 border-ink bg-panel px-3 text-[13.5px] font-semibold text-ink"
          >
            <span aria-hidden="true" className={`relative h-[18px] w-8 rounded-full border border-rule-strong ${team.on ? "bg-[var(--hi)]" : "bg-panel2"}`}>
              <span className={`absolute top-[1px] size-[14px] rounded-full bg-panel ring-1 ring-[var(--rule-strong)] transition-[left] ${team.on ? "left-[15px]" : "left-[1px]"}`} />
            </span>
            {t("Your team")}
          </button>
        )}
        <span className={s.hint}>
          {selected ? t("Press Esc or click it again to show all.") : t("Drag to rotate, click a stakeholder.")}
        </span>
      </div>
      <TeamPanel selected={selected} />
    </div>
  );
}
