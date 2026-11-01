import type { Credibility, Reliability, SourceType } from "@/lib/types";
import type { BasisEntry } from "@/lib/parallel/types";
import { checkCitation, cjkShare, hostOf, type EntityNames } from "./quality";
import { gradeSource } from "./reliability";

// The `sources` step (spec §7.2): Parallel Basis citations → sources with an S-label per dossier,
// the quality filter (§7.4) and a starting reliability grade (§7.5). Credibility starts at 6
// ("can't judge") until the rate step sets it with a reason.

export interface SourceDraft {
  label: string;
  url: string;
  title: string;
  publisher: string | null;
  sourceType: SourceType;
  excerpt: string;
  excerptLang: string;
  reliability: Reliability;
  credibility: Credibility;
  verifiedAt: string;
  accepted: boolean;
  rejectReason: string | null;
}

/** Sources already in this dossier, by `url \n excerpt`. */
export type KnownSources = Map<string, { label: string; accepted: boolean }>;

export const sourceKey = (url: string, excerpt: string) => `${url}\n${excerpt}`;

/** "S12" → 12; anything else → 0. */
export const labelNumber = (label: string) => (/^S(\d+)$/.exec(label) ? Number(label.slice(1)) : 0);

export interface BasisToSourcesResult {
  /** New rows to insert (accepted and rejected). */
  drafts: SourceDraft[];
  /** Accepted labels per Basis field ("role", "ties.0" …), new and reused. */
  byField: Map<string, string[]>;
  /** Every accepted label this entity can cite. */
  accepted: string[];
  nextLabel: number;
}

export function basisToSources(args: {
  basis: BasisEntry[];
  entity: EntityNames;
  officialUrl: string | null;
  /** YYYY-MM-DD: when Parallel verified the excerpts (the run's finish date). */
  verifiedAt: string;
  known: KnownSources;
  nextLabel: number;
}): BasisToSourcesResult {
  const drafts: SourceDraft[] = [];
  const byField = new Map<string, string[]>();
  const accepted = new Set<string>();
  let next = args.nextLabel;

  for (const b of args.basis) {
    for (const c of b.citations ?? []) {
      const excerpt = (c.excerpts ?? []).map((x) => x.trim()).filter(Boolean).join("\n\n");
      const url = c.url?.trim() ?? "";
      // Debriefs aside, a source needs a URL (DB check); a citation without one isn't stored.
      if (!url) continue;
      const key = sourceKey(url, excerpt);
      const q = checkCitation({ url, excerpt }, args.entity);
      const seen = args.known.get(key);
      let label: string | null = null;
      if (seen && (seen.accepted || !q.ok)) {
        label = seen.accepted && q.ok ? seen.label : null;
      } else {
        const grade = gradeSource(url, args.officialUrl);
        const d: SourceDraft = {
          label: `S${next++}`,
          url,
          title: c.title?.trim() || hostOf(url) || url,
          publisher: hostOf(url),
          sourceType: grade.sourceType,
          excerpt,
          excerptLang: cjkShare(excerpt) > 0.3 ? "zh" : "en",
          reliability: grade.reliability,
          credibility: 6,
          verifiedAt: args.verifiedAt,
          accepted: q.ok,
          rejectReason: q.ok ? null : q.reason,
        };
        drafts.push(d);
        args.known.set(key, { label: d.label, accepted: d.accepted });
        if (d.accepted) label = d.label;
      }
      if (label) {
        accepted.add(label);
        byField.set(b.field, [...new Set([...(byField.get(b.field) ?? []), label])]);
      }
    }
  }
  return { drafts, byField, accepted: [...accepted], nextLabel: next };
}
