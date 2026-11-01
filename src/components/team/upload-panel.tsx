"use client";

import { useId, useMemo, useState } from "react";
import { matchContacts, orgTargets, type Matched, type ToConfirm } from "@/lib/team/match";
import { manualContact, parseContactFile, type ParsedContact } from "@/lib/team/parse";
import type { Contact, Tie } from "@/lib/types";
import { NO_STORAGE, useTeam } from "./team-context";

// TEAM-4 (spec §10.2–10.4): the member picks "This is me" and ticks the consent line, then
// uploads an export or types "I know X at Y". The file is parsed and matched here in the
// browser; only contacts at an organisation on the map are kept (names never shown), close
// matches wait for a yes/no, everything else is dropped and never stored.

const CONSENT = "This is my own export, and I agree to share these work connections with this dossier's team only.";

type Pending = ToConfirm & { key: string };

export function UploadPanel() {
  const team = useTeam()!;
  const uid = useId();
  const eligible = team.state.team.filter((m) => m.status !== "withdrawn");
  const [me, setMe] = useState(eligible.find((m) => m.status === "invited")?.id ?? eligible[0]?.id ?? "");
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"file" | "manual">("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [manual, setManual] = useState({ name: "", org: "", title: "", how: "", strength: "1" });
  const targets = useMemo(() => orgTargets(team.data.stakeholders, team.data.aliases), [team.data.stakeholders, team.data.aliases]);
  const ready = !!me && consent;

  /** Add matched contacts as redacted contacts + ties, and mark the member connected. */
  function store(found: Matched[], how: (c: ParsedContact) => string, strength: Tie["strength"]): boolean {
    const now = new Date().toISOString();
    const contacts: Contact[] = [];
    const ties: Tie[] = [];
    for (const m of found) {
      const id = `ct-${crypto.randomUUID()}`;
      // The sample keeps no names (always redacted); China keeps no title or URL either (match.ts).
      contacts.push({ id, memberId: me, name: null, title: m.contact.title, orgText: m.contact.orgText, linkedinUrl: m.contact.linkedinUrl, origin: m.contact.origin, createdAt: now });
      ties.push({ id: `tie-${crypto.randomUUID()}`, contactId: id, stakeholderId: m.stakeholderId, strength, how: how(m.contact), match: "similarity" in m ? "confirmed" : "exact", createdAt: now });
    }
    const s = team.state;
    return team.save({
      ...s,
      team: s.team.map((x) => (x.id === me ? { ...x, status: "connected", consentedAt: x.consentedAt ?? now } : x)),
      contacts: [...s.contacts, ...contacts],
      ties: [...s.ties, ...ties],
    });
  }

  const defaultHow = (c: ParsedContact) => (c.origin === "linkedin" ? "1st-degree LinkedIn" : "In contacts");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !ready) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const parsed = parseContactFile(new Uint8Array(await file.arrayBuffer()));
    setBusy(false);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const m = matchContacts(parsed.contacts, targets);
    if (!store(m.matched, defaultHow, 1)) {
      setError(NO_STORAGE);
      return;
    }
    setPending(m.toConfirm.map((x, i) => ({ ...x, key: `${i}-${x.stakeholderId}` })));
    setResult(
      `Read ${parsed.contacts.length} contacts. ${m.matched.length} work at an organisation on the map and were added; ${m.toConfirm.length} need your check; ${m.discarded} didn't match and were dropped.`,
    );
  }

  function onManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const c = manualContact({ name: manual.name, org: manual.org, title: manual.title });
    if (!c) {
      setError("Write the person's name and organisation.");
      return;
    }
    const m = matchContacts([c], targets);
    const strength = Number(manual.strength) as Tie["strength"];
    const how = () => manual.how.trim().slice(0, 200) || "Know each other";
    if (m.matched.length) {
      if (!store(m.matched, how, strength)) return setError(NO_STORAGE);
      setResult(`Added a tie at ${team.name(m.matched[0].stakeholderId)}.`);
    } else if (m.toConfirm.length) {
      setPending([{ ...m.toConfirm[0], key: "manual" }]);
    } else {
      setResult(`No organisation on the map matches "${c.orgText}", so nothing was kept.`);
    }
    setManual({ name: "", org: "", title: "", how: "", strength: "1" });
  }

  function answer(p: Pending, yes: boolean) {
    if (yes && !store([p], defaultHow, 1)) return setError(NO_STORAGE);
    setPending((xs) => xs.filter((x) => x.key !== p.key));
  }

  const field = "min-h-10 w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2 text-[14px]";

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-2.5 rounded-[var(--r-m)] border border-rule bg-panel p-3">
      <h3 id={`${uid}-h`} className="m-0 text-[14px] font-bold">
        Add your connections
      </h3>
      <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
        This is me
        <select value={me} onChange={(e) => setMe(e.target.value)} className={field}>
          {eligible.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-[12.5px] leading-[1.4]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 flex-none accent-[var(--ink)]" />
        {CONSENT}
      </label>

      <div role="group" aria-label="How to add" className="grid grid-cols-2 gap-1">
        {(["file", "manual"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="btn btn-ghost btn-s aria-pressed:bg-[var(--tile-on)] aria-pressed:text-[var(--tile-on-ink)]">
            {m === "file" ? "Upload a file" : "I know someone"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-f`} className={`btn btn-main btn-s ${ready && !busy ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!ready}>
            {busy ? "Reading…" : "Choose a file"}
          </label>
          <input id={`${uid}-f`} type="file" accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard" className="sr-only" disabled={!ready || busy} onChange={onFile} />
          <p className="m-0 text-[12px] text-ink2">LinkedIn Connections.csv, Google Contacts CSV or vCard, up to 2 MB. Read in this browser; emails and phone numbers are dropped.</p>
          {!ready && <p className="m-0 text-[12px] font-semibold">Pick yourself and tick the box first.</p>}
        </div>
      ) : (
        <form onSubmit={onManual} className="flex flex-col gap-1.5">
          <input aria-label="Their name" placeholder="Their name" value={manual.name} maxLength={200} onChange={(e) => setManual({ ...manual, name: e.target.value })} className={field} />
          <input aria-label="Organisation" placeholder="Organisation" value={manual.org} maxLength={200} onChange={(e) => setManual({ ...manual, org: e.target.value })} className={field} />
          <input aria-label="Title (optional)" placeholder="Title (optional)" value={manual.title} maxLength={200} onChange={(e) => setManual({ ...manual, title: e.target.value })} className={field} />
          <input aria-label="How you know each other" placeholder="How you know each other" value={manual.how} maxLength={200} onChange={(e) => setManual({ ...manual, how: e.target.value })} className={field} />
          <label className="flex items-center justify-between gap-2 text-[12.5px] font-semibold">
            Strength
            <select value={manual.strength} onChange={(e) => setManual({ ...manual, strength: e.target.value })} className={`${field} w-auto`}>
              <option value="1">1 · know of each other</option>
              <option value="2">2 · worked together</option>
              <option value="3">3 · close</option>
            </select>
          </label>
          <button type="submit" className="btn btn-main btn-s" disabled={!ready}>
            Add tie
          </button>
          <p className="m-0 text-[12px] text-ink2">Their name is never shown; it&apos;s only used to match the organisation.</p>
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 text-[12.5px] text-[var(--res-text)]">
          {error}
        </p>
      )}
      {result && (
        <p role="status" className="m-0 text-[12.5px]">
          {result}
        </p>
      )}
      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="m-0 text-[13px] font-bold">Confirm matches</h4>
          {pending.map((p) => (
            <div key={p.key} className="flex flex-col gap-1 rounded-[var(--r-m)] border border-rule bg-panel2 p-2 text-[12.5px]">
              <span>
                &ldquo;{p.contact.orgText}&rdquo; is <b>{team.name(p.stakeholderId)}</b>?
              </span>
              <span className="flex gap-1.5">
                <button type="button" className="btn btn-main btn-s" onClick={() => answer(p, true)}>
                  Same
                </button>
                <button type="button" className="btn btn-ghost btn-s" onClick={() => answer(p, false)}>
                  Different
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
