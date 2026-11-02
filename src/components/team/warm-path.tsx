"use client";

import { useT } from "@/lib/i18n/client";
import { useState } from "react";
import { IntroForm } from "@/components/network/intro-form";
import { readOverlay, writeOverlay } from "@/lib/sample/overlay";
import type { ActionResult, IntroRequest } from "@/lib/types";
import { warmPaths, type WarmPath } from "@/lib/team/warm-path";
import { NO_STORAGE, Strength, useTeam } from "./team-context";

// TEAM-7: the best warm path to the selected organisation (at most 2 hops over sourced edges),
// spelled out and drawn on the map; "Ask Mei to start the intro" opens the draft. TEAM-8: no
// path → "Request a Portolan expert intro" (the NET-6 form; on the sample it stays local).
export function WarmPathCard({ target, onDraft }: { target: string; onDraft: (p: WarmPath) => void }) {
  const team = useTeam()!;
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState(false);
  const t = useT();
  const paths = warmPaths(target, team.pathTies, team.data.edges, team.active);
  const best = paths[0];
  const name = team.name(target);

  async function request(purpose: string): Promise<ActionResult<unknown>> {
    const row: IntroRequest = { id: `intro-${crypto.randomUUID()}`, dossierId: team.data.dossierId, stakeholderId: target, purpose, status: "received", resultNote: null, createdAt: new Date().toISOString() };
    const ok = writeOverlay("intros", [...(readOverlay().intros ?? []), row]);
    if (ok) {
      setSent(true);
      setAsking(false);
    }
    return ok ? { ok: true, data: null } : { ok: false, error: t.k(NO_STORAGE) };
  }

  if (!best) {
    return (
      <section aria-label={t("Warm path")} className="flex flex-col gap-2 rounded-[var(--r-m)] border border-dashed border-rule-strong bg-panel p-3 text-[13px]">
        <p className="m-0">{t("No warm path from your team to {name} yet.", { name })}</p>
        {sent ? (
          <p role="status" className="m-0 font-semibold">
            {t("Request received — we'll update your tracker.")}
          </p>
        ) : asking ? (
          <IntroForm name={name} onSend={request} onCancel={() => setAsking(false)} />
        ) : (
          <button type="button" className="btn btn-ghost btn-s self-start" onClick={() => setAsking(true)}>
            {t("Request a Portolan expert intro")}
          </button>
        )}
      </section>
    );
  }

  const member = team.state.team.find((m) => m.id === best.memberId)?.name ?? t("your teammate");
  const via = team.name(best.via);
  const cites = best.edgeSourceIds.map((id) => team.data.sourceLabels[id]).filter(Boolean);
  return (
    <section aria-label={t("Warm path")} className="flex flex-col gap-2 rounded-[var(--r-m)] border-l-4 border-[var(--route)] bg-panel p-3 text-[13px]" data-testid="warm-path">
      <p className="m-0 font-bold">{t("Warm path to {name}", { name })}</p>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0 leading-[1.4]">
        <li>{t("You → {name}", { name: member })}</li>
        <li>
          {t("→ someone {member} knows at {via}", { member, via })} <Strength n={best.strength} />
        </li>
        {best.hops === 2 && (
          <li>
            → {name}: {best.relation}
            {cites.length > 0 && <span className="text-ink2"> {cites.map((l) => `[${l}]`).join(" ")}</span>}
          </li>
        )}
      </ol>
      {paths.length > 1 && <p className="m-0 text-[12px] text-ink2">{t(paths.length > 2 ? "{n} more paths, ranked lower by tie strength and sources." : "{n} more path, ranked lower by tie strength and sources.", { n: paths.length - 1 })}</p>}
      <button type="button" className="btn btn-act btn-s self-start" onClick={() => onDraft(best)}>
        {t("Ask {name} to start the intro", { name: member })}
      </button>
    </section>
  );
}
