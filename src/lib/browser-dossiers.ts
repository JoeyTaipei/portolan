// Dossiers this browser has opened (HOME-7). Risky change: a dossier id is the only key to a
// dossier, so anyone using this browser can read this list. Only the id, the name and when it was
// last opened are stored (never an email), and the list is never sent anywhere as a whole.
// The sample is never stored: it is always listed. Every storage access is wrapped.
import { isSampleId } from "@/lib/ids";

const KEY = "portolan.dossiers";
const MAX = 20;

export interface RememberedDossier {
  id: string;
  name: string;
  openedAt: string;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRemembered(v: unknown): v is RememberedDossier {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.name === "string" && typeof r.openedAt === "string";
}

/** Most recently opened first. */
export function listDossiers(): RememberedDossier[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const parsed: unknown = JSON.parse(ls.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRemembered)
      .map(({ id, name, openedAt }) => ({ id, name, openedAt }))
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  } catch {
    return [];
  }
}

function save(list: RememberedDossier[]): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage full or blocked: the list is a convenience only
  }
}

export function rememberDossier(id: string, name: string): void {
  if (isSampleId(id)) return;
  const rest = listDossiers().filter((d) => d.id !== id);
  save([{ id, name, openedAt: new Date().toISOString() }, ...rest]);
}

export function forgetDossier(id: string): void {
  save(listDossiers().filter((d) => d.id !== id));
}
