// Power matrix labels: every placed stakeholder gets its name, and names that would collide
// (several stakeholders on the same spot) are moved up or down, or to the other side.

export interface LabelItem {
  id: string;
  x: number;
  y: number;
  r: number;
  text: string;
}

export interface LabelSpot {
  /** Text x, relative to the node. */
  dx: number;
  /** Text centre y, relative to the node. */
  dy: number;
  anchor: "start" | "end";
}

const CHAR = 6.6; // 11.5px bold
const LINE = 14;
const GAP = 5;

const width = (text: string) => text.length * CHAR;

export function labelBox(it: LabelItem, at: LabelSpot) {
  const tx = it.x + at.dx;
  const w = width(it.text);
  const x1 = at.anchor === "start" ? tx : tx - w;
  const cy = it.y + at.dy;
  return { x1, x2: x1 + w, y1: cy - LINE / 2, y2: cy + LINE / 2 };
}

export type Box = ReturnType<typeof labelBox>;
const hits = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/** `avoid`: areas no name may cover, such as the quadrant titles. */
export function placeLabels(items: LabelItem[], W: number, H: number, avoid: Box[] = []): Map<string, LabelSpot> {
  const out = new Map<string, LabelSpot>();
  const taken: Box[] = [...avoid];
  const dots = new Map(items.map((it) => [it.id, { x1: it.x - it.r, x2: it.x + it.r, y1: it.y - it.r, y2: it.y + it.r }]));
  const order = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of order) {
    const prefer: LabelSpot["anchor"] = it.x + it.r + GAP + width(it.text) > W ? "end" : "start";
    const sides: LabelSpot["anchor"][] = [prefer, prefer === "start" ? "end" : "start"];
    const shifts = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5].map((k) => k * LINE);
    let best: LabelSpot | null = null;
    search: for (const dy of shifts) {
      for (const anchor of sides) {
        const spot: LabelSpot = { dx: (anchor === "start" ? 1 : -1) * (it.r + GAP), dy, anchor };
        const b = labelBox(it, spot);
        if (b.x1 < 0 || b.x2 > W || b.y1 < 0 || b.y2 > H) continue;
        if (taken.some((t) => hits(t, b))) continue;
        if ([...dots].some(([id, d]) => id !== it.id && hits(d, b))) continue;
        best = spot;
        break search;
      }
    }
    // Crowded beyond repair: fall back to the plain spot rather than drop the name.
    const spot = best ?? { dx: (prefer === "start" ? 1 : -1) * (it.r + GAP), dy: 0, anchor: prefer };
    out.set(it.id, spot);
    taken.push(labelBox(it, spot));
  }
  return out;
}
