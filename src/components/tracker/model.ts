// View model for the tracker page: rows for the list and helpers shared by the cards. Support
// comes only from src/lib/scoring (via the flow), never computed here.
import type { Mark } from "@/components/map/model";
import { supportText } from "@/components/score/explain";
import { itemCategory, itemName, itemSupport, type TrackerState } from "@/lib/tracker/flow";
import type { SupportResult, TrackerItem } from "@/lib/types";

export interface RowVM {
  item: TrackerItem;
  name: string;
  mark: Mark;
  support: string;
}

function markFor(state: TrackerState, item: TrackerItem, s: SupportResult): Mark {
  const lead = state.leads.find((l) => l.id === item.leadId);
  if (lead?.type === "event" || itemCategory(state, item) === "evt") return "event";
  return s.kind === "unknown" ? "unknown" : s.stance;
}

/** Soonest due first; items with no due date after, in the order they were added. */
export function buildRows(state: TrackerState, now: Date): RowVM[] {
  return state.tracker
    .map((item) => {
      const s = itemSupport(state, item, now);
      return { item, name: itemName(state, item), mark: markFor(state, item, s), support: supportText(s) };
    })
    .sort((a, b) => {
      const da = a.item.dueDate ?? "9999";
      const db = b.item.dueDate ?? "9999";
      return da === db ? a.item.createdAt.localeCompare(b.item.createdAt) : da.localeCompare(db);
    });
}

/** "8 Nov" from "2026-11-08" (calendar date, no time-zone shift). */
export function fmtDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
