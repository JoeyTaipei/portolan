"use client";

import { useId, useState } from "react";
import { clean } from "@/lib/team/parse";
import type { TeamMember } from "@/lib/types";
import { NO_STORAGE, useTeam } from "./team-context";

// TEAM-3 members: name, role, status (invited is a dashed frame, connected shows its ties,
// withdrawn says so) and "3 of 4 connected". "Add teammate" only creates an invited member:
// nobody can upload contacts for someone else.
export function MemberList() {
  const team = useTeam()!;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uid = useId();
  const members = team.state.team;
  const connected = members.filter((m) => m.status === "connected").length;
  const tieCount = (id: string) => {
    const mine = new Set(team.state.contacts.filter((c) => c.memberId === id).map((c) => c.id));
    return team.state.ties.filter((t) => mine.has(t.contactId)).length;
  };

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = clean(name);
    if (!n) {
      setError("Write the teammate's first name.");
      return;
    }
    const m: TeamMember = {
      id: `tm-${crypto.randomUUID()}`,
      dossierId: team.data.dossierId,
      name: n,
      role: clean(role) || null,
      status: "invited",
      consentedAt: null,
      withdrawnAt: null,
      createdAt: new Date().toISOString(),
    };
    if (!team.save({ ...team.state, team: [...members, m] })) {
      setError(NO_STORAGE);
      return;
    }
    setName("");
    setRole("");
    setAdding(false);
    setError(null);
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-2">
      <h3 id={`${uid}-h`} className="m-0 flex items-baseline justify-between text-[14px] font-bold">
        Teammates
        <span className="text-[12.5px] font-semibold text-ink2">
          <span className="num">{connected}</span> of <span className="num">{members.filter((m) => m.status !== "withdrawn").length}</span> connected
        </span>
      </h3>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => team.setMemberId(m.id)}
              disabled={m.status === "withdrawn"}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--r-m)] border bg-panel px-3 py-1.5 text-left disabled:cursor-default disabled:opacity-60 ${
                m.status === "invited" ? "border-dashed border-[var(--act)]" : "border-rule"
              }`}
            >
              <span>
                <b className="text-[14px]">{m.name}</b>
                {m.role && <span className="block text-[12px] text-ink2">{m.role}</span>}
              </span>
              <span className="text-[12px] text-ink2">
                {m.status === "connected" ? (
                  <>
                    <span className="num">{tieCount(m.id)}</span> {tieCount(m.id) === 1 ? "tie" : "ties"}
                  </>
                ) : m.status === "invited" ? (
                  "Invited"
                ) : (
                  "Withdrawn"
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="flex flex-col gap-2 rounded-[var(--r-m)] border border-rule bg-panel2 p-2.5">
          <label className="text-[12.5px] font-semibold" htmlFor={`${uid}-n`}>
            First name
          </label>
          <input id={`${uid}-n`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="min-h-10 rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2 text-[14px]" />
          <label className="text-[12.5px] font-semibold" htmlFor={`${uid}-r`}>
            Role (optional)
          </label>
          <input id={`${uid}-r`} value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} className="min-h-10 rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2 text-[14px]" />
          <p className="m-0 text-[12px] text-ink2">They&apos;re added as invited. Only they can add their own connections.</p>
          {error && (
            <p role="alert" className="m-0 text-[12.5px] text-[var(--res-text)]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-main btn-s">
              Add as invited
            </button>
            <button type="button" className="btn btn-ghost btn-s" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost btn-s self-start" onClick={() => setAdding(true)}>
          + Add teammate
        </button>
      )}
    </section>
  );
}
