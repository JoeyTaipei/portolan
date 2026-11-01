// Withdrawal (spec §10.7; risky change): a member's contacts, ties and intro drafts go at once
// and the member becomes `withdrawn`. Pure, so the sample overlay and the server path use the
// same rule. Drafts already copied elsewhere can't be recalled; the dialog says so.
import type { Contact, IntroDraft, Tie, TeamMember } from "@/lib/types";

export interface TeamState {
  team: TeamMember[];
  contacts: Contact[];
  ties: Tie[];
  introDrafts: IntroDraft[];
}

export function withdrawMember(state: TeamState, memberId: string, now: Date): TeamState {
  const gone = new Set(state.contacts.filter((c) => c.memberId === memberId).map((c) => c.id));
  return {
    team: state.team.map((m) => (m.id === memberId ? { ...m, status: "withdrawn", withdrawnAt: now.toISOString() } : m)),
    contacts: state.contacts.filter((c) => !gone.has(c.id)),
    ties: state.ties.filter((t) => !gone.has(t.contactId)),
    introDrafts: state.introDrafts.filter((d) => d.memberId !== memberId && !(d.contactId && gone.has(d.contactId))),
  };
}
