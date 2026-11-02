"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useState } from "react";
import type { WarmPath } from "@/lib/team/warm-path";
import { IntroDraft } from "./intro-draft";
import { MemberList } from "./member-list";
import { ILLUSTRATIVE, useTeam } from "./team-context";
import { UploadPanel } from "./upload-panel";
import { WarmPathCard } from "./warm-path";
import { tieRows, TieList } from "./who-knows";
import { WithdrawDialog } from "./withdraw-dialog";

// The team panel beside the 3D map while the layer is on (spec §10.5). With an organisation
// selected: who knows someone there (TEAM-6), the warm path (TEAM-7/8) and its draft (TEAM-9).
// With a member selected: their ties (TEAM-5) and "Withdraw my connections". Otherwise the
// members (TEAM-3) and the upload (TEAM-4). Real dossiers: the privacy-review notice only.
export function TeamPanel({ selected }: { selected: string | null }) {
  const team = useTeam();
  const [draft, setDraft] = useState<WarmPath | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const t = useT();
  if (!team?.on) return null;

  if (!team.data.isSample) {
    return (
      <aside aria-label={t("Your team")} className="flex flex-col gap-2 rounded-[var(--r-l)] border border-dashed border-rule-strong bg-panel p-4 text-[13.5px] lg:w-[300px] lg:flex-none">
        <h2 className="m-0 text-[15px] font-bold">{t("Your team")}</h2>
        <p className="m-0 leading-[1.5]">{t("Team connections open after our privacy review. Try it on the sample.")}</p>
        <Link href="/d/sample/map?team=1" className="btn btn-ghost btn-s self-start">
          {t("Open the sample")}
        </Link>
      </aside>
    );
  }

  const member = team.memberId ? team.state.team.find((m) => m.id === team.memberId) : undefined;
  const isOrg = !!selected && team.data.stakeholders.some((s) => s.id === selected);

  let body: React.ReactNode;
  if (member) {
    const rows = tieRows(team, (_, c) => c.memberId === member.id);
    body = (
      <>
        <button type="button" className="min-h-9 self-start border-0 bg-transparent px-0 text-[13px] font-semibold text-[var(--link)] underline" onClick={() => team.setMemberId(null)}>
          {t("← All teammates")}
        </button>
        <h3 className="m-0 text-[15px] font-bold">
          {t("{name}'s ties", { name: member.name })} <span className="num font-semibold text-ink2">{rows.length}</span>
        </h3>
        <TieList rows={rows} by="member" />
        {member.status === "connected" && (
          <button type="button" className="btn btn-ghost btn-s self-start" onClick={() => setWithdrawing(true)}>
            {t("Withdraw my connections")}
          </button>
        )}
        {withdrawing && <WithdrawDialog memberId={member.id} name={member.name} onClose={() => setWithdrawing(false)} />}
      </>
    );
  } else if (isOrg) {
    const rows = tieRows(team, (x) => x.stakeholderId === selected);
    body = (
      <>
        <h3 className="m-0 text-[15px] font-bold">{t("Who knows someone at {name}", { name: team.name(selected!) })}</h3>
        <TieList rows={rows} by="org" />
        {draft && draft.target === selected ? (
          <IntroDraft path={draft} onClose={() => setDraft(null)} />
        ) : (
          <WarmPathCard target={selected!} onDraft={setDraft} />
        )}
      </>
    );
  } else {
    body = (
      <>
        <MemberList />
        <UploadPanel />
        <p className="m-0 text-[12px] text-ink2">{t("Click a teammate for their ties, or an organisation on the map to see who knows someone there.")}</p>
      </>
    );
  }

  return (
    <aside aria-label={t("Your team")} data-testid="team-panel" className="flex flex-col gap-3 rounded-[var(--r-l)] border border-rule-strong bg-panel2 p-3.5 lg:min-h-0 lg:w-[300px] lg:flex-none lg:overflow-y-auto min-[1600px]:w-[330px]">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h2 className="m-0 text-[15px] font-bold">{t("Your team")}</h2>
        <span className="rounded-[var(--r-s)] border border-[var(--act)] bg-panel px-1.5 text-[11.5px] font-bold text-[var(--act-text)]">{t.k(ILLUSTRATIVE)}</span>
      </div>
      {body}
    </aside>
  );
}
