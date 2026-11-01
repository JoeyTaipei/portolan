// Simplified Taiwan coastline (lon, lat), hand-traced in the design mockup to about 5 km.
// Good enough for a sketch chart, not for navigation.
export const COAST: [number, number][] = [
  [121.51, 25.3], [121.6, 25.26], [121.74, 25.15], [121.85, 25.1], [122.0, 25.01], [121.92, 24.9], [121.83, 24.8],
  [121.8, 24.7], [121.86, 24.6], [121.83, 24.45], [121.75, 24.3], [121.66, 24.1], [121.6, 23.95], [121.53, 23.7],
  [121.47, 23.45], [121.4, 23.2], [121.3, 23.0], [121.17, 22.78], [121.0, 22.6], [120.9, 22.35], [120.87, 22.1],
  [120.84, 21.92], [120.75, 21.95], [120.7, 22.05], [120.62, 22.3], [120.45, 22.48], [120.3, 22.6], [120.22, 22.8],
  [120.14, 23.0], [120.1, 23.2], [120.13, 23.45], [120.2, 23.7], [120.32, 23.95], [120.42, 24.15], [120.55, 24.35],
  [120.7, 24.6], [120.88, 24.8], [121.0, 24.95], [121.12, 25.05], [121.3, 25.12], [121.42, 25.18],
];

/** Reference ports, names written perpendicular to the coast. */
export const PORTS = [
  { name: "Keelung", lon: 121.74, lat: 25.13, rot: 90 },
  { name: "Taipei", lon: 121.52, lat: 25.04, rot: 0 },
  { name: "Taoyuan", lon: 121.12, lat: 25.05, rot: 38 },
  { name: "Hsinchu", lon: 120.92, lat: 24.82, rot: 30 },
  { name: "Taichung", lon: 120.52, lat: 24.27, rot: 22 },
  { name: "Kaohsiung", lon: 120.28, lat: 22.62, rot: -8 },
  { name: "Hualien", lon: 121.61, lat: 23.98, rot: -170 },
];

export interface Bounds {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
}

export const BIG: Bounds = { lon0: 119.0, lon1: 122.4, lat0: 21.75, lat1: 25.5 };
export const NORTH: Bounds = { lon0: 119.7, lon1: 122.2, lat0: 24.0, lat1: 25.45 };

/** Equirectangular with cos 24° so the island keeps its proportions. */
export function chartProj(b: Bounds, w: number, h: number) {
  const c = 0.914;
  const k = Math.min(w / ((b.lon1 - b.lon0) * c), h / (b.lat1 - b.lat0));
  const ox = (w - (b.lon1 - b.lon0) * c * k) / 2;
  const oy = (h - (b.lat1 - b.lat0) * k) / 2;
  return (lon: number, lat: number): [number, number] => [ox + (lon - b.lon0) * c * k, oy + (b.lat1 - lat) * k];
}
