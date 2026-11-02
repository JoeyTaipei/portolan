"use client";

import {
  ALSO_AGREE_MAX,
  ASK_LABEL,
  BUDGET_LABEL,
  FORMAT_LABEL,
  INFLUENCE_QUESTIONS,
  INITIATOR_LABEL,
  MEMO_NOTE_MAX,
  MET_ROLE_MAX,
  STANCE_LABEL,
  TIMELINE_LABEL,
  TOPIC_LABEL,
} from "@/lib/tracker/memo";
import { useT } from "@/lib/i18n/client";
import type { DebriefMemo, MemoAsk, MemoTopic, StatementRating } from "@/lib/types";

// TRK-9 meeting memo, layout A (design/memo-options, chosen by Erin 2026-11-02): "Add detail"
// folds out under the quick questions. Every question has a dashed "Not sure", which records
// nothing; the influence answers say which factor they set (docs/scoring.md §3.2).

// "Not sure" is the quiet default: dashed, and only tinted when it is the current answer.
const pill = (on: boolean, notSure = false) =>
  `min-h-10 cursor-pointer rounded-[var(--r-m)] border px-1.5 font-[inherit] text-[13.5px] font-semibold ${
    notSure
      ? `border-dashed ${on ? "border-ink2 bg-panel2 text-ink" : "border-[var(--field-line)] bg-panel text-ink2 hover:bg-panel2"}`
      : on
        ? "border-[var(--tile-on)] bg-[var(--tile-on)] text-[var(--tile-on-ink)]"
        : "border-[var(--field-line)] bg-panel text-ink hover:bg-panel2"
  }`;

const tag = (on: boolean) =>
  `min-h-9 cursor-pointer rounded-[var(--r-pill)] border px-3 font-[inherit] text-[13px] ${
    on ? "border-[var(--stamp)] bg-panel2 font-semibold text-[var(--stamp)]" : "border-[var(--field-line)] bg-panel text-ink hover:bg-panel2"
  }`;

const field = "w-full rounded-[var(--r-m)] border border-[var(--field-line)] bg-[var(--field)] px-2.5 font-[inherit] text-[14.5px] text-ink";

const FACTOR_WORD = { authority: "Authority", budget: "Budget", access: "Access", recent: "Recent action" } as const;
const STANCES: StatementRating[] = [-2, -1, 0, 1, 2];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-3 first:border-t-0 first:pt-0">
      <h3 className="m-0 text-[12px] font-bold tracking-[0.08em] text-ink2 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function Choice<T extends string | number>({
  legend,
  hint,
  value,
  options,
  onChange,
  cols = 2,
  notSure,
}: {
  notSure: string;
  legend: string;
  hint?: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
  cols?: number;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[13.5px] font-bold">
        {legend} {hint && <span className="text-[12px] font-semibold text-[var(--stamp)]">→ {hint}</span>}
      </legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={value === o.value} className={pill(value === o.value)} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" aria-pressed={value === null} className={`${pill(value === null, true)} mt-1.5 w-full`} onClick={() => onChange(null)}>
        {notSure}
      </button>
    </fieldset>
  );
}

function Tags<T extends string>({ legend, value, labels, onChange }: { legend: string; value: T[]; labels: Record<T, string>; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[13.5px] font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(labels) as T[]).map((k) => {
          const on = value.includes(k);
          return (
            <button key={k} type="button" aria-pressed={on} className={tag(on)} onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}>
              {labels[k]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Note({ id, label, value, onChange }: { id: string; label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[13px] font-semibold" htmlFor={id}>
      {label}
      <input id={id} type="text" maxLength={MEMO_NOTE_MAX} className={`${field} min-h-10 font-normal`} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} />
    </label>
  );
}

export function MemoDetail({
  memo,
  onChange,
  others,
  isChina,
}: {
  memo: DebriefMemo;
  /** Takes an updater, so quick successive answers never overwrite each other. */
  onChange: (update: (m: DebriefMemo) => DebriefMemo) => void;
  /** Other stakeholders on this map, for "Who else must agree?". */
  others: { id: string; name: string }[];
  isChina: boolean;
}) {
  const t = useT();
  const ns = t("Not sure");
  const tagLabels = <K extends string>(labels: Record<K, string>) =>
    Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, t.k(v as string)])) as Record<K, string>;
  const set = <K extends keyof DebriefMemo>(k: K, v: DebriefMemo[K]) => onChange((m) => ({ ...m, [k]: v }));
  const picked = others.filter((o) => memo.alsoAgree.includes(o.id));
  const left = others.filter((o) => !memo.alsoAgree.includes(o.id));

  return (
    <div className="flex flex-col gap-4" data-testid="memo-detail">
      <Section title={t("The meeting")}>
        <Choice notSure={ns} legend={t("Format")} value={memo.format} cols={3} options={(["in_person", "video", "event"] as const).map((v) => ({ value: v, label: t.k(FORMAT_LABEL[v]) }))} onChange={(v) => set("format", v)} />
        {isChina ? (
          <p className="m-0 text-[12.5px] text-ink2">{t("China stakeholders are kept at organisation level, so who you met isn't recorded.")}</p>
        ) : (
          <label className="flex flex-col gap-1 text-[13.5px] font-bold" htmlFor="memo-role">
            <span>
              {t("Who we met")} <span className="font-normal text-ink2">{t("(role or seniority, not a name)")}</span>
            </span>
            <input id="memo-role" type="text" maxLength={MET_ROLE_MAX} className={`${field} min-h-10 font-normal`} placeholder={t("e.g. Deputy director, procurement")} value={memo.metRole ?? ""} onChange={(e) => set("metRole", e.target.value || null)} />
          </label>
        )}
        <Choice notSure={ns} legend={t("Who asked for the meeting?")} value={memo.initiatedBy} cols={3} options={(["us", "them", "intro"] as const).map((v) => ({ value: v, label: t.k(INITIATOR_LABEL[v]) }))} onChange={(v) => set("initiatedBy", v)} />
      </Section>

      <Section title={t("Their influence")}>
        {INFLUENCE_QUESTIONS.map((q) => (
          <Choice
            notSure={ns}
            key={q.factor}
            legend={t.k(q.question)}
            hint={t.k(FACTOR_WORD[q.factor])}
            value={memo[q.factor]}
            options={q.answers.map((a) => ({ value: a.rating, label: t.k(a.label) }))}
            onChange={(v) => set(q.factor, v)}
          />
        ))}
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13.5px] font-bold">
            {t("Who else must agree, or did they mention?")} <span className="text-[12px] font-semibold text-[var(--stamp)]">→ {t("Network")}</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {picked.map((o) => (
              <button key={o.id} type="button" className={tag(true)} aria-label={t("Remove {name}", { name: o.name })} onClick={() => onChange((m) => ({ ...m, alsoAgree: m.alsoAgree.filter((x) => x !== o.id) }))}>
                {o.name} ✕
              </button>
            ))}
          </div>
          {memo.alsoAgree.length < ALSO_AGREE_MAX && left.length > 0 && (
            <select
              aria-label={t("Add an organisation from the map")}
              className={`${field} mt-1.5 min-h-10`}
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) onChange((m) => ({ ...m, alsoAgree: m.alsoAgree.includes(id) ? m.alsoAgree : [...m.alsoAgree, id] }));
              }}
            >
              <option value="">{t("+ Pick from the map")}</option>
              {left.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </fieldset>
      </Section>

      <Section title={t("Attitude and priorities")}>
        <Choice notSure={ns} legend={t("Their stance on working with us")} value={memo.stance} cols={5} options={STANCES.map((v) => ({ value: v, label: `${v > 0 ? "+" : ""}${v}` }))} onChange={(v) => set("stance", v)} />
        {memo.stance !== null && <p className="m-0 -mt-2 text-[12.5px] text-ink2">{t("{stance}: this replaces Overall when support is recalculated.", { stance: t.k(STANCE_LABEL[memo.stance]) })}</p>}
        <Tags<MemoTopic> legend={t("What they care about")} value={memo.priorities} labels={tagLabels(TOPIC_LABEL)} onChange={(v) => set("priorities", v)} />
        <Note id="memo-pri" label={t("Priorities, in their words (optional)")} value={memo.prioritiesNote} onChange={(v) => set("prioritiesNote", v)} />
        <Tags<MemoTopic> legend={t("Concerns or objections they raised")} value={memo.concerns} labels={tagLabels(TOPIC_LABEL)} onChange={(v) => set("concerns", v)} />
        <Note id="memo-con" label={t("Concerns, in their words (optional)")} value={memo.concernsNote} onChange={(v) => set("concernsNote", v)} />
      </Section>

      <Section title={t("What to expect")}>
        <Choice notSure={ns} legend={t("Their decision timeline")} value={memo.timeline} options={(["quarter", "year", "next_budget", "unknown"] as const).map((v) => ({ value: v, label: t.k(TIMELINE_LABEL[v]) }))} onChange={(v) => set("timeline", v)} />
        <Choice notSure={ns} legend={t("Budget status, as they described it")} value={memo.budgetStatus} options={(["funded", "requested", "not_yet", "unknown"] as const).map((v) => ({ value: v, label: t.k(BUDGET_LABEL[v]) }))} onChange={(v) => set("budgetStatus", v)} />
        <Tags<MemoAsk> legend={t("What they asked us for")} value={memo.asks} labels={tagLabels(ASK_LABEL)} onChange={(v) => set("asks", v)} />
        <Note id="memo-ask" label={t("Anything else they asked for (optional)")} value={memo.asksNote} onChange={(v) => set("asksNote", v)} />
      </Section>
    </div>
  );
}
