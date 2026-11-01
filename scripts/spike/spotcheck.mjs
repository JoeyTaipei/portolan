// Spot-check that excerpts really appear at their URL. Fetches each page directly (not via Parallel),
// strips tags, and looks for each excerpt chunk verbatim after whitespace/punctuation normalisation.
// Page text is only searched as data; nothing from it is executed or followed.
// Usage: node scripts/spike/spotcheck.mjs <picks.json>   (array of {approach, entity, url, excerpt})
import { readFileSync } from "node:fs";
import { save } from "./lib.mjs";

const picks = JSON.parse(readFileSync(process.argv[2], "utf8"));

const norm = (s) =>
  s
    .normalize("NFKC")
    .replace(/\*\*|__|^#+ /gm, "") // excerpts come back as markdown
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();

const pageText = (html) =>
  norm(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

const results = [];
for (const p of picks) {
  let status = null;
  let text = "";
  try {
    const res = await fetch(p.url, {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36", "accept-language": "en,zh-TW;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    status = res.status;
    text = pageText(await res.text());
  } catch (e) {
    status = `error: ${e.message}`;
  }
  // Excerpts often join non-adjacent passages with "..." — check each chunk of 25+ characters.
  const chunks = p.excerpt.split(/\.\.\.|…|\n+/).map((c) => norm(c).trim().replace(/^[-*#\s]+/, "")).filter((c) => c.length >= 25);
  const found = chunks.filter((c) => text.includes(c) || text.includes(c.slice(0, 60)));
  results.push({
    ...p,
    http_status: status,
    page_chars: text.length,
    chunks: chunks.length,
    chunks_found: found.length,
    verdict: !text ? "page not fetchable" : found.length === chunks.length ? "verbatim" : found.length ? "partial" : "not found in fetched HTML",
  });
  console.log(`${results.at(-1).verdict.padEnd(26)} ${found.length}/${chunks.length} ${status} ${p.url}`);
}
save("spotcheck.json", results);
