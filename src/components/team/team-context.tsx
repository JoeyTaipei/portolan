"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { OVERLAY_EVENT, readOverlay, writeOverlay } from "@/lib/sample/overlay";
import type { PathEdge, PathTie } from "@/lib/team/warm-path";
import type { TeamState } from "@/lib/team/withdraw";
import type { SampleOverlay } from "@/lib/types";

// Team network state for the map (spec §10). The map page provides it; the 3D map draws the
// layer and the team panel from it. Until a lawyer signs off (TEAM_NETWORK_REAL_ENABLED=false)
// only the sample has a team, and every change there stays in this browser (SHELL-3): uploads
// are parsed and matched here and never sent anywhere.

export interface TeamData {
  dossierId: string;
  isSample: boolean;
  client: { company: string; product: string };
  base: TeamState;
  stakeholders: { id: string; name: string; short: string | null; nameZh: string | null; isChina: boolean }[];
  aliases: { alias: string; stakeholderKey: string }[];
  /** Sourced organisation edges only. */
  edges: PathEdge[];
  sourceLabels: Record<string, string>;
}

interface TeamCtx {
  data: TeamData;
  state: TeamState;
  on: boolean;
  setOn: (on: boolean) => void;
  memberId: string | null;
  setMemberId: (id: string | null) => void;
  /** Store the whole team state (sample: this browser only). False when storage is blocked. */
  save: (next: TeamState) => boolean;
  active: ReadonlySet<string>;
  pathTies: PathTie[];
  name: (stakeholderId: string) => string;
}

const Ctx = createContext<TeamCtx | null>(null);

export const ILLUSTRATIVE = "Illustrative — not a real connection";
export const NO_STORAGE = "This browser won't save changes. Allow site storage and try again.";

function withOverlay(base: TeamState, o: SampleOverlay | null): TeamState {
  if (!o) return base;
  return { team: o.team ?? base.team, contacts: o.contacts ?? base.contacts, ties: o.ties ?? base.ties, introDrafts: o.introDrafts ?? base.introDrafts };
}

export function TeamProvider({ data, children }: { data: TeamData; children: ReactNode }) {
  const params = useSearchParams();
  const [on, setOn] = useState(params.get("team") === "1");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<SampleOverlay | null>(null);

  useEffect(() => {
    if (!data.isSample) return;
    const read = () => setOverlay(readOverlay());
    read();
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [data.isSample]);

  const state = useMemo(() => (data.isSample ? withOverlay(data.base, overlay) : data.base), [data.isSample, data.base, overlay]);

  const value = useMemo<TeamCtx>(() => {
    const active = new Set(state.team.filter((m) => m.status === "connected").map((m) => m.id));
    const byContact = new Map(state.contacts.map((c) => [c.id, c.memberId]));
    const pathTies: PathTie[] = state.ties.flatMap((t) => {
      const m = byContact.get(t.contactId);
      return m ? [{ id: t.id, memberId: m, contactId: t.contactId, stakeholderId: t.stakeholderId, strength: t.strength }] : [];
    });
    const names = new Map(data.stakeholders.map((s) => [s.id, s.short ?? s.name]));
    return {
      data,
      state,
      on,
      setOn,
      memberId,
      setMemberId,
      save: (next) =>
        data.isSample &&
        writeOverlay("team", next.team) &&
        writeOverlay("contacts", next.contacts) &&
        writeOverlay("ties", next.ties) &&
        writeOverlay("introDrafts", next.introDrafts),
      active,
      pathTies,
      name: (id) => names.get(id) ?? "this organisation",
    };
  }, [data, state, on, memberId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Null outside the map page (the provider is only there). */
export function useTeam(): TeamCtx | null {
  return useContext(Ctx);
}

/** ●●○ for strength 2 of 3, with the number for screen readers. */
export function Strength({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="whitespace-nowrap tracking-[.08em] text-[var(--act-text)]" aria-label={`Tie strength ${n} of 3`}>
      {"●".repeat(n)}
      <span className="text-rule">{"●".repeat(3 - n)}</span>
    </span>
  );
}

/** Contact names are never shown: a solid bar with an accessible label. */
export function Redacted() {
  return <span className="ins-redact" role="img" aria-label="name withheld" />;
}
