"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDossiers } from "@/lib/browser-dossiers";
import { useT } from "@/lib/i18n/client";
import type { Level } from "@/lib/types";
import { checkDossiers, type DossierCheck } from "./check-dossiers";
import { NewDossierForm } from "./new-dossier-form";

// HOME-7: the sample plus the dossiers this browser remembers, each with its confidence level.
// MKT-3: a 碳基 market lists its sibling markets as the samples.
// Simpler version: dossiers the server can't open are hidden. HOME-8 form opens from here.

export function DossierSelect({
  selectedId,
  samples,
  startOpen = false,
}: {
  selectedId: string;
  samples: { id: string; name: string; level: Level; sources: number }[];
  startOpen?: boolean;
}) {
  const [mine, setMine] = useState<DossierCheck[]>([]);
  const [open, setOpen] = useState(startOpen);
  const t = useT();

  useEffect(() => {
    const ids = listDossiers().map((d) => d.id);
    if (ids.length === 0) return;
    let live = true;
    checkDossiers(ids)
      .then((r) => {
        if (!live || !r.ok) return;
        const byId = new Map(r.data.map((d) => [d.id, d]));
        setMine(ids.map((id) => byId.get(id)).filter((d): d is DossierCheck => !!d));
      })
      .catch(() => {
        // offline: show only the sample
      });
    return () => {
      live = false;
    };
  }, []);

  const rows = [...mine, ...samples.map((x) => ({ ...x, sample: true }))];
  return (
    <section aria-labelledby="sel-h" className="flex flex-col gap-0.5">
      <div className="mb-1 flex items-center justify-between gap-2.5 border-b border-rule-strong pb-2">
        <h2 id="sel-h" className="m-0 text-[16px] font-bold">
          {t("Your markets")}
        </h2>
        <button type="button" className="btn btn-ghost btn-s" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t("Close") : t("+ New market")}
        </button>
      </div>
      {open && <NewDossierForm />}
      <ul className="m-0 list-none p-0">
        {rows.map((d) => {
          const on = d.id === selectedId;
          return (
            <li key={d.id}>
              <Link
                href={`/d/${d.id}`}
                aria-current={on ? "page" : undefined}
                className="grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-0.5 rounded-[var(--r-s)] border-b border-rule px-2.5 py-2 text-ink no-underline hover:bg-panel2 aria-[current=page]:bg-[var(--tile-on)] aria-[current=page]:text-[var(--tile-on-ink)]"
              >
                <span className="truncate text-[14.5px] font-semibold">{t.r(d.name)}</span>
                <span className="text-[13px] font-semibold">{t.k(d.level)}</span>
                <span className={`col-span-2 text-[12px] ${on ? "text-[var(--tile-on-ink2)]" : "text-ink2"}`}>
                  {d.sources === 1 ? t("{n} source", { n: d.sources }) : t("{n} sources", { n: d.sources })}
                  {"sample" in d && ` · ${t("Sample data")}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
