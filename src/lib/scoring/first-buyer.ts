// docs/scoring.md §9: the most likely first buyer, by a fixed code rule (Joey 2026-11-02).
// Claude writes the routes (BRIEF-12); it never picks or changes the buyer.
import type { ForeignAccess, MoneyStatus, ProcurementRoute, TimedEvent } from "@/lib/types";
import { DEADLINE_KINDS, taipeiDay } from "./metrics";

/** Higher is stronger; an amount counts only with both a date and a status. */
const MONEY_RANK: Record<MoneyStatus, number> = { open_tender: 4, awarded: 4, passed: 3, in_committee: 2, proposed: 1 };
const ACCESS_RANK: Record<ForeignAccess, number> = { direct: 2, via_local_partner: 1, unclear: 0, no: -1 };
/** §9 step 5: domestic tender, police and critical infrastructure, NCSIST, FMS, DCS. */
const ROUTE_ORDER = ["domestic_tender", "police_ci", "ncsist", "fms", "dcs"] as const;

/** An amount the screens may show: it has a date and a status. */
export function datedMoney(r: Pick<ProcurementRoute, "money">): (ProcurementRoute["money"] & { asOf: string; status: MoneyStatus }) | null {
  const m = r.money;
  return m && m.asOf && m.status && m.sourceIds.length > 0 ? (m as ProcurementRoute["money"] & { asOf: string; status: MoneyStatus }) : null;
}

export interface FirstBuyer {
  route: ProcurementRoute;
  buyerId: string;
  /** Next sourced deadline for this buyer, if any. */
  deadline: { title: string; date: string; sourceIds: string[] } | null;
}

/**
 * §9: routes a foreign firm can use (access not "no") whose buyer is a Government stakeholder on
 * the map; ranked by money status, access, nearest deadline, buyer influence, then route order.
 */
export function firstBuyer(args: {
  routes: ProcurementRoute[];
  govOnMap: ReadonlySet<string>;
  influence: ReadonlyMap<string, number>;
  events: TimedEvent[];
  now: Date;
}): FirstBuyer | null {
  const today = taipeiDay(args.now);
  const deadlineFor = (id: string) =>
    args.events
      .filter((e) => e.status === "sourced" && e.sourceIds.length > 0 && DEADLINE_KINDS.has(e.kind) && e.date && e.date.slice(0, 10) >= today && e.stakeholderIds.includes(id))
      .sort((a, b) => a.date!.localeCompare(b.date!))
      .map((e) => ({ title: e.title, date: e.date!.slice(0, 10), sourceIds: e.sourceIds }))[0] ?? null;
  const cands = args.routes
    .filter((r): r is ProcurementRoute & { buyerId: string } => r.access !== "no" && r.buyerId !== null && args.govOnMap.has(r.buyerId) && r.sourceIds.length > 0)
    .map((r) => ({ route: r, buyerId: r.buyerId, deadline: deadlineFor(r.buyerId) }));
  const money = (c: (typeof cands)[number]) => {
    const m = datedMoney(c.route);
    return m ? MONEY_RANK[m.status] : 0;
  };
  cands.sort(
    (a, b) =>
      money(b) - money(a) ||
      ACCESS_RANK[b.route.access] - ACCESS_RANK[a.route.access] ||
      (a.deadline?.date ?? "9999").localeCompare(b.deadline?.date ?? "9999") ||
      (args.influence.get(b.buyerId) ?? -1) - (args.influence.get(a.buyerId) ?? -1) ||
      ROUTE_ORDER.indexOf(a.route.route) - ROUTE_ORDER.indexOf(b.route.route),
  );
  return cands[0] ?? null;
}
