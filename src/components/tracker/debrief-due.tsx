"use client";

import { meetingWhen, type DebriefInput, type DueDebrief } from "@/lib/tracker/flow";
import { useT } from "@/lib/i18n/client";
import { DebriefForm } from "./debrief-form";

// TRK-2: from the day after a tracked meeting with no debrief yet. With several, the oldest
// shows first, one at a time. With none, say how to get one ("Set meeting date" on an item).
export function DebriefDue({
  due,
  name,
  now,
  onSave,
  memoFor,
}: {
  due: DueDebrief[];
  name: (d: DueDebrief) => string;
  now: Date;
  onSave: (input: DebriefInput) => Promise<string | null>;
  memoFor: (d: DueDebrief) => { others: { id: string; name: string }[]; isChina: boolean } | null;
}) {
  const first = due[0];
  const t = useT();
  if (!first) {
    return (
      <section aria-labelledby="debrief-h" className="rounded-[var(--r-l)] border border-dashed border-rule-strong bg-panel p-4">
        <h2 id="debrief-h" className="m-0 text-[17px] font-bold">
          {t("No debrief due")}
        </h2>
        <p className="m-0 mt-1 text-[14px] leading-normal text-ink2">
          {t("Use")} <b className="text-ink">{t("Set meeting date")}</b>{" "}
          {t("on someone you’re tracking. From the day after the meeting, a short debrief appears here. Each one updates that stakeholder’s support and marks the strategy brief out of date.")}
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="debrief-h" data-testid="debrief-due" className="flex flex-col gap-3 rounded-[var(--r-l)] border border-rule-strong bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-[var(--r-s)] bg-[var(--hi)] px-2 py-0.5 text-[12px] font-bold tracking-[0.04em] text-[var(--act-ink)]">{t("Debrief due")}</span>
        <span className="text-[13px] text-ink2">
          {t.x(meetingWhen(first.daysAgo))}
          {due.length > 1 && (
            <>
              {" "}· {t("{n} of {m}", { n: 1, m: due.length })}
            </>
          )}
        </span>
      </div>
      <div>
        <h2 id="debrief-h" className="m-0 text-[20px] font-extrabold leading-tight">
          {t("How did your meeting with {name} go?", { name: name(first) })}
        </h2>
        <p className="m-0 mt-1 text-[13.5px] text-ink2">{t("Takes 30 seconds. Your answers update this stakeholder and your next briefing note; add detail to update their influence score.")}</p>
      </div>
      <DebriefForm key={first.item.id} itemId={first.item.id} now={now} onSave={onSave} memoFor={memoFor(first)} />
    </section>
  );
}
