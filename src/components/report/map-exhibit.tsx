import { getT } from "@/lib/i18n/server";
import { NodeShape } from "@/components/map/node-mark";
import { FLOOR_Y, project, round, type Point3 } from "@/components/map/project";
import type { Mark } from "@/components/map/model";
import type { ReportVM } from "./model";

// REP-5: the stakeholder map at one fixed angle (same project() as the live map), with the
// three zones, the dashed contact-first route with yellow halos, "Exhibit 1" + a takeaway, and the source line.

const W = 262;
const H = 188;
const ANGLE = 0.5;
const at = (o: Point3) => project(o, ANGLE, W, H, 0.42, 0.58);

function floor(r: number): string {
  let d = "";
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const p = at({ x: Math.cos(t) * r, y: FLOOR_Y, z: Math.sin(t) * r });
    d += `${i ? "L" : "M"}${p.x},${p.y}`;
  }
  return `${d}Z`;
}

const LEGEND: { mark: Mark; label: string }[] = [
  { mark: "supportive", label: "Supportive" },
  { mark: "neutral", label: "Neutral" },
  { mark: "resistant", label: "Resistant" },
  { mark: "unknown", label: "Unknown" },
];

export async function MapExhibit({ exhibit, takeaway }: { exhibit: ReportVM["exhibit"]; takeaway: string }) {
  const t = await getT();
  const pos = new Map(exhibit.nodes.map((n) => [n.id, at(n)]));
  // Paper backdrop: one fine ellipse with ticks (no sea or depth), as on the live map.
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return {
      p1: at({ x: Math.cos(a), y: FLOOR_Y, z: Math.sin(a) }),
      p2: at({ x: Math.cos(a) * 1.06, y: FLOOR_Y, z: Math.sin(a) * 1.06 }),
    };
  });
  const route = exhibit.route
    .map((id) => pos.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
    .join("");
  // The contact-first three carry their order number (as in the table), so names never pile
  // up at this small size.
  const order = new Map(exhibit.route.map((id, i) => [id, i + 1]));
  const drawn = [...exhibit.nodes].sort((a, b) => pos.get(b.id)!.z - pos.get(a.id)!.z);

  return (
    <figure className="rp-mini">
      <p className="ex">
        <span>{t("Exhibit {n}", { n: 1 })}</span>
        {takeaway}
      </p>
      <svg className="map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Stakeholder map at a fixed angle")}>
        <path className="pm-gEll" d={floor(1)} />
        {ticks.map((k, i) => (
          <line key={i} className="pm-gTk" x1={k.p1.x} y1={k.p1.y} x2={k.p2.x} y2={k.p2.y} />
        ))}
        {exhibit.edges.map((e) => {
          const a = pos.get(e.a);
          const b = pos.get(e.b);
          return a && b ? <line key={`${e.a}-${e.b}`} className="pm-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} opacity={0.25} /> : null;
        })}
        {route && <path className="pm-route" d={route} />}
        {drawn.map((n) => {
          const p = pos.get(n.id)!;
          const r = round((2.8 + (n.influence ?? 25) * 0.05) * p.f, 10);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              {order.has(n.id) && <circle className="pm-hl" r={r + 4} />}
              <NodeShape mark={n.mark} r={r} />
              {order.has(n.id) && (
                <text className="lbl" x={r + 2} y={-r - 1}>
                  {order.get(n.id)}
                </text>
              )}
            </g>
          );
        })}
        <text className="zone" x={8} y={13}>
          {t("Government")}
        </text>
        <text className="zone" x={W - 8} y={13} textAnchor="end">
          {t("Industry")}
        </text>
        <text className="zone" x={W / 2} y={H - 5} textAnchor="middle">
          {t("Capital and legal")}
        </text>
      </svg>
      <figcaption>
        {LEGEND.map((l) => (
          <span key={l.mark}>
            <svg viewBox="-7 -7 14 14" aria-hidden="true">
              <NodeShape mark={l.mark} r={5} />
            </svg>
            {t.k(l.label)}
          </span>
        ))}
        <span>{t("Size = influence. Dashed route 1–3 = contact first.")}</span>
        <span>{t("Source: Portolan analysis of {n} sources", { n: exhibit.sourceCount })}</span>
      </figcaption>
    </figure>
  );
}
