import { downloadPdf } from "@/lib/db/documents";
import { isDossierId } from "@/lib/ids";

// GET /d/[id]/docs/[docId]/file: an uploaded PDF (risk deck, watch list), streamed by the
// server from the private bucket after checking the document belongs to this dossier
// (risky change: document PDFs). There is never a public Storage URL. `?download=1` saves it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, ctx: RouteContext<"/d/[id]/docs/[docId]/file">) {
  const { id, docId } = await ctx.params;
  if (!isDossierId(id) || !UUID.test(docId)) return notFound();
  try {
    const file = await downloadPdf(id, docId);
    if (!file) return notFound();
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(file.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[docs] file:", e instanceof Error ? e.message : e);
    return new Response("This file couldn't be opened. Your data is safe; please try again.", { status: 500 });
  }
}
