"use client";

import { useT } from "@/lib/i18n/client";
import type { Contact, Tie } from "@/lib/types";
import { Redacted, Strength, useTeam } from "./team-context";

// TEAM-5 and TEAM-6: a list of ties, either one member's (all their organisations) or one
// organisation's ("Who knows someone here"). Names are always redaction bars; then title, how
// they know each other, strength ●●○ and a LinkedIn ↗ link when there is one.

export interface TieRow {
  tie: Tie;
  contact: Contact;
  memberName: string;
}

export function TieList({ rows, by, onAsk }: { rows: TieRow[]; by: "member" | "org"; onAsk?: (row: TieRow) => void }) {
  const team = useTeam()!;
  const t = useT();
  // China is organisation level: no title or name, just "1 contact".
  const china = new Set(team.data.stakeholders.filter((s) => s.isChina).map((s) => s.id));
  if (rows.length === 0) return <p className="m-0 text-[13px] text-ink2">{t("No ties here yet.")}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.tie.id} className="border-t border-rule py-2 text-[13px] leading-[1.4] first:border-t-0" data-testid="tie-row">
          <p className="m-0 flex flex-wrap items-center gap-x-1.5">
            {by === "org" ? <b>{r.memberName}</b> : <b>{team.name(r.tie.stakeholderId)}</b>}
            <span className="text-ink2">{t("knows")}</span>
            {china.has(r.tie.stakeholderId) ? (
              <span className="text-ink2">{t("1 contact")}</span>
            ) : (
              <>
                <Redacted />
                {r.contact.title && <span className="text-ink2">· {r.contact.title}</span>}
              </>
            )}
          </p>
          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink2">
            <Strength n={r.tie.strength} />
            <span>{t.k(r.tie.how)}</span>
            {r.contact.linkedinUrl && (
              <a href={r.contact.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[var(--link)]">
                LinkedIn ↗
              </a>
            )}
          </p>
          {onAsk && (
            <button type="button" className="mt-1 min-h-9 border-0 bg-transparent px-0 text-[12.5px] font-semibold text-[var(--link)] underline underline-offset-2" onClick={() => onAsk(r)}>
              {t("Ask {name} for an intro", { name: r.memberName })}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Ties joined with their contact and member, active members only. */
export function tieRows(team: NonNullable<ReturnType<typeof useTeam>>, filter: (t: Tie, c: Contact) => boolean): TieRow[] {
  const contacts = new Map(team.state.contacts.map((c) => [c.id, c]));
  const members = new Map(team.state.team.map((m) => [m.id, m]));
  return team.state.ties.flatMap((t) => {
    const c = contacts.get(t.contactId);
    const m = c && members.get(c.memberId);
    if (!c || !m || m.status !== "connected" || !filter(t, c)) return [];
    return [{ tie: t, contact: c, memberName: m.name }];
  });
}
