"use client";

import Link from "next/link";
import { STANCE_LABEL, influenceText, supportText } from "@/components/score/explain";
import { ScoreX } from "@/components/score/score-x";
import { Stamp } from "@/components/score/stamp";
import { AddToTrackerButton } from "@/components/tracker/add-button";
import type { TrackerItem } from "@/lib/types";
import { AddToTracker } from "./add-to-tracker";
import { CATEGORY_LABEL, type NodeVM } from "./model";
import { MarkIcon } from "./node-mark";

// MAP-9 details + MAP-10 recommended action. Add to tracker: the browser overlay on the sample,
// the tracker Server Action on real dossiers (S5). Unverified fields say Unverified; a stakeholder
// with no sourced next step says "Find a sourced contact route first" (never blank).

const STATUS_NOTE: Partial<Record<NodeVM["status"], string>> = {
  still_researching: "Still researching",
  pending_check: "Needs your check",
  not_found_latest: "Not found in the latest refresh",
  incomplete: "Incomplete",
};

const UNVERIFIED = <span className="ml-1 text-[12px] font-semibold text-ink2">Unverified</span>;

const scoreBtn =
  "w-full border-0 bg-transparent p-0 text-left font-[inherit] text-ink hover:bg-panel2 focus-visible:bg-panel2";

export function DetailsPanel({
  node,
  dossierId,
  isSample,
  tracker,
  hasRoute,
}: {
  hasRoute: boolean;
  node: NodeVM | null;
  dossierId: string;
  isSample: boolean;
  tracker: TrackerItem[];
}) {
  if (!node) {
    return (
      <section aria-label="Stakeholder details" className="rounded-[var(--r-l)] border border-rule-strong bg-panel p-3.5">
        <p className="m-0 text-[14.5px] leading-normal text-ink2">
          {hasRoute ? (
            <>
              <b className="text-ink">Start with the dashed route.</b> It links the stakeholders to contact first.{" "}
            </>
          ) : null}
          Click any stakeholder on the map or in the list to see where they stand, the sources behind it and the next
          step.
        </p>
      </section>
    );
  }
  const n = node;
  const status = STATUS_NOTE[n.status];
  return (
    <section
      aria-label="Stakeholder details"
      aria-live="polite"
      data-testid="details"
      className="flex flex-col rounded-[var(--r-l)] border border-rule-strong bg-panel p-3.5"
    >
      <div className="flex items-center justify-between gap-2 text-[12.5px] font-semibold text-ink2">
        <span>
          {CATEGORY_LABEL[n.category]}
          {status && <> · {status}</>}
        </span>
        <span className="flex items-center gap-1.5 text-ink">
          <MarkIcon mark={n.mark} />
          {STANCE_LABEL[n.mark]}
        </span>
      </div>
      <h2 className="mt-2 mb-1 text-[21px] font-extrabold leading-[1.12]">{n.name}</h2>
      {n.nameZh && <p className="m-0 text-[14px] text-ink2" lang="zh-Hant">{n.nameZh}</p>}
      <p className="mt-1 mb-3 text-[14px] leading-[1.45] text-ink2">
        {n.role.text ?? "Role not found yet"}
        {!n.role.verified && UNVERIFIED}
      </p>

      <dl className="m-0 grid grid-cols-2 border-y border-rule-strong">
        <div className="border-b border-rule py-2 pr-2">
          <dt className="text-[12px] text-ink2">Influence</dt>
          <dd className="m-0">
            <ScoreX explanation={n.explain.influence} dossierId={dossierId} className={scoreBtn} label={`Influence ${influenceText(n.influence)}. Show how it is scored`}>
              <span className="block text-[15px] font-semibold">{influenceText(n.influence)}</span>
              <span className="block text-[12px] text-ink2">
                based on {n.influence?.basedOn.rated ?? 0} of 5 factors
              </span>
            </ScoreX>
          </dd>
        </div>
        <div className="border-b border-l border-rule py-2 pl-2.5">
          <dt className="text-[12px] text-ink2">Support, −100 to +100</dt>
          <dd className="m-0">
            <ScoreX explanation={n.explain.support} dossierId={dossierId} className={scoreBtn} label={`Support ${supportText(n.support)}. Show how it is scored`}>
              <span className="num block text-[22px] font-semibold leading-tight">{supportText(n.support)}</span>
            </ScoreX>
          </dd>
        </div>
        <div className="py-2 pr-2">
          <dt className="text-[12px] text-ink2">Cited sources</dt>
          <dd className="num m-0 text-[22px] font-semibold leading-tight">{n.sourceCount}</dd>
        </div>
        <div className="border-l border-rule py-2 pl-2.5">
          <dt className="text-[12px] text-ink2">Confidence</dt>
          <dd className="m-0">
            <ScoreX explanation={n.explain.confidence} dossierId={dossierId} className={scoreBtn} label={`Confidence ${n.confidence}. Show how it is scored`}>
              <span className="block text-[15px] font-semibold">{n.confidence}</span>
            </ScoreX>
          </dd>
        </div>
      </dl>

      <h3 className="mt-3.5 mb-1.5 text-[12.5px] font-bold text-[var(--act-text)]">Recommended action</h3>
      <div className="rounded-r-[var(--r-s)] border-l-4 border-[var(--act)] bg-panel2 px-2.5 py-2">
        <p className="m-0 text-[15px] font-semibold leading-[1.45]" data-testid="next-step">
          {n.action.text}
        </p>
        {n.action.verified ? (
          <p className="m-0 mt-1 text-[12.5px] text-ink2">
            {n.action.sources.map((s) => (
              <span key={s.id} className="mr-2 inline-block">
                {s.label}
                <Stamp reliability={s.reliability} credibility={s.credibility} />
              </span>
            ))}
          </p>
        ) : (
          <p className="m-0 mt-1 text-[12.5px] text-ink2">
            No sourced route in yet.{" "}
            <Link href={`/d/${dossierId}/sources?s=${encodeURIComponent(n.id)}`}>See what the sources say</Link>
          </p>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2 border-t border-rule pt-3">
        <Link href={`/d/${dossierId}/sources?s=${encodeURIComponent(n.id)}`} className="btn btn-ghost flex-1">
          View evidence
        </Link>
        {isSample ? (
          <AddToTracker dossierId={dossierId} isSample stakeholderId={n.id} baseTracker={tracker} />
        ) : (
          <AddToTrackerButton dossierId={dossierId} stakeholderId={n.id} alreadyTracked={tracker.some((t) => t.stakeholderId === n.id)} />
        )}
      </div>
    </section>
  );
}
