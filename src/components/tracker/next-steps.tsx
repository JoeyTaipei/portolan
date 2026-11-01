"use client";

import Link from "next/link";
import { useState } from "react";
import { MarkIcon } from "@/components/map/node-mark";
import { Nis } from "@/components/shell/nis";
import { STAGE_LABEL, STAGES, type ItemEdit } from "@/lib/tracker/flow";
import type { ActionResult, TrackerStage } from "@/lib/types";
import { fmtDate, type RowVM } from "./model";

// TRK-7 next steps: name, next step, due date, stage tag and stance mark (diamond for events).
// Stage, next step, due date and meeting date are editable; items can be removed. TRK-8 links
// each item to the briefing-note request with that item preselected.

const STAGE_TAG: Record<TrackerStage, string> = {
  found: "border-rule bg-panel2 text-ink2",
  contacted: "border-rule-strong bg-panel text-ink",
  met: "border-[var(--depth2)] bg-[var(--depth1)] text-ink",
  partner: "border-[var(--tag-bg)] bg-[var(--tag-bg)] text-[var(--tag-ink)]",
};

type Save = (itemId: string, edit: ItemEdit) => Promise<ActionResult<unknown>>;
type Remove = (itemId: string) => Promise<ActionResult<unknown>>;

export function NextSteps({
  rows,
  total,
  filter,
  dossierId,
  onClearFilter,
  onSave,
  onRemove,
}: {
  rows: RowVM[];
  total: number;
  filter: TrackerStage | null;
  dossierId: string;
  onClearFilter: () => void;
  onSave: Save;
  onRemove: Remove;
}) {
  const [open, setOpen] = useState<{ id: string; focus: "meeting" | "step" } | null>(null);

  if (total === 0) {
    return (
      <Nis
        kind="empty"
        inline
        title="Nothing tracked yet"
        desc="Add stakeholders from the map or save leads from Network."
        actions={[
          { label: "Open the map", href: `/d/${dossierId}/map` },
          { label: "Open Network", href: `/d/${dossierId}/network` },
        ]}
      />
    );
  }

  return (
    <section aria-labelledby="steps-h" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="steps-h" className="m-0 text-[13px] font-bold text-ink2">
          {filter ? (
            <>
              {STAGE_LABEL[filter]} · <span className="num">{rows.length}</span> shown of <span className="num">{total}</span>
            </>
          ) : (
            "Next steps"
          )}
        </h2>
      </div>
      {rows.length === 0 ? (
        <Nis kind="empty" inline title={`No one at ${filter ? STAGE_LABEL[filter] : "this stage"} yet`} desc="Clear the filter to see everyone you're tracking.">
          <div className="acts">
            <button type="button" className="btn btn-main" onClick={onClearFilter}>
              Show all
            </button>
          </div>
        </Nis>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0" data-testid="tracker-list">
          {rows.map((r) => (
            <Row
              key={r.item.id}
              row={r}
              dossierId={dossierId}
              open={open?.id === r.item.id ? open.focus : null}
              onOpen={(focus) => setOpen(focus ? { id: r.item.id, focus } : null)}
              onSave={onSave}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  row,
  dossierId,
  open,
  onOpen,
  onSave,
  onRemove,
}: {
  row: RowVM;
  dossierId: string;
  open: "meeting" | "step" | null;
  onOpen: (focus: "meeting" | "step" | null) => void;
  onSave: Save;
  onRemove: Remove;
}) {
  const { item } = row;
  const due = fmtDate(item.dueDate);
  const meeting = fmtDate(item.meetingAt);
  return (
    <li className="border-t border-rule py-3 first:border-t-rule-strong last:border-b last:border-b-rule-strong" data-testid="tracker-row">
      <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1">
        <span className="mt-1 flex" title={`Support ${row.support}`}>
          <MarkIcon mark={row.mark} />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[15.5px] font-bold leading-snug">{row.name}</p>
          <p className="m-0 mt-0.5 text-[14px] leading-[1.45] text-ink2">{item.nextStep ?? "No next step yet"}</p>
          <p className="m-0 mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-ink2">
            <span>
              Support <span className="num font-semibold text-ink">{row.support}</span>
            </span>
            {meeting && <span>Meeting {meeting}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className={`rounded-[var(--r-chip)] border px-1.5 py-px text-[12px] font-bold ${STAGE_TAG[item.stage]}`}>{STAGE_LABEL[item.stage]}</span>
          <span className="num text-[12.5px] text-ink2">{due ? `Due ${due}` : "No due date"}</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-1 pl-[28px]">
        <button type="button" className={linkBtn} aria-expanded={open === "step"} onClick={() => onOpen(open ? null : "step")}>
          {open ? "Close" : "Edit"}
        </button>
        {!open && (
          <button type="button" className={linkBtn} onClick={() => onOpen("meeting")}>
            {item.meetingAt ? "Change meeting date" : "Set meeting date"}
          </button>
        )}
        <Link href={`/d/${dossierId}/docs?item=${encodeURIComponent(item.id)}`} className={`${linkBtn} inline-flex items-center`}>
          Briefing note
        </Link>
      </div>
      {open && <Editor row={row} focus={open} onDone={() => onOpen(null)} onSave={onSave} onRemove={onRemove} />}
    </li>
  );
}

const linkBtn =
  "min-h-9 cursor-pointer border-0 bg-transparent px-1.5 text-[13px] font-semibold text-[var(--link)] underline underline-offset-2 hover:bg-panel2";

const field = "min-h-11 w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 font-[inherit] text-[15px] text-ink";

function Editor({
  row,
  focus,
  onDone,
  onSave,
  onRemove,
}: {
  row: RowVM;
  focus: "meeting" | "step";
  onDone: () => void;
  onSave: Save;
  onRemove: Remove;
}) {
  const { item } = row;
  const [stage, setStage] = useState<TrackerStage>(item.stage);
  const [nextStep, setNextStep] = useState(item.nextStep ?? "");
  const [dueDate, setDueDate] = useState(item.dueDate?.slice(0, 10) ?? "");
  const [meetingAt, setMeetingAt] = useState(item.meetingAt?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = item.id.replace(/[^A-Za-z0-9_-]/g, "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    const r = await onSave(item.id, {
      stage,
      nextStep: nextStep.trim() || null,
      dueDate: dueDate || null,
      meetingAt: meetingAt || null,
    });
    setBusy(null);
    if (r.ok) onDone();
    else setError(r.error);
  }

  async function remove() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setBusy("remove");
    setError(null);
    const r = await onRemove(item.id);
    setBusy(null);
    if (!r.ok) setError(r.error);
  }

  return (
    <form onSubmit={save} className="mt-2 ml-[28px] flex flex-col gap-3 rounded-[var(--r-l)] border border-rule-strong bg-panel p-3" aria-label={`Edit ${row.name}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor={`stage-${uid}`}>
          Stage
          <select id={`stage-${uid}`} className={field} value={stage} onChange={(e) => setStage(e.target.value as TrackerStage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor={`meeting-${uid}`}>
          Meeting date
          <input id={`meeting-${uid}`} type="date" className={field} value={meetingAt} autoFocus={focus === "meeting"} onChange={(e) => setMeetingAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold sm:col-span-2" htmlFor={`next-${uid}`}>
          Next step
          <input id={`next-${uid}`} type="text" maxLength={300} className={field} value={nextStep} autoFocus={focus === "step"} onChange={(e) => setNextStep(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor={`due-${uid}`}>
          Due date
          <input id={`due-${uid}`} type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-main btn-s" disabled={busy !== null}>
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost btn-s" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-s ml-auto border-[var(--res)] bg-panel text-[var(--res-text)]"
          disabled={busy !== null}
          onClick={remove}
        >
          {busy === "remove" ? "Removing…" : confirmRemove ? "Confirm remove" : "Remove from tracker"}
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[var(--res-text)]">
          {error}
        </p>
      )}
    </form>
  );
}
