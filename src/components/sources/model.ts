// The sources page: every accepted source (or, for a share link, only the ones the report
// cites), with what cites it. Rejected sources never appear here (plan S2 simpler version:
// no Rejected tab; rejects stay logged and on the research progress screen).
import { evidenceItem, fmtDay, SOURCE_TYPE_LABEL, type EvidenceVM } from "@/components/brief/model";
import type { Dossier, Fact, SourceType } from "@/lib/types";

export interface SourceRowVM extends EvidenceVM {
  sourceType: SourceType;
  stakeholderIds: string[];
  /** Plain lines: what this source backs up. Empty on share links. */
  facts: string[];
}

export interface SourcesVM {
  rows: SourceRowVM[];
  stakeholders: { id: string; name: string }[];
  types: { key: SourceType; label: string }[];
}

const FIELD_LABEL: Record<Fact["field"], string> = {
  title: "Title",
  role: "Role",
  mandate: "Mandate",
  head: "Head",
  authority: "Formal authority",
  budget: "Budget control",
  access: "Access to decision makers",
  recent: "Recent action",
  action: "Next step",
  address: "Address",
};

const show = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);

export function buildSourcesModel(d: Dossier, now: Date, opts: { only?: ReadonlySet<string>; withFacts: boolean }): SourcesVM {
  const nameOf = new Map(d.stakeholders.map((s) => [s.id, s.short ?? s.name]));
  const accepted = d.sources.filter((s) => s.accepted && (!opts.only || opts.only.has(s.id)));
  const rows = accepted.map((src): SourceRowVM => {
    const facts = d.facts.filter((f) => f.status === "sourced" && f.sourceIds.includes(src.id));
    const statements = d.statements.filter((s) => s.sourceId === src.id);
    const events = d.events.filter((e) => e.status === "sourced" && e.sourceIds.includes(src.id));
    const ids = new Set([...facts.map((f) => f.stakeholderId), ...statements.map((s) => s.stakeholderId)]);
    const lines = opts.withFacts
      ? [
          ...facts.map((f) => {
            const v = show(f.value);
            const what = f.rating !== null ? `${f.rating} of 3${v ? `: ${v}` : ""}` : (v ?? "");
            return `${nameOf.get(f.stakeholderId) ?? "Unknown"}. ${FIELD_LABEL[f.field]}: ${what}`;
          }),
          ...statements.map((s) => `${nameOf.get(s.stakeholderId) ?? "Unknown"}. Said or did: ${s.summary}`),
          ...events.map((e) => `Event: ${e.title}${e.date ? `, ${fmtDay(e.date)}` : ", date unverified"}`),
        ]
      : [];
    return { ...evidenceItem(src, d, now), sourceType: src.sourceType, stakeholderIds: [...ids], facts: lines };
  });
  const used = new Set(rows.flatMap((r) => r.stakeholderIds));
  const typeSet = new Set(rows.map((r) => r.sourceType));
  return {
    rows,
    stakeholders: d.stakeholders
      .filter((s) => used.has(s.id))
      .map((s) => ({ id: s.id, name: s.short ?? s.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    types: (Object.keys(SOURCE_TYPE_LABEL) as SourceType[]).filter((t) => typeSet.has(t)).map((t) => ({ key: t, label: SOURCE_TYPE_LABEL[t] })),
  };
}
