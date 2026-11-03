import { describe, expect, it } from "vitest";
import { buildBriefModel } from "@/components/brief/model";
import { buildHomeModel } from "@/components/home/model";
import { buildReportModel } from "@/components/report/model";
import { SAMPLE_ZH } from "@/fixtures/sample-dossier.zh";
import { sampleDossier } from "@/lib/sample/reader";
import { makeT, toLocale, translateRuntime, zhDates } from "./index";
import { zhTW } from "./zh-TW";

// SHELL-4 (plan S17): English is the key and the fallback; `t.x` translates only code-written
// sentences and copies every `{…}` value as it is, so sources and names stay verbatim (I18N-4).

const en = makeT("en");
const zh = makeT("zh-TW");

describe("locale", () => {
  it("only zh-TW switches; anything else is English", () => {
    expect(toLocale("zh-TW")).toBe("zh-TW");
    expect(toLocale("zh-CN")).toBe("en");
    expect(toLocale(undefined)).toBe("en");
  });
});

describe("t", () => {
  it("English returns the key with values filled in", () => {
    expect(en("{n} of {m} sources shown", { n: 3, m: 9 })).toBe("3 of 9 sources shown");
    expect(en("Markets")).toBe("Markets");
  });

  it("Chinese uses the dictionary", () => {
    expect(zh("Markets")).toBe("市場");
    expect(zh("{n} of {m} sources shown", { n: 3, m: 9 })).toBe("顯示 9 個來源中的 3 個");
  });

  it("no Chinese entry is empty or a placeholder", () => {
    for (const [k, v] of Object.entries(zhTW)) {
      expect(v.trim(), k).not.toBe("");
      expect(v, k).not.toMatch(/\[(CLIENT|DATE)\]|TODO|lorem/i);
    }
  });

  it("every {value} in a key is kept in its Chinese text", () => {
    for (const [k, v] of Object.entries(zhTW)) {
      const names = (s: string) => [...s.matchAll(/\{(\w+)(?:\|[tln])?\}/g)].map((m) => m[1]).sort();
      expect(names(v), k).toEqual(names(k));
    }
  });
});

describe("t.x (code-written sentences built elsewhere)", () => {
  it("matches a pattern and keeps the name verbatim", () => {
    expect(zh.x("Influence: Ministry of National Defense")).toBe("影響力：Ministry of National Defense");
    expect(zh.x("Based on 3 of 5 factors")).toBe("根據 5 項因素中的 3 項");
  });

  it("translates marked values and lists", () => {
    expect(zh.x("High · 70–85")).toBe("高 · 70–85");
    expect(zh.x("Entry requirements: no source found for local content, import permit.")).toBe("進入條件：找不到在地化比例、進口許可的來源。");
  });

  it("number placeholders never swallow a sentence", () => {
    expect(translateRuntime("Full list of the sources")).toBe("Full list of the sources");
  });

  it("anything unknown comes back unchanged, and English is untouched", () => {
    expect(zh.x("A sentence Claude wrote about MiTAC.")).toBe("A sentence Claude wrote about MiTAC.");
    expect(en.x("Based on 3 of 5 factors")).toBe("Based on 3 of 5 factors");
  });

  it("dates in a date value turn Chinese; other values keep theirs", () => {
    expect(zh.x("checked 2 Nov 2026")).toBe("查證於 2026年11月2日");
    expect(zh.x("until 2026 Budget Hearing 3 Nov 2026, 4 Nov 2026")).toBe("到 2026 Budget Hearing 3 Nov 2026，2026年11月4日");
    expect(zhDates("8 Nov")).toBe("11月8日");
  });

  it("leaves every sample source title and excerpt unchanged", () => {
    for (const s of sampleDossier.sources) {
      expect(zh.x(s.title)).toBe(s.title);
      expect(zh.x(s.excerpt)).toBe(s.excerpt);
    }
    for (const s of sampleDossier.stakeholders) expect(zh.x(s.name)).toBe(s.name);
  });
});

describe("t.date", () => {
  it("formats a calendar day in each language", () => {
    expect(en.date("2026-11-02")).toBe("2 Nov 2026");
    expect(zh.date("2026-11-02")).toBe("2026年11月2日");
  });
});

describe("the sample's research-written sentences in 繁中 (I18N-8)", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  const m = buildHomeModel(sampleDossier, now);
  const brief = sampleDossier.briefs.at(-1)!;
  const b = buildBriefModel(sampleDossier, brief, now);
  const r = buildReportModel(sampleDossier, brief, now);
  const english = [
    m.name,
    ...m.judgments.map((j) => j.text),
    ...m.moves.map((x) => x.step),
    ...b.rationale.map((x) => x.text),
    ...b.path.map((x) => x.why.text),
    ...b.reduce.map((x) => x.step.text),
    ...b.plan.flatMap((x) => x.actions.map((a) => a.text)),
    ...b.requirements.map((x) => x.text),
    ...b.routes.map((x) => x.text),
    ...b.needs,
    ...b.summary.map((x) => x.text),
    ...b.risks.map((x) => x.text),
    ...r.top.map((x) => x.next),
    ...r.plan.filter((p) => p.refs.length > 0).map((p) => p.text),
    r.preparedFor!.company,
    r.preparedFor!.product,
  ];

  it("every sentence on the sample's market page, brief and A4 has a Chinese version", () => {
    for (const s of english) expect(SAMPLE_ZH[s], s).toBeTruthy();
    for (const s of english) expect(zh.r(s)).not.toBe(s);
  });

  it("every number in the Chinese matches the English", () => {
    const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    // English → the numbers a Chinese reader sees: "210 billion" is 2,100 億; "27 August 2026" is
    // 2026年8月27日; "in August" is 8 月.
    const norm = (s: string) =>
      s
        .replace(/(\d+) billion/g, (_, n) => `${(Number(n) * 10).toLocaleString("en")} 億`)
        .replace(new RegExp(`(\\d{1,2}) (${MONTH.join("|")}) (\\d{4})`, "g"), (_, d, mo, y) => `${y} ${MONTH.indexOf(mo) + 1} ${d}`)
        .replace(new RegExp(`\\b(${MONTH.join("|")})\\b`, "g"), (mo) => `${MONTH.indexOf(mo) + 1}`);
    const nums = (s: string) => (s.match(/\d+(?:[,.]\d+)*/g) ?? []).sort();
    for (const [en, zhText] of Object.entries(SAMPLE_ZH)) expect(nums(zhText), en).toEqual(nums(norm(en)));
  });

  it("names come from the stakeholders' own sourced Chinese names, and real dossiers stay English", () => {
    expect(SAMPLE_ZH[m.judgments[0].text]).toContain("內政部警政署");
    expect(zh.r("A sentence a real dossier's brief wrote.")).toBe("A sentence a real dossier's brief wrote.");
    expect(zh.n("Ministry of National Defense")).toBe("國防部");
    expect(zh.x(b.firstBuyer!.explain.result)).toBe("內政部警政署，警政與關鍵基礎設施");
    expect(en.r(m.judgments[0].text)).toBe(m.judgments[0].text);
  });
});
