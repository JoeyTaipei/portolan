"use client";

import { useT } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolveMatch } from "@/app/actions/research";

// "Needs your check" after a refresh (spec §7.6): a new result looks like an existing
// stakeholder but the names aren't equal. The user decides; nothing is merged on a guess.
// "Same as X" keeps X (its debriefs, tracker items and ties) and remembers the name as an
// alias; "Different" adds the node to the map as its own stakeholder.

export interface PendingMatch {
  pendingId: string;
  pendingName: string;
  pendingNameZh: string | null;
  existingId: string;
  existingName: string;
}

export function MatchCheck({ dossierId, item }: { dossierId: string; item: PendingMatch }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const t = useT();

  const decide = (same: boolean) =>
    start(async () => {
      setError(null);
      const r = await resolveMatch(
        dossierId,
        item.pendingId,
        same ? { same: true, existingStakeholderId: item.existingId } : { same: false },
      );
      if (!r.ok) {
        setError(t.x(r.error));
        return;
      }
      setDone(same ? t("Kept as {name}.", { name: item.existingName }) : t("Added {name} as a new stakeholder.", { name: item.pendingName }));
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-2 border-t border-rule py-2.5 text-[13.5px] last:border-b">
      <p className="m-0">
        <span className="font-semibold">{item.pendingName}</span>
        {item.pendingNameZh && <span className="text-ink2"> ({item.pendingNameZh})</span>} {t("looks like")}{" "}
        <span className="font-semibold">{item.existingName}</span>.
      </p>
      {done ? (
        <p role="status" className="m-0 text-ink2">
          {done}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-s" disabled={pending} onClick={() => decide(true)}>
            {t("Same as {name}", { name: item.existingName })}
          </button>
          <button type="button" className="btn btn-ghost btn-s" disabled={pending} onClick={() => decide(false)}>
            {t("Different")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-[13px] font-bold text-[var(--res-text)]">
          {error}
        </p>
      )}
    </li>
  );
}
