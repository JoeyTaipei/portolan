// Normalise each approach's raw output into one entity list and compute the comparison table.
// Usage: node scripts/spike/analyze.mjs   -> writes out/summary.json and prints a table.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { OUT, save } from "./lib.mjs";

const load = (f) => (existsSync(join(OUT, f)) ? JSON.parse(readFileSync(join(OUT, f), "utf8")) : null);
const hasExcerpt = (cites) => cites.some((c) => c.url && (c.excerpts ?? []).some((e) => e && e.trim().length > 20));

// Task API: one entity per list element; evidence = that element's own basis entry ("stakeholders.3").
function fromTask(file) {
  const d = load(file);
  if (!d) return null;
  const { content, basis } = d.result.output;
  const entities = [];
  const groups = { stakeholders: null, investors: "capital", law_firms: "legal", events: "event" };
  for (const [key, cat] of Object.entries(groups)) {
    (content[key] ?? []).forEach((item, i) => {
      const b = basis.find((x) => x.field === `${key}.${i}`);
      const cites = b?.citations ?? [];
      entities.push({
        name: item.name,
        name_local: item.name_local ?? null,
        category: cat ?? item.category,
        claimed_url: item.source_url,
        citations: cites,
        sourced: hasExcerpt(cites),
        confidence: b?.confidence ?? null,
        key_person: item.key_person ?? null,
        key_person_cited: item.key_person ? hasExcerpt(cites) : false,
        dates: item.dates ?? null,
        next_step: item.recommended_next_step ?? item.why_relevant ?? null,
      });
    });
  }
  return { wall_s: d.wall_s, entities, distinct_urls: new Set(basis.flatMap((b) => b.citations.map((c) => c.url))).size };
}

// FindAll: matched candidates only; evidence = basis of match conditions + enrichment fields.
function fromFindAll(label, files, onlyEnriched = false) {
  const entities = [];
  let wall = 0;
  const urls = new Set();
  for (const [q, f] of files) {
    const d = load(f);
    if (!d) continue;
    wall = Math.max(wall, d.wall_s);
    for (const c of d.result.candidates.filter((x) => x.match_status === "matched")) {
      const isEnriched = Object.values(c.output ?? {}).some((o) => o.type === "enrichment");
      // Re-queuing a run for enrichment kept matching past match_limit; those extras are not enriched.
      if (onlyEnriched && !isEnriched) continue;
      const cites = (c.basis ?? []).flatMap((b) => b.citations ?? []);
      cites.forEach((x) => urls.add(x.url));
      const out = c.output ?? {};
      const v = (k) => out[k]?.value ?? null;
      entities.push({
        name: c.name,
        name_local: v("name_local"),
        category: v("category") ?? { gov: "government", industry: "company", investors: "capital", law: "legal", events: "event" }[q],
        query: q,
        claimed_url: c.url,
        citations: cites,
        sourced: hasExcerpt(cites),
        enriched: isEnriched,
        key_person_cited: hasExcerpt((c.basis ?? []).filter((b) => b.field === "key_person").flatMap((b) => b.citations ?? [])),
        key_person: v("key_person"),
        next_step: v("recommended_next_step"),
      });
    }
  }
  return entities.length ? { wall_s: wall, entities, distinct_urls: urls.size, label } : null;
}

// Fixture stakeholders (src/fixtures/taiwan-uas.ts). Generic/fictional nodes are matched by category.
const FIXTURE = [
  ["g1 MND Armaments Bureau", /armament|軍備局/i],
  ["g2 NCSIST", /chung[- ]?shan|ncsist|中科院|中山科學/i],
  ["g3 MOEA Industrial Development Admin.", /industrial development admin|產業發展署|工業局/i],
  ["g4 Civil Aeronautics Admin.", /civil a(eronautics|viation) admin|民用航空局|民航局/i],
  ["g5 NCC", /national communications commission|\bncc\b|通訊傳播委員會/i],
  ["g6 LY Foreign Affairs & National Defense Cttee", /foreign affairs and national defen[cs]e committee|外交及國防委員會/i],
  ["i1 TEDIBOA drone alliance", /tediboa|卓越無人機|drone.*alliance|無人機.*聯盟/i],
  ["i2 State aerospace prime (AIDC)", /aerospace industrial development|aidc|漢翔/i],
  ["i3 Listed drone OEM, Taichung (Thunder Tiger)", /thunder tiger|雷虎/i],
  ["i4 Tier-1 telecom (e.g. Chunghwa)", /chunghwa telecom|中華電信|taiwan mobile|台灣大哥大|far ?eastone|遠傳/i],
  ["i5 Taoyuan component suppliers", /taoyuan|桃園/i],
  ["c4 National Development Fund", /national development fund|國家發展基金|國發基金/i],
  ["l1/l2 Taiwan law firm (export control / cross-border)", null, "legal"],
  ["e1 TADTE", /tadte|aerospace (&|and) defen[cs]e technology exhibition|台北國際航太暨國防工業展/i],
  ["e2 Drone ecosystem summit (generic)", /drone.*(summit|expo|forum|show)|無人機.*(展|論壇|峰會)/i, "event"],
  ["e3 Defense procurement briefing (generic)", /procurement.*(brief|conference|forum|day)|採購.*說明會/i, "event"],
];
// c1 Kestrel and c2 Harbor Lane are fictional; c3 angel syndicate is generic. Not counted.

function fixtureHits(entities) {
  return FIXTURE.map(([label, re, cat]) => {
    const hit = entities.find((e) => {
      const text = `${e.name} ${e.name_local ?? ""}`;
      if (re && cat) return e.category === cat && re.test(text);
      if (re) return re.test(text);
      return e.category === cat;
    });
    return { label, found: hit ? hit.name : null };
  });
}

// Task list + one Task enrichment per entity: evidence = all basis entries of that entity's own run.
function fromTaskEnriched(file, listFile) {
  const d = load(file);
  if (!d) return null;
  const list = load(listFile);
  const urls = new Set();
  const catOf = { investor: "capital", "law firm": "legal", event: "event" };
  const entities = d.runs.map((r) => {
    const out = r.result.output;
    const c = out?.content ?? {};
    const cites = (out?.basis ?? []).flatMap((b) => b.citations ?? []);
    cites.forEach((x) => urls.add(x.url));
    const kp = (out?.basis ?? []).filter((b) => b.field === "key_person").flatMap((b) => b.citations ?? []);
    return {
      name: r.name,
      name_local: c.name_local ?? null,
      category: catOf[r.kind] ?? r.kind,
      claimed_url: c.official_url,
      citations: cites,
      sourced: hasExcerpt(cites),
      key_person: c.key_person ?? null,
      key_person_cited: c.key_person ? hasExcerpt(kp) : false,
      next_step: c.recommended_next_step ?? null,
    };
  });
  return { wall_s: d.wall_s + (list?.wall_s ?? 0), entities, distinct_urls: urls.size };
}

const approaches = {
  "task-pro": fromTask("task-pro.json"),
  "task-ultra": fromTask("task-ultra.json"),
  "findall-base": fromFindAll("findall-base", [["gov", "gov-base.json"], ["industry", "industry-base.json"], ["investors", "investors-base.json"], ["law", "law-base.json"], ["events", "events-base.json"]].map(([q, f]) => [q, `findall-${f}`])),
  "findall-base+enrich": fromFindAll("enriched", ["gov", "industry", "investors", "law", "events"].map((q) => [q, `findall-${q}-enriched-core.json`]), true),
  "task-ultra+enrich": fromTaskEnriched("task-ultra-enriched-core.json", "task-ultra.json"),
};

const summary = {};
for (const [name, a] of Object.entries(approaches)) {
  if (!a) continue;
  const e = a.entities;
  const byCat = (c) => e.filter((x) => x.category === c).length;
  const hits = fixtureHits(e);
  summary[name] = {
    wall_s: a.wall_s,
    entities: e.length,
    sourced_url_and_excerpt: e.filter((x) => x.sourced).length,
    distinct_source_urls: a.distinct_urls,
    capital: byCat("capital"),
    legal: byCat("legal"),
    events: byCat("event"),
    named_people: e.filter((x) => x.key_person).length,
    named_people_with_cited_basis: e.filter((x) => x.key_person && x.key_person_cited).length,
    with_next_step: e.filter((x) => x.next_step).length,
    fixture_found: hits.filter((h) => h.found).length + "/" + hits.length,
    fixture_missing: hits.filter((h) => !h.found).map((h) => h.label),
    fixture_hits: hits,
    entity_list: e.map((x) => ({ name: x.name, category: x.category, sourced: x.sourced, n_citations: x.citations.length, claimed_url: x.claimed_url, key_person: x.key_person })),
  };
}
save("summary.json", summary);
for (const [n, s] of Object.entries(summary)) {
  console.log(`\n### ${n}: ${s.entities} entities, ${s.sourced_url_and_excerpt} with URL+excerpt, ${s.distinct_source_urls} distinct URLs, cap/legal/evt ${s.capital}/${s.legal}/${s.events}, people ${s.named_people} (cited ${s.named_people_with_cited_basis}), fixture ${s.fixture_found}, ${s.wall_s}s`);
  console.log("  missing:", s.fixture_missing.join("; "));
}
