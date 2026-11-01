import { describe, expect, it } from "vitest";
import { filterEntities, type DiscoveredEntity } from "./filter";
import { checkCitation } from "./quality";

const NPA = { name: "National Police Agency, Ministry of the Interior", nameZh: "內政部警政署" };
const ARTICLE = "https://www.upmedia.mg/tw/investigation/military/272263";

describe("source quality filter (spec §7.4)", () => {
  it("accepts a real excerpt that names the organisation (Chinese short name)", () => {
    const excerpt = "警政署主辦的50套關鍵基礎設施無人機反制系統採購案，經過主管機關一個多月的一階段資格標審查";
    expect(checkCitation({ url: ARTICLE, excerpt }, NPA)).toEqual({ ok: true });
  });

  it("rejects menu text", () => {
    const excerpt = "Home | About us | News | Services | Contact | Sitemap\nNational Police Agency | English";
    expect(checkCitation({ url: "https://www.npa.gov.tw/en/app/news", excerpt }, NPA)).toEqual({ ok: false, reason: "Menu text" });
  });

  it("rejects an excerpt that is too short", () => {
    expect(checkCitation({ url: ARTICLE, excerpt: "National Police Agency tender notice." }, NPA)).toEqual({
      ok: false,
      reason: "Excerpt too short",
    });
    expect(checkCitation({ url: ARTICLE, excerpt: "警政署招標" }, NPA)).toEqual({ ok: false, reason: "Excerpt too short" });
  });

  it("rejects a home page only, and database listings", () => {
    const excerpt = "The National Police Agency is Taiwan's central agency for nationwide police administration and command.";
    expect(checkCitation({ url: "https://www.npa.gov.tw/", excerpt }, NPA)).toEqual({ ok: false, reason: "Home page only" });
    expect(checkCitation({ url: "https://tracxn.com/d/companies/x", excerpt }, NPA)).toEqual({
      ok: false,
      reason: "Database listing, not evidence",
    });
  });

  it("rejects an excerpt that names a different organisation", () => {
    const excerpt = "The Coast Guard Administration commissioned 16 shipborne counter-drone systems from a domestic institute.";
    expect(checkCitation({ url: ARTICLE, excerpt }, NPA)).toEqual({ ok: false, reason: "Doesn't mention the organisation" });
    // The parent ministry alone is not a mention of the agency.
    const parent = "The Ministry of the Interior announced a reorganisation of several of its agencies in March 2026.";
    expect(checkCitation({ url: ARTICLE, excerpt: parent }, NPA)).toEqual({ ok: false, reason: "Doesn't mention the organisation" });
  });
});

describe("entity filter (spec §7.2)", () => {
  const e = (name: string, over: Partial<DiscoveredEntity> = {}): DiscoveredEntity => ({
    name,
    nameZh: null,
    category: "ind",
    whyRelevant: "",
    url: null,
    isPerson: false,
    country: "TW",
    ...over,
  });

  it("drops people in China before writing and keeps Chinese organisations", () => {
    const { kept, dropped } = filterEntities(
      [
        e("Zhang Wei", { isPerson: true, country: "CN" }),
        e("Li Na", { isPerson: true, country: "TW", url: "https://example.com.cn/about" }),
        e("DJI", { country: "CN" }),
        e("Wang Hsiao-ming", { isPerson: true, country: "TW" }),
      ],
      [],
    );
    expect(kept.map((k) => k.name)).toEqual(["DJI", "Wang Hsiao-ming"]);
    expect(kept.find((k) => k.name === "DJI")).toMatchObject({ isChina: true, isPerson: false });
    expect(dropped.map((d) => d.reason)).toEqual(["Person in China: organisation level only", "Person in China: organisation level only"]);
  });

  it("does not treat the Republic of China (Taiwan) as China", () => {
    const { kept } = filterEntities([e("Republic of China Army", { country: "Republic of China" })], []);
    expect(kept[0].isChina).toBe(false);
  });

  it("de-duplicates by normalised name, Chinese name and aliases, and keeps at most the limit", () => {
    const { kept, dropped } = filterEntities(
      [
        e("The National Chung-Shan Institute of Science and Technology"),
        e("NCSIST"),
        e("Thunder Tiger Corp.", { nameZh: "雷虎科技" }),
        e("ＴＨＵＮＤＥＲ ＴＩＧＥＲ corp"),
        e("Tiger Thunder", { nameZh: "雷虎科技" }),
        e("Extra one"),
      ],
      [
        { alias: "NCSIST", stakeholderKey: "ncsist" },
        { alias: "National Chung-Shan Institute of Science and Technology", stakeholderKey: "ncsist" },
      ],
      2,
    );
    expect(kept.map((k) => k.key)).toEqual(["ncsist", "thunder tiger corp"]);
    expect(dropped.map((d) => d.reason)).toEqual([
      "Duplicate of The National Chung-Shan Institute of Science and Technology",
      "Duplicate of Thunder Tiger Corp.",
      "Duplicate of Thunder Tiger Corp.",
      "Over the 2-entity limit",
    ]);
  });
});
