// Pseudo-3D projection from design/directions/color-admiralty/02-map.html: rotate around the
// vertical axis, tilt 0.38, then perspective f = 2.8 / (2.8 + z). No three.js.

export const TILT = 0.38;
/** Sea floor height in model units (soundings sit here under each node). */
export const FLOOR_Y = 0.8;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface Projected {
  x: number;
  y: number;
  z: number;
  f: number;
}

export function project(o: Point3, ang: number, W: number, H: number, radius = 0.38, cyRatio = 0.56): Projected {
  const cx = W / 2;
  const cy = H * cyRatio - 4;
  const R = Math.min(W, H) * radius;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  const x1 = o.x * ca + o.z * sa;
  const z1 = -o.x * sa + o.z * ca;
  const y2 = o.y * ct - z1 * st;
  const z2 = o.y * st + z1 * ct;
  const f = 2.8 / (2.8 + z2);
  return { x: cx + x1 * R * f, y: cy + y2 * R * f, z: z2, f };
}

/** Node radius from influence (mockup: 3.5 + infl × 0.07); unscored nodes get the base size. */
export function nodeRadius(influence: number | null): number {
  return 3.5 + (influence ?? 25) * 0.07;
}

/** Depth band 1–3 from the influence level; null = no sounding. */
export function depthBand(level: "High" | "Medium" | "Low" | null): 1 | 2 | 3 | null {
  return level === "High" ? 3 : level === "Medium" ? 2 : level === "Low" ? 1 : null;
}
