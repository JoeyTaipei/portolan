"use client";

import { useEffect, useMemo, useState } from "react";
import { editTrackerItem, removeTrackerItem, saveDebrief, undoDebrief as undoDebriefAction } from "@/app/d/[id]/tracker/actions";
import { useFillHeight } from "@/components/map/fill-height";
import { track } from "@/lib/analytics";
import { OVERLAY_EVENT, readOverlay, writeOverlay } from "@/lib/sample/overlay";
import {
  applyDebrief,
  dueDebriefs,
  editItem,
  itemName,
  removeItem,
  stageCounts,
  undoDebrief,
  type DebriefInput,
  type DebriefReceipt,
  type ItemEdit,
  type TrackerState,
} from "@/lib/tracker/flow";
import type { ActionResult, SampleOverlay, TrackerStage } from "@/lib/types";
import { DebriefDue } from "./debrief-due";
import { DebriefResult } from "./debrief-result";
import { buildRows } from "./model";
import { NextSteps } from "./next-steps";
import { StageCounts } from "./stage-counts";

// 06 Tracker (spec §12). Two columns from 1024px (1fr | 420, ≥1600 1fr | 480): stage counts and
// next steps / the debrief card, each scrolling on its own. Phones: stages → debrief → list.
// The sample works on this browser's copy (SHELL-3); real dossiers go through Server Actions.

const NO_STORAGE = "This browser won't save changes. Allow site storage and try again.";

function withOverlay(base: TrackerState, o: SampleOverlay): TrackerState {
  return {
    ...base,
    tracker: o.tracker ?? base.tracker,
    debriefs: o.debriefs ?? base.debriefs,
    statements: o.statements ?? base.statements,
    sources: o.sources ?? base.sources,
    playbook: o.playbook ?? base.playbook,
  };
}

/** Store every collection the tracker touches; the overlay replaces each array whole. */
function persist(s: TrackerState): boolean {
  return (
    writeOverlay("tracker", s.tracker) &&
    writeOverlay("debriefs", s.debriefs) &&
    writeOverlay("statements", s.statements) &&
    writeOverlay("sources", s.sources) &&
    writeOverlay("playbook", s.playbook)
  );
}

const newId = (p: string) => `${p}-${crypto.randomUUID()}`;

export function TrackerView({ initial, isSample, name, nowIso }: { initial: TrackerState; isSample: boolean; name: string; nowIso: string }) {
  const [overlay, setOverlay] = useState<SampleOverlay | null>(null);
  const [now, setNow] = useState(() => new Date(nowIso));
  const [filter, setFilter] = useState<TrackerStage | null>(null);
  const [receipt, setReceipt] = useState<DebriefReceipt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useFillHeight<HTMLDivElement>();

  useEffect(() => {
    // After hydration: the browser's clock and, on the sample, this browser's changes.
    const read = () => {
      setNow(new Date());
      if (isSample) setOverlay(readOverlay());
    };
    read();
    if (!isSample) return;
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [isSample]);

  const state = useMemo(() => (isSample && overlay ? withOverlay(initial, overlay) : initial), [initial, isSample, overlay]);
  const rows = useMemo(() => buildRows(state, now), [state, now]);
  const counts = stageCounts(state.tracker);
  const due = dueDebriefs(state, now);
  const shown = filter ? rows.filter((r) => r.item.stage === filter) : rows;
  const dossierId = state.dossierId;

  async function saveItem(itemId: string, edit: ItemEdit): Promise<ActionResult<unknown>> {
    if (isSample) return persist(editItem(state, itemId, edit)) ? { ok: true, data: null } : { ok: false, error: NO_STORAGE };
    return editTrackerItem(dossierId, itemId, edit);
  }

  async function remove(itemId: string): Promise<ActionResult<unknown>> {
    if (isSample) return persist(removeItem(state, itemId)) ? { ok: true, data: null } : { ok: false, error: NO_STORAGE };
    return removeTrackerItem(dossierId, itemId);
  }

  async function debrief(input: DebriefInput): Promise<string | null> {
    let r: ActionResult<DebriefReceipt>;
    if (isSample) {
      const ids = { debrief: newId("db"), source: newId("src-db"), statement: newId("st-db"), playbook: newId("pb") };
      const out = applyDebrief(state, input, ids, new Date());
      r = persist(out.state) ? { ok: true, data: out.receipt } : { ok: false, error: NO_STORAGE };
    } else {
      r = await saveDebrief(dossierId, input);
    }
    if (!r.ok) return r.error;
    setNotice(null);
    setReceipt(r.data);
    track("debrief_saved", { overall: input.overall, next_step_agreed: input.nextStepAgreed, playbook: input.addToPlaybook, sample: isSample });
    return null;
  }

  async function undo(): Promise<string | null> {
    if (!receipt) return null;
    if (isSample) {
      if (!persist(undoDebrief(state, receipt))) return NO_STORAGE;
    } else {
      const r = await undoDebriefAction(dossierId, receipt.debriefId, { nextStep: receipt.itemBefore.nextStep, dueDate: receipt.itemBefore.dueDate });
      if (!r.ok) return r.error;
    }
    setReceipt(null);
    setNotice("Debrief removed. Support, stage and next step are back as they were.");
    return null;
  }

  const byId = new Map(state.tracker.map((t) => [t.id, t]));

  return (
    <div
      ref={ref}
      className="flex flex-col gap-5 px-4 pt-[18px] pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[minmax(0,1fr)_480px]"
    >
      <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-8 lg:py-[22px] min-[1600px]:px-12">
        <header className="order-1 max-w-[880px]">
          <p className="m-0 text-[13px] text-ink2">Entry tracker</p>
          <h1 className="mt-0.5 mb-0 text-[28px] font-extrabold leading-[1.02] min-[1600px]:text-[31px]">From first contact to first deal</h1>
          <p className="m-0 mt-1 text-[14.5px] text-ink2">{name}</p>
        </header>
        <div className="order-2">
          <StageCounts counts={counts} filter={filter} onFilter={setFilter} />
        </div>
        <div className="order-4">
          <NextSteps
            rows={shown}
            total={rows.length}
            filter={filter}
            dossierId={dossierId}
            onClearFilter={() => setFilter(null)}
            onSave={saveItem}
            onRemove={remove}
          />
        </div>
      </div>
      <aside
        aria-label="Debrief"
        className="order-3 flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-rule-strong lg:bg-panel2 lg:px-5 lg:py-[18px] min-[1600px]:px-6"
      >
        {notice && (
          <p role="status" className="m-0 rounded-[var(--r-m)] border border-rule bg-panel px-3 py-2 text-[13.5px]">
            {notice}
          </p>
        )}
        {receipt ? (
          <DebriefResult receipt={receipt} dossierId={dossierId} onUndo={undo} onClose={() => setReceipt(null)} />
        ) : (
          <DebriefDue
            due={due}
            now={now}
            name={(d) => itemName(state, byId.get(d.item.id) ?? d.item)}
            onSave={debrief}
          />
        )}
      </aside>
    </div>
  );
}
