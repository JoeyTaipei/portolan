"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, TrackerItem } from "@/lib/types";
import { CategoryFilter } from "./category-filter";
import { ContactFirst } from "./contact-first";
import { DetailsPanel } from "./details-panel";
import { useFillHeight } from "./fill-height";
import { InfluenceMap, type MapControls } from "./influence-map";
import { Legend } from "./legend";
import { byInfluence, MAP_LIMIT, type MapModel } from "./model";
import { PowerMatrix } from "./power-matrix";
import { matches, StakeholderList } from "./stakeholder-list";

// Screen 02 (spec §12). Desktop: 290 | 1fr | 380 (≥1600: 320 | 1fr | 440), each column scrolls.
// Phone: one column in the order title → toggle → map → controls → categories → details →
// contact-first → full list (D5: details below the map).

type View = "3d" | "matrix";

const col = "max-lg:contents lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto";

export function MapView({ model, tracker }: { model: MapModel; tracker: TrackerItem[] }) {
  const params = useSearchParams();
  const view: View = params.get("view") === "matrix" ? "matrix" : "3d";
  const [selected, setSelected] = useState<string | null>(() => {
    const s = params.get("s");
    return s && model.nodes.some((n) => n.id === s) ? s : null;
  });
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const controls = useRef<MapControls | null>(null);
  const fillRef = useFillHeight<HTMLDivElement>();

  const sorted = useMemo(() => [...model.nodes].sort(byInfluence), [model.nodes]);
  const drawn = useMemo(() => {
    const keep = new Set(sorted.slice(0, MAP_LIMIT).map((n) => n.id));
    model.contactFirst.forEach((id) => keep.add(id));
    if (selected) keep.add(selected);
    return sorted.filter((n) => keep.has(n.id));
  }, [sorted, model.contactFirst, selected]);
  const inFilter = drawn.filter((n) => filter === "all" || n.category === filter);
  const listed = sorted.filter((n) => (filter === "all" || n.category === filter) && matches(n, query));
  const selNode = model.nodes.find((n) => n.id === selected) ?? null;
  const route = model.contactFirst
    .map((id) => model.nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => !!n);

  const setView = (v: View) => {
    const next = new URLSearchParams(params.toString());
    if (v === "matrix") next.set("view", "matrix");
    else next.delete("view");
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const select = useCallback((id: string | null) => setSelected(id), []);
  const pick = (id: string) => {
    const n = model.nodes.find((x) => x.id === id);
    if (n && filter !== "all" && n.category !== filter) setFilter("all");
    setSelected(id);
  };

  // Keyboard: Esc clears the focus, ← → rotate (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (t?.closest("dialog")) return;
      if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowLeft" && !e.metaKey && !e.altKey) controls.current?.rotate(-0.2);
      else if (e.key === "ArrowRight" && !e.metaKey && !e.altKey) controls.current?.rotate(0.2);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const iconBtn =
    "grid size-[46px] shrink-0 cursor-pointer place-items-center rounded-[var(--r-m)] border border-[var(--btn-line)] bg-panel text-ink hover:bg-panel2 [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]";

  return (
    <div
      ref={fillRef}
      className="flex flex-col gap-3.5 px-4 pt-[18px] pb-6 lg:grid lg:h-[calc(100dvh-118px)] lg:grid-cols-[290px_minmax(0,1fr)_380px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[320px_minmax(0,1fr)_440px]"
    >
      {/* left */}
      <div className={`${col} gap-3.5 lg:border-r lg:border-rule-strong lg:px-5 lg:py-[18px] min-[1600px]:px-6`}>
        <div className="max-lg:order-1">
          <p className="m-0 text-[13px] text-ink2">Stakeholder map</p>
          <h1 className="mt-0.5 mb-1 text-[28px] font-extrabold leading-[1.02]">{model.name}</h1>
          <p className="m-0 text-[13.5px] text-ink2" data-testid="shown-count">
            {inFilter.length} of {model.nodes.length} stakeholders shown. Size shows influence.
          </p>
        </div>
        <div
          role="group"
          aria-label="View"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-m)] border border-rule-strong bg-[var(--tile-gap-bg)] max-lg:order-2"
        >
          {(["3d", "matrix"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className="min-h-11 cursor-pointer border-0 bg-panel text-[14px] font-semibold text-ink aria-pressed:bg-[var(--tile-on)] aria-pressed:text-[var(--tile-on-ink)]"
            >
              {v === "3d" ? "3D map" : "Power matrix"}
            </button>
          ))}
        </div>
        <div className="max-lg:order-6">
          <CategoryFilter value={filter} onChange={(f) => { setFilter(f); setSelected(null); }} />
        </div>
        <div className="max-lg:order-9">
          <ContactFirst nodes={route} selected={selected} onSelect={pick} />
        </div>
      </div>

      {/* centre */}
      <div className={`${col} gap-2.5 lg:overflow-hidden lg:p-4`}>
        <div className="flex min-h-0 flex-col max-lg:order-4 lg:flex-1">
          {inFilter.length === 0 ? (
            <div className="nis inline flex-1" role="status" data-state="empty">
              <h2>No stakeholders in this category</h2>
              <p>Nothing in this dossier fits the current filter. Clear it to see everyone.</p>
              <div className="acts">
                <button type="button" className="btn btn-main" onClick={() => setFilter("all")}>
                  Clear filter
                </button>
              </div>
            </div>
          ) : view === "matrix" ? (
            <PowerMatrix nodes={inFilter} selected={selected} onSelect={select} />
          ) : (
            <InfluenceMap
              nodes={drawn}
              edges={model.edges}
              route={model.contactFirst}
              filter={filter}
              selected={selected}
              onSelect={select}
              controlsRef={controls}
              onPausedChange={setPaused}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 max-lg:order-5">
          {view === "3d" && (
            <>
              <button type="button" className={iconBtn} aria-label="Rotate left" onClick={() => controls.current?.rotate(-0.35)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v5h5" /></svg>
              </button>
              <button
                type="button"
                className={iconBtn}
                aria-label={paused ? "Resume rotation" : "Pause rotation"}
                aria-pressed={paused}
                onClick={() => controls.current?.setPaused(!paused)}
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>
                )}
              </button>
              <button type="button" className={iconBtn} aria-label="Rotate right" onClick={() => controls.current?.rotate(0.35)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></svg>
              </button>
            </>
          )}
          <Legend />
        </div>
      </div>

      {/* right */}
      <div className={`${col} gap-3.5 lg:border-l lg:border-rule-strong lg:px-[18px] lg:py-4 min-[1600px]:px-6`}>
        <div className="max-lg:order-7">
          <DetailsPanel node={selNode} dossierId={model.dossierId} isSample={model.isSample} tracker={tracker} />
        </div>
        <div className="max-lg:order-10">
          <StakeholderList
            nodes={listed}
            total={model.nodes.length}
            query={query}
            onQuery={setQuery}
            selected={selected}
            onSelect={pick}
          />
        </div>
      </div>
    </div>
  );
}
