import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DocsSkeleton } from "@/components/docs/docs-skeleton";
import { DocsView } from "@/components/docs/docs-view";
import { buildDocsModel } from "@/components/docs/model";
import { WaitlistLink } from "@/components/waitlist/waitlist-link";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "Documents · Portolan" };

// 07 Documents (spec §12). `?item=<tracker item id>` opens the request form with that meeting
// preselected (TRK-8). Expected finish for expert review comes from EXPERT_REVIEW_ETA_TEXT.
export default function DocsPage({ params, searchParams }: PageProps<"/d/[id]/docs">) {
  return (
    <Suspense fallback={<DocsSkeleton />}>
      <DocsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DocsContent({ params, searchParams }: Pick<PageProps<"/d/[id]/docs">, "params" | "searchParams">) {
  const { id } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  const sp = await searchParams;
  const eta = process.env.EXPERT_REVIEW_ETA_TEXT || "within 4 weeks";
  return (
    <DocsView
      vm={buildDocsModel(d, eta, new Date())}
      preselect={typeof sp.item === "string" ? sp.item : null}
      footer={<WaitlistLink from="docs" className="mt-auto" />}
    />
  );
}
