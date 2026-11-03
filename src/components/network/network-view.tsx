"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { requestIntro, saveLead } from "@/app/d/[id]/network/actions";
import { useFillHeight } from "@/components/map/fill-height";
import { Nis } from "@/components/shell/nis";
import { OVERLAY_EVENT, readOverlay, writeOverlay } from "@/lib/sample/overlay";
import type {
  ActionResult,
  IntroRequest,
  SampleOverlay,
  TrackerItem,
} from "@/lib/types";
import { PartnerCard } from "@/components/partners/partner-card";
import type { Key } from "@/lib/i18n";
import { LeadCard } from "./lead-card";
import {
  INTRO_LABEL,
  TABS,
  type LeadVM,
  type NetworkTab,
  type NetworkVM,
} from "./model";
import { NetworkTabs } from "./tabs";
import { useT } from "@/lib/i18n/client";

// 04 Network (spec §12). Three columns from 1024px (260 | 1fr | 360, ≥1600 280 | 1fr | 400): tabs
// and note / card grid (2 columns at 1440, 3 at 1920) / saved leads, each scrolling on its own.
// Phones: tabs → note → cards. The sample works on this browser's copy (SHELL-3).

const NO_STORAGE =
  "This browser won't save changes. Allow site storage and try again.";

const EMPTY: Record<NetworkTab, { title: Key; desc: Key }> = {
  partners: {
    title: "No partner candidates yet",
    desc: "Candidates appear once research finds Taiwanese firms with public, sourced evidence.",
  },
  investors: {
    title: "No sourced investors yet",
    desc: "Request a Portolan expert intro from a stakeholder on the map, or check back after the next refresh.",
  },
  lawyers: {
    title: "No sourced lawyers yet",
    desc: "Request a Portolan expert intro from a stakeholder on the map, or check back after the next refresh.",
  },
  events: {
    title: "No sourced events yet",
    desc: "Events appear once research finds a dated, sourced event your stakeholders attend.",
  },
};

export function NetworkView({ vm, tab }: { vm: NetworkVM; tab: NetworkTab }) {
  const [overlay, setOverlay] = useState<SampleOverlay | null>(null);
  const ref = useFillHeight<HTMLDivElement>();
  const t = useT();
  const { dossierId, isSample } = vm;

  useEffect(() => {
    if (!isSample) return;
    const read = () => setOverlay(readOverlay());
    read();
    window.addEventListener(OVERLAY_EVENT, read);
    return () => window.removeEventListener(OVERLAY_EVENT, read);
  }, [isSample]);

  const tracker = (isSample && overlay?.tracker) || vm.tracker;
  const intros = (isSample && overlay?.intros) || vm.intros;
  const savedIds = useMemo(
    () => new Set(tracker.flatMap((x) => (x.leadId ? [x.leadId] : []))),
    [tracker],
  );
  const introFor = (stakeholderId: string | null) =>
    stakeholderId
      ? (intros.filter((i) => i.stakeholderId === stakeholderId).at(-1) ?? null)
      : null;

  const type = TABS.find((x) => x.key === tab)!.type;
  const shown = type ? vm.leads.filter((l) => l.type === type) : [];
  const counts = Object.fromEntries(
    TABS.map((x) => [
      x.key,
      x.type
        ? vm.leads.filter((l) => l.type === x.type).length
        : vm.partners.length,
    ]),
  ) as Record<NetworkTab, number>;
  const empty =
    tab === "partners" ? vm.partners.length === 0 : shown.length === 0;
  const saved = vm.leads.filter((l) => savedIds.has(l.id));

  async function save(lead: LeadVM): Promise<ActionResult<unknown>> {
    if (!isSample) return saveLead(dossierId, lead.id);
    const item: TrackerItem = {
      id: `trk-${crypto.randomUUID()}`,
      dossierId,
      stakeholderId: null,
      leadId: lead.id,
      stage: "found",
      nextStep: lead.route,
      dueDate: null,
      meetingAt: lead.type === "event" ? lead.eventDate : null,
      origin: "network",
      createdAt: new Date().toISOString(),
    };
    const current = readOverlay().tracker ?? vm.tracker;
    if (current.some((x) => x.leadId === lead.id))
      return { ok: true, data: null };
    return writeOverlay("tracker", [...current, item])
      ? { ok: true, data: null }
      : { ok: false, error: NO_STORAGE };
  }

  async function intro(
    lead: LeadVM,
    purpose: string,
  ): Promise<ActionResult<unknown>> {
    if (!lead.stakeholderId)
      return { ok: false, error: t("This lead isn't on the map yet.") };
    if (!isSample)
      return requestIntro(dossierId, {
        stakeholderId: lead.stakeholderId,
        purpose,
      });
    const row: IntroRequest = {
      id: `intro-${crypto.randomUUID()}`,
      dossierId,
      stakeholderId: lead.stakeholderId,
      purpose,
      status: "received",
      resultNote: null,
      createdAt: new Date().toISOString(),
    };
    return writeOverlay("intros", [...(readOverlay().intros ?? vm.intros), row])
      ? { ok: true, data: null }
      : { ok: false, error: NO_STORAGE };
  }

  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 px-4 pt-[18px] pb-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_360px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[280px_minmax(0,1fr)_400px]"
    >
      <div className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-rule-strong lg:px-5 lg:py-[22px]">
        <header>
          <p className="m-0 text-[13px] text-ink2">{t("Network")}</p>
          <h1 className="mt-0.5 mb-0 text-[28px] font-extrabold leading-[1.02] min-[1600px]:text-[31px]">
            {t("Who to meet, and where")}
          </h1>
          <p className="m-0 mt-1 text-[14px] text-ink2">{t("Matched to {name}", { name: vm.name })}</p>
        </header>
        <NetworkTabs dossierId={dossierId} tab={tab} counts={counts} />
      </div>

      <section
        aria-label={t.k(TABS.find((x) => x.key === tab)!.label)}
        className="lg:min-h-0 lg:overflow-y-auto lg:px-6 lg:py-[22px] min-[1600px]:px-8"
      >
        {empty ? (
          <Nis
            kind="empty"
            inline
            title={t(EMPTY[tab].title)}
            desc={t(EMPTY[tab].desc)}
            actions={[{ label: t("Open the map"), href: `/d/${dossierId}/map` }]}
          />
        ) : tab === "partners" ? (
          <div
            className="grid grid-cols-1 gap-3 min-[1360px]:grid-cols-2 min-[1800px]:grid-cols-3"
            data-testid="partner-grid"
          >
            {vm.partners.map((p, i) => (
              <PartnerCard
                key={p.id}
                p={p}
                rank={i + 1}
                dossierId={dossierId}
              />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-3 min-[1360px]:grid-cols-2 min-[1800px]:grid-cols-3"
            data-testid="lead-grid"
          >
            {shown.map((l) => (
              <LeadCard
                key={l.id}
                lead={l}
                dossierId={dossierId}
                saved={savedIds.has(l.id)}
                intro={introFor(l.stakeholderId)}
                onSave={() => save(l)}
                onIntro={(p) => intro(l, p)}
              />
            ))}
          </div>
        )}
      </section>

      <aside
        aria-labelledby="saved-h"
        className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-rule-strong lg:bg-panel2 lg:px-5 lg:py-[18px] min-[1600px]:px-6"
      >
        <h2 id="saved-h" className="m-0 text-[15px] font-bold">
          {t("Saved leads")}{" "}
          <span className="num font-semibold text-ink2">{saved.length}</span>
        </h2>
        {saved.length === 0 ? (
          <p className="m-0 text-[13.5px] leading-[1.45] text-ink2">
            {t("Save a lead or add an event to your plan; it goes into your tracker as Found.")}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {saved.map((l) => {
              const i = introFor(l.stakeholderId);
              return (
                <li
                  key={l.id}
                  className="border-t border-rule py-2.5 first:border-t-rule-strong"
                >
                  <p className="m-0 text-[14.5px] font-bold leading-snug">
                    {l.name}
                  </p>
                  <p className="m-0 text-[12.5px] text-ink2">
                    {t.k(l.kind)}
                    {l.type === "event" && l.eventDate ? (
                      <>
                        {" "}
                        · <span className="num">{t.date(l.eventDate)}</span>
                      </>
                    ) : null}
                    {i ? ` · ${t.k(INTRO_LABEL[i.status])}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href={`/d/${dossierId}/tracker`}
          className="btn btn-ghost btn-s self-start"
        >
          {t("Open the tracker")}
        </Link>
      </aside>
    </div>
  );
}
