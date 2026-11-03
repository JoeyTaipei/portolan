import { getT } from "@/lib/i18n/server";
import "server-only";
import { aliasRows, refreshStakeholders } from "@/lib/db/dossiers";
import { getDb } from "@/lib/db/client";
import { isDossierId } from "@/lib/ids";
import { matchEntity } from "@/lib/research/refresh-match";
import { MatchCheck, type PendingMatch } from "./match-check";
import { ProgressClient } from "./progress-client";

// Engine-owned contract (plan P-10): the RES-1 progress screen and the refresh "Needs your
// check" list, both server entry points the ui lane renders.

export function ResearchProgress({ dossierId }: { dossierId: string }) {
  return <ProgressClient dossierId={dossierId} />;
}

/** Pending-check stakeholders from a refresh, each with the existing one it resembles (spec §7.6). */
export async function MatchCheckList({ dossierId }: { dossierId: string }) {
  if (!isDossierId(dossierId) || !getDb()) return null;
  let items: PendingMatch[];
  try {
    const [all, aliases] = await Promise.all([refreshStakeholders(dossierId), aliasRows(dossierId)]);
    const existing = all.filter((s) => s.status !== "pending_check");
    items = all
      .filter((s) => s.status === "pending_check")
      .flatMap((s) => {
        const m = matchEntity(s, existing, aliases);
        const other = m.kind === "new" ? null : existing.find((e) => e.id === m.existingId);
        return other
          ? [{ pendingId: s.id, pendingName: s.name, pendingNameZh: s.nameZh, existingId: other.id, existingName: other.name }]
          : [];
      });
  } catch (err) {
    console.error(`[match-check] ${(err as Error).message}`);
    return null;
  }
  if (!items.length) return null;
  const t = await getT();
  return (
    <section aria-labelledby="match-h" className="flex flex-col gap-2 rounded-[var(--r-m)] border border-[var(--notice)] bg-panel p-3.5">
      <h2 id="match-h" className="m-0 text-[15px] font-bold">
        {t("Needs your check")}
      </h2>
      <p className="m-0 text-[13px] text-ink2">
        {items.length === 1
          ? t("The latest research found a name close to stakeholders already on your map. Until you decide, they show as Pending check and are left out of the scores.")
          : t("The latest research found {n} names close to stakeholders already on your map. Until you decide, they show as Pending check and are left out of the scores.", { n: items.length })}
      </p>
      <ul className="m-0 list-none p-0">
        {items.map((it) => (
          <MatchCheck key={it.pendingId} dossierId={dossierId} item={it} />
        ))}
      </ul>
    </section>
  );
}
