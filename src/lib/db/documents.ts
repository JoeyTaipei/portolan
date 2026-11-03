import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentType } from "@/lib/types";
import { getDb } from "./client";
import { marketInfo } from "@/lib/markets";

// Document writes and reads for real dossiers (spec §11.3, DOC-6, DOC-9). Briefing note drafts
// go through startBriefingDraft (engine); this file covers the manual services and the PDF
// download. Uploaded PDFs live in the private `documents` bucket and are only ever streamed by
// the server after the dossier id check: never a public URL (risky change: document PDFs).

function db(): SupabaseClient {
  const c = getDb();
  if (!c) throw new Error("The database isn't configured on this server.");
  return c;
}

const TITLE: Record<Exclude<DocumentType, "briefing_note">, { title: string; pages: number | null }> = {
  risk_deck: { title: "Taiwan market and policy risk", pages: 4 },
  watch_list: { title: "90–180 day watch", pages: null },
};

/** DOC-6 for the manual services (risk deck, watch list): a request and a document in Requested. */
export async function requestManual(dossierId: string, type: Exclude<DocumentType, "briefing_note">): Promise<string> {
  // MKT-1: the risk deck names the dossier's market ("Vietnam market and policy risk").
  const m = await db().from("dossiers").select("market").eq("id", dossierId).maybeSingle();
  const market = m.data?.market === "VN" || m.data?.market === "TH" ? m.data.market : "TW";
  const title = type === "risk_deck" ? `${marketInfo(market).name} market and policy risk` : TITLE[type].title;
  const req = await db().from("document_requests").insert({ dossier_id: dossierId, type, expert_review: false }).select("id").single();
  if (req.error) throw new Error(`add request: ${req.error.message}`);
  const doc = await db()
    .from("documents")
    .insert({ dossier_id: dossierId, request_id: req.data.id, type, title, pages: TITLE[type].pages, status: "requested" })
    .select("id")
    .single();
  if (doc.error) throw new Error(`add document: ${doc.error.message}`);
  return doc.data.id as string;
}

/** The PDF bytes of an uploaded document, only when it belongs to this dossier. */
export async function downloadPdf(dossierId: string, documentId: string): Promise<{ bytes: ArrayBuffer; name: string } | null> {
  const r = await db().from("documents").select("storage_path, title").eq("id", documentId).eq("dossier_id", dossierId).maybeSingle();
  if (r.error) throw new Error(`read document: ${r.error.message}`);
  const path = r.data?.storage_path as string | null | undefined;
  // Files are stored under <dossierId>/…; anything else is refused even if a row points to it.
  if (!path || !path.startsWith(`${dossierId}/`)) return null;
  const file = await db().storage.from("documents").download(path);
  if (file.error) throw new Error(`download: ${file.error.message}`);
  const name = `${(r.data?.title as string).replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "document"}.pdf`;
  return { bytes: await file.data.arrayBuffer(), name };
}
