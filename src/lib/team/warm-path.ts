// Warm paths (spec §10.5 TEAM-7, docs/scoring.md §5): at most 2 hops — you → teammate →
// contact at organisation A → target B, where A–B is a sourced edge. A tie straight into B is
// one hop. Ranked by tie strength, then the number of sources on A–B (a direct tie needs no
// edge and counts as best), then path length. Withdrawn members' ties never count.

export interface PathTie {
  id: string;
  memberId: string;
  contactId: string;
  stakeholderId: string;
  strength: 1 | 2 | 3;
}

export interface PathEdge {
  aId: string;
  bId: string;
  relation: string;
  sourceIds: string[];
  status: "sourced" | "unverified";
}

export interface WarmPath {
  memberId: string;
  tieId: string;
  /** Organisation where the contact works (A). Equals `target` for a direct tie. */
  via: string;
  target: string;
  hops: 1 | 2;
  strength: 1 | 2 | 3;
  /** Sources on the A–B edge; empty for a direct tie. */
  edgeSourceIds: string[];
  relation: string | null;
}

export function warmPaths(target: string, ties: PathTie[], edges: PathEdge[], activeMembers: ReadonlySet<string>): WarmPath[] {
  const live = ties.filter((t) => activeMembers.has(t.memberId));
  const out: WarmPath[] = [];
  for (const t of live) {
    if (t.stakeholderId === target) {
      out.push({ memberId: t.memberId, tieId: t.id, via: target, target, hops: 1, strength: t.strength, edgeSourceIds: [], relation: null });
      continue;
    }
    for (const e of edges) {
      if (e.status !== "sourced" || e.sourceIds.length === 0) continue;
      const other = e.aId === t.stakeholderId ? e.bId : e.bId === t.stakeholderId ? e.aId : null;
      if (other !== target) continue;
      out.push({ memberId: t.memberId, tieId: t.id, via: t.stakeholderId, target, hops: 2, strength: t.strength, edgeSourceIds: e.sourceIds, relation: e.relation });
    }
  }
  const sources = (p: WarmPath) => (p.hops === 1 ? Infinity : p.edgeSourceIds.length);
  return out.sort((a, b) => b.strength - a.strength || sources(b) - sources(a) || a.hops - b.hops);
}

/** Every stakeholder reachable within 2 hops (for the +15 contact-first bonus). */
export function warmTargets(ties: PathTie[], edges: PathEdge[], activeMembers: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const t of ties) {
    if (!activeMembers.has(t.memberId)) continue;
    out.add(t.stakeholderId);
    for (const e of edges) {
      if (e.status !== "sourced" || e.sourceIds.length === 0) continue;
      if (e.aId === t.stakeholderId) out.add(e.bId);
      if (e.bId === t.stakeholderId) out.add(e.aId);
    }
  }
  return out;
}
