"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, TrackerItem } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import { CategoryFilter } from "./category-filter";
import { ContactFirst } from "./contact-first";
import { DetailsPanel } from "./details-panel";
import { InfluenceMap, type MapControls } from "./influence-map";
import { Legend } from "./legend";
import { byInfluence, MAP_LIMIT, type MapModel } from "./model";
import { PowerMatrix } from "./power-matrix";
import { matches, StakeholderList } from "./stakeholder-list";

// Screen 02 (spec §12, LAYOUT-BR). One scrolling page: title, one toolbar row, then the map
// beside a side column (details → contact-first → full list). Phone: the same order, stacked.

type View = "3d" | "matrix";

export function MapView({ model, tracker }: { model: MapModel; tracker: TrackerItem[] }) {
  const params = useSearchParams();
  const t = useT();
  const view: View = params.get("view") === "matrix" ? "matrix" : "3d";
  const [selected, setSelected] = useState<string | null>(() => {
    const s = params.get("s");
    return s && model.nodes.some((n) => n.id === s) ? s : null;
  });
  // Activity keeps this page's state across visits, so follow a new ?s= when one arrives.
  const sParam = params.get("s");
  useEffect(() => {
    if (sParam && model.nodes.some((n) => n.id === sParam)) setSelected(sParam);
  }, [sParam, model.nodes]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const controls = useRef<MapControls | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // A new selection brings its details into view (the list below may be scrolled).
  useEffect(() => {
    if (selected) detailsRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

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
      const el = e.target as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (el?.closest("dialog")) return;
      if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowLeft" && !e.metaKey && !e.altKey) controls.current?.rotate(-0.2);
      else if (e.key === "ArrowRight" && !e.metaKey && !e.altKey) controls.current?.rotate(0.2);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const iconBtn =
    "grid size-[46px] shrink-0 cursor-pointer place-items-center rounded-[var(--r-m)] border-2 border-[var(--btn-line)] bg-panel text-ink hover:bg-[var(--hi2)] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]";

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 pt-[18px] pb-8 lg:px-8 lg:pt-6 lg:pb-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-[1.05] lg:text-[32px]">{t("Who decides")}</h1>
          <p className="m-0 mt-1 text-[14.5px] text-ink2" data-testid="shown-count">
            {t("{name}. {n} of {m} stakeholders shown; size shows influence.", { name: model.name, n: inFilter.length, m: model.nodes.length })}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("View")} className="inline-flex overflow-hidden rounded-[var(--r-m)] border-2 border-ink">
          {(["3d", "matrix"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className="min-h-10 cursor-pointer border-0 bg-panel px-4 text-[14px] font-semibold text-ink max-lg:min-h-11 aria-pressed:bg-[var(--tile-on)] aria-pressed:text-[var(--tile-on-ink)] aria-pressed:shadow-[inset_0_-4px_0_var(--hi)]"
            >
              {v === "3d" ? t("3D map") : t("Power matrix")}
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-rule sm:block" />
        <CategoryFilter value={filter} onChange={(f) => { setFilter(f); setSelected(null); }} />
        {view === "3d" && (
          <div className="flex gap-1.5 lg:ml-auto">
            <button type="button" className={iconBtn} aria-label={t("Rotate left")} onClick={() => controls.current?.rotate(-0.35)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v5h5" /></svg>
            </button>
            <button
              type="button"
              className={iconBtn}
              aria-label={paused ? t("Resume rotation") : t("Pause rotation")}
              aria-pressed={paused}
              onClick={() => controls.current?.setPaused(!paused)}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>
              )}
            </button>
            <button type="button" className={iconBtn} aria-label={t("Rotate right")} onClick={() => controls.current?.rotate(0.35)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-7 min-[1600px]:grid-cols-[minmax(0,1fr)_420px]">
        <figure className="exhibit" data-testid="map-exhibit">
          <figcaption className="ex-t">
            <span>{t("Exhibit {n}", { n: 1 })}</span>
            {route.length > 0
              ? t("Contact these {n} first, in order: {names}.", { n: route.length, names: route.map((r) => r.short).join(", ") })
              : t("No contact route is sourced yet; start with the full list and its sources.")}
          </figcaption>
          <div className="flex flex-col px-3 pt-2 pb-3 lg:h-[max(520px,calc(100dvh-340px))]">
            {inFilter.length === 0 ? (
              <div className="nis inline flex-1" role="status" data-state="empty">
                <h2>{t("No stakeholders in this category")}</h2>
                <p>{t("Nothing in this market fits the current filter. Clear it to see everyone.")}</p>
                <div className="acts">
                  <button type="button" className="btn btn-main" onClick={() => setFilter("all")}>
                    {t("Clear filter")}
                  </button>
                </div>
              </div>
            ) : view === "matrix" ? (
              <PowerMatrix nodes={inFilter} route={model.contactFirst} selected={selected} onSelect={select} />
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
          <div className="ex-src flex flex-col gap-1.5">
            <Legend />
            <p className="m-0">
              {t("Size shows influence; fill shows stance. Source: Portolan analysis of {n} sources.", { n: model.sourceCount })}
              {model.isSample && <> {t("Sample data.")}</>}
            </p>
          </div>
        </figure>

        <aside aria-label={t("Stakeholders")} className="flex flex-col gap-6 lg:border-l lg:border-rule lg:pl-7">
          <div ref={detailsRef} className="scroll-mt-4">
            <DetailsPanel hasRoute={route.length > 1} node={selNode} dossierId={model.dossierId} isSample={model.isSample} tracker={tracker} />
          </div>
          <ContactFirst nodes={route} selected={selected} onSelect={pick} />
          <details className="group" open={query !== "" || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between border-b border-rule-strong text-[15px] font-bold [&::-webkit-details-marker]:hidden">
              {t("All {n} stakeholders, by influence", { n: model.nodes.length })}
              <span aria-hidden="true" className="text-ink2 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="pt-3">
              <StakeholderList
                nodes={listed}
                total={model.nodes.length}
                query={query}
                onQuery={setQuery}
                selected={selected}
                onSelect={pick}
                title={false}
              />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
