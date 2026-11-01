import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BriefingNote } from "@/components/docs/briefing-note";
import { NoteSkeleton } from "@/components/docs/note-skeleton";
import { sourceRef, type SourceRef } from "@/components/score/explain";
import { loadDossier } from "@/lib/db/load-dossier";

export const metadata = { title: "Briefing note · Portolan" };

// 08 Briefing note (spec §12). Real dossiers: the document must belong to this dossier, else
// 404. The sample may also open a note this browser requested (kept in localStorage), so an
// unknown sample id is resolved in the browser. Only the cited sources' labels go down.
export default function NotePage({ params }: PageProps<"/d/[id]/docs/[docId]">) {
  return (
    <Suspense fallback={<NoteSkeleton />}>
      <NoteContent params={params} />
    </Suspense>
  );
}

async function NoteContent({ params }: Pick<PageProps<"/d/[id]/docs/[docId]">, "params">) {
  const { id, docId } = await params;
  const d = await loadDossier(id);
  if (!d) notFound();
  await connection();
  const doc = d.documents.find((x) => x.id === docId) ?? null;
  if (!doc && !d.isSample) notFound();
  // The sample's browser-only notes can cite any sample source; a real note only its own.
  const cited = new Set(doc?.content?.sourceIds ?? d.sources.map((s) => s.id));
  const refs: Record<string, SourceRef> = {};
  for (const s of d.sources) if (s.accepted && cited.has(s.id)) refs[s.id] = sourceRef(s);
  const names = Object.fromEntries(d.stakeholders.map((s) => [s.id, s.name]));
  const eta = process.env.EXPERT_REVIEW_ETA_TEXT || "within 4 weeks";
  return <BriefingNote dossierId={d.id} isSample={d.isSample} doc={doc} docId={docId} refs={refs} names={names} etaText={eta} />;
}
