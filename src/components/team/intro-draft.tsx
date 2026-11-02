"use client";

import type { T } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { useState } from "react";
import type { WarmPath } from "@/lib/team/warm-path";
import { ILLUSTRATIVE, useTeam } from "./team-context";

// TEAM-9: an intro draft the teammate sends themselves. Only "Copy draft" and "Close": Portolan
// never sends messages. The sample shows its pre-written drafts; for other paths it fills a
// fixed template with the sourced edge (no model, no new facts). Real-dossier drafts (Opus)
// arrive with the server path after the privacy review.

function templateDraft(t: T, path: WarmPath, member: string, via: string, target: string, client: { company: string; product: string }): string {
  const lead =
    path.hops === 1
      ? t("I'm hoping to talk with the right person at {target}.", { target })
      : t("I understand {via} and {target} work together ({relation}).", { via, target, relation: (path.relation ?? "").toLowerCase() });
  return t(
    "Hi, I hope you're well. My team at {company} works on {product}. {lead} Would you be open to a short call, and to pointing me to the right person at {target} if that makes sense? Thanks, {member}",
    { company: client.company, product: client.product, lead, target, member },
  );
}

export function IntroDraft({ path, onClose }: { path: WarmPath; onClose: () => void }) {
  const team = useTeam()!;
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const t = useT();
  const member = team.state.team.find((m) => m.id === path.memberId);
  const contactId = team.pathTies.find((x) => x.id === path.tieId)?.contactId ?? null;
  const written = team.state.introDrafts.find((d) => d.memberId === path.memberId && d.targetStakeholderId === path.target && (!d.contactId || d.contactId === contactId));
  const text = written?.text ?? templateDraft(t, path, member?.name ?? "", team.name(path.via), team.name(path.target), team.data.client);
  const sources = (written?.sourceIds ?? path.edgeSourceIds).map((id) => team.data.sourceLabels[id]).filter(Boolean);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section aria-label={t("Intro draft")} className="flex flex-col gap-2 rounded-[var(--r-m)] border border-rule-strong bg-panel p-3" data-testid="intro-draft">
      <p className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-ink2">
        {t("Draft · your teammate sends it")}
        {team.data.isSample && <span className="rounded-[var(--r-s)] border border-rule px-1 font-semibold">{t.k(ILLUSTRATIVE)}</span>}
      </p>
      <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.5]">{text}</p>
      {sources.length > 0 && <p className="m-0 text-[12px] text-ink2">{t("Based on")} {sources.map((l) => `[${l}]`).join(" ")}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-main btn-s" onClick={copy} aria-live="polite">
          {copied === "copied" ? t("Copied") : t("Copy draft")}
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={onClose}>
          {t("Close")}
        </button>
      </div>
      {copied === "failed" && <p className="m-0 text-[12px] text-ink2">{t("Couldn't copy. Select the text above and copy it.")}</p>}
    </section>
  );
}
