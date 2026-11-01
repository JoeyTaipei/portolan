import { headers } from "next/headers";
import { Nis } from "@/components/shell/nis";
import type { Dossier } from "@/lib/types";
import { A4Report } from "./a4-report";
import { buildReportModel } from "./model";
import { PaperFit, ReportToolbar } from "./report-toolbar";

// The report screen for both routes: toolbar on top, centred 794px paper on the desk colour.
// /s/[shareId] passes `shared`, which removes every link back into the dossier.

/** This site's origin from the request, so the printed share link is a full URL. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function ReportScreen({ d, shared }: { d: Dossier; shared: boolean }) {
  const brief = d.briefs.at(-1);
  if (!brief) {
    return (
      <Nis
        kind="empty"
        headingLevel={1}
        title="This report is still being prepared"
        desc="It appears here once the strategy brief has been written from sourced facts."
        actions={shared ? [] : [{ label: "See research progress", href: `/d/${d.id}` }]}
      />
    );
  }
  const r = buildReportModel(d, brief, new Date());
  const shareUrl = `${await origin()}/s/${d.shareId}`;
  return (
    <div className="rp-desk">
      <ReportToolbar shareUrl={shareUrl} backHref={shared ? null : `/d/${d.id}/brief`} />
      <PaperFit>
        <A4Report r={r} shareUrl={shareUrl} />
      </PaperFit>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="rp-desk" aria-busy="true">
      <Nis kind="loading" title="Loading the report…" desc="Fetching the brief and its sources." />
      <div className="skel" style={{ width: "min(794px, calc(100vw - 32px))", height: 600 }} />
    </div>
  );
}
