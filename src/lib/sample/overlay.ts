// SHELL-3: writes on the sample stay in this browser (localStorage `portolan.sample.*`).
// Never sent to the server, never calls a paid API. Each changed collection is stored whole,
// so adds, edits and removals (Undo, withdrawal) all work by replacing the array.
// Every storage access is wrapped: private windows and blocked storage just mean "no overlay".
import type { Dossier, PlaybookOutcome, SampleOverlay, SampleOverlayKey } from "@/lib/types";

export const OVERLAY_PREFIX = "portolan.sample.";

export const OVERLAY_KEYS: readonly SampleOverlayKey[] = [
  "tracker",
  "debriefs",
  "statements",
  "sources",
  "leads",
  "documentRequests",
  "documents",
  "intros",
  "team",
  "contacts",
  "ties",
  "introDrafts",
];

type OverlayKey = SampleOverlayKey | "playbook";
type OverlayValue<K extends OverlayKey> = K extends SampleOverlayKey ? Dossier[K] : PlaybookOutcome[];

const ALL_KEYS: readonly OverlayKey[] = [...OVERLAY_KEYS, "playbook"];

/** Fired on window after any write or reset, so open components can re-read. */
export const OVERLAY_EVENT = "portolan:sample-overlay";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(OVERLAY_EVENT));
  } catch {
    // no window (tests, server)
  }
}

export function readOverlay(): SampleOverlay {
  const ls = storage();
  const out: SampleOverlay = {};
  if (!ls) return out;
  for (const key of ALL_KEYS) {
    try {
      const raw = ls.getItem(OVERLAY_PREFIX + key);
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) (out as Record<string, unknown>)[key] = parsed;
    } catch {
      // unreadable entry: ignore it and fall back to the fixture
    }
  }
  return out;
}

/** Store the whole collection. Returns false when the browser won't let us save. */
export function writeOverlay<K extends OverlayKey>(key: K, value: OverlayValue<K>): boolean {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(OVERLAY_PREFIX + key, JSON.stringify(value));
    notify();
    return true;
  } catch {
    return false;
  }
}

/** "Reset sample": drop every local change. */
export function resetOverlay(): void {
  const ls = storage();
  if (!ls) return;
  for (const key of ALL_KEYS) {
    try {
      ls.removeItem(OVERLAY_PREFIX + key);
    } catch {
      // ignore
    }
  }
  notify();
}

export function hasOverlay(overlay: SampleOverlay = readOverlay()): boolean {
  return Object.keys(overlay).length > 0;
}

/** The sample fixture with this browser's changes laid over it. */
export function applyOverlay(base: Dossier, overlay: SampleOverlay = readOverlay()): Dossier {
  const merged: Dossier = { ...base };
  for (const key of OVERLAY_KEYS) {
    const value = overlay[key];
    if (value) (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}
