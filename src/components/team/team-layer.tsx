"use client";

import { project, type Projected } from "@/components/map/project";
import { warmPaths } from "@/lib/team/warm-path";
import { useTeam } from "./team-context";

// TEAM-2 layer on the 3D map: teammates in the centre (white fill, --act border; invited is
// dashed), dashed lines to each organisation where they know someone (width = tie strength).
// A selected member keeps only their lines; a selected organisation with a warm path shows the
// whole path in --route (TEAM-7). Members carry data-member so a click selects them, not a node.

const RING = 0.16;
const HEIGHT = -0.35;

export function TeamLayer({ pts, ang, W, H, selected }: { pts: Map<string, Projected>; ang: number; W: number; H: number; selected: string | null }) {
  const team = useTeam();
  if (!team?.on || !team.data.isSample) return null;
  const members = team.state.team.filter((m) => m.status !== "withdrawn");
  const at = new Map(
    members.map((m, i) => {
      const a = (i / Math.max(1, members.length)) * Math.PI * 2;
      return [m.id, project({ x: Math.cos(a) * RING, y: HEIGHT, z: Math.sin(a) * RING }, ang, W, H)];
    }),
  );
  const best = selected ? warmPaths(selected, team.pathTies, team.data.edges, team.active)[0] : undefined;
  const focus = team.memberId;

  return (
    <g data-testid="team-layer">
      <g aria-hidden="true">
        {team.pathTies.map((t) => {
          const a = at.get(t.memberId);
          const b = pts.get(t.stakeholderId);
          if (!a || !b) return null;
          const dim = (focus && focus !== t.memberId) || (best && best.tieId !== t.id);
          return (
            <line
              key={t.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--act)"
              strokeWidth={0.8 + t.strength * 0.8}
              strokeDasharray="4 3"
              opacity={dim ? 0.12 : 0.75}
            />
          );
        })}
        {best &&
          (() => {
            const m = at.get(best.memberId);
            const v = pts.get(best.via);
            const t = pts.get(best.target);
            if (!m || !v || !t) return null;
            const d = best.hops === 1 ? `M${m.x},${m.y}L${t.x},${t.y}` : `M${m.x},${m.y}L${v.x},${v.y}L${t.x},${t.y}`;
            return <path d={d} fill="none" stroke="var(--route)" strokeWidth={3} strokeLinejoin="round" data-testid="warm-path-line" />;
          })()}
      </g>
      {members.map((m) => {
        const p = at.get(m.id)!;
        const isSel = focus === m.id;
        return (
          <g key={m.id} data-member={m.id} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" opacity={focus && !isSel ? 0.45 : 1}>
            <title>{`${m.name} (${m.status === "invited" ? "invited" : "teammate"})`}</title>
            <circle r={isSel ? 10 : 8.5} fill="var(--panel)" stroke="var(--act)" strokeWidth={isSel ? 3 : 2} strokeDasharray={m.status === "invited" ? "3 2" : undefined} />
            <text y="0.35em" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--act-text)" pointerEvents="none">
              {m.name.charAt(0)}
            </text>
            <text y={-14} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)" stroke="var(--halo)" strokeWidth={3} paintOrder="stroke" pointerEvents="none">
              {m.name}
            </text>
            <circle r={14} fill="transparent" />
          </g>
        );
      })}
    </g>
  );
}
