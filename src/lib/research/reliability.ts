import type { Reliability, SourceType } from "@/lib/types";
import { hostOf } from "./quality";

// Starting Admiralty reliability A–F from the domain (spec §7.5). Editable: add domains here.
// .gov.tw and Legislative Yuan gazettes = A (and, for MKT-1, .gov.vn and .go.th); wire services and major newspapers = B;
// trade press and company sites = C; blogs and aggregators = D; unknown = F.

interface Rule {
  domains: string[];
  reliability: Reliability;
  sourceType: SourceType;
}

const RULES: Rule[] = [
  { domains: ["ly.gov.tw", "lis.ly.gov.tw"], reliability: "A", sourceType: "legislative_record" },
  { domains: ["gazette.nat.gov.tw", "gazette2.nat.gov.tw"], reliability: "A", sourceType: "government_gazette" },
  { domains: ["gov.tw", "mil.tw", "gov.taipei", "nat.gov.tw"], reliability: "A", sourceType: "government_site" },
  // MKT-1: Vietnam (government portal, ministries, National Assembly) and Thailand (go.th covers ministries and agencies).
  { domains: ["gov.vn", "chinhphu.vn", "quochoi.vn", "go.th"], reliability: "A", sourceType: "government_site" },
  {
    domains: [
      "cna.com.tw", "focustaiwan.tw", "reuters.com", "apnews.com", "bloomberg.com", "afp.com",
      "taipeitimes.com", "udn.com", "ltn.com.tw", "chinatimes.com", "cw.com.tw", "nikkei.com",
      "asia.nikkei.com", "ft.com", "wsj.com", "nytimes.com", "bbc.com", "bbc.co.uk",
      "theguardian.com", "taiwannews.com.tw", "upmedia.mg", "storm.mg", "rti.org.tw", "pts.org.tw",
      "economist.com", "scmp.com",
      // MKT-1: Vietnam and Thailand wire services and national papers.
      "vietnamplus.vn", "vnexpress.net", "tuoitre.vn", "thanhnien.vn", "vietnamnews.vn", "vir.com.vn",
      "bangkokpost.com", "nationthailand.com", "thaipbs.or.th", "thaipbsworld.com", "khaosodenglish.com",
    ],
    reliability: "B",
    sourceType: "news",
  },
  { domains: ["gov", "mil", "europa.eu", "gov.uk"], reliability: "B", sourceType: "government_site" },
  {
    domains: [
      "defensenews.com", "breakingdefense.com", "janes.com", "digitimes.com", "digitimes.com.tw",
      "thedefensepost.com", "c4isrnet.com", "armadainternational.com", "dronelife.com",
      "dronexl.co", "cmmedia.com.tw", "technews.tw", "ithome.com.tw", "businessweekly.com.tw",
      "trendforce.com", "edn.com", "eetimes.com",
    ],
    reliability: "C",
    sourceType: "trade_press",
  },
  {
    domains: ["tracxn.com", "crunchbase.com", "zoominfo.com", "pitchbook.com", "linkedin.com", "dnb.com"],
    reliability: "D",
    sourceType: "database",
  },
  {
    domains: [
      "medium.com", "substack.com", "blogspot.com", "wordpress.com", "wikipedia.org", "reddit.com",
      "quora.com", "facebook.com", "x.com", "twitter.com", "youtube.com", "pixnet.net", "vocus.cc",
    ],
    reliability: "D",
    sourceType: "other",
  },
];

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * Grade a URL. `officialUrl` is the organisation's own site from enrich: a page on it is a
 * company site (C) unless a rule above already grades the domain higher.
 */
export function gradeSource(url: string, officialUrl?: string | null): { reliability: Reliability; sourceType: SourceType } {
  const host = hostOf(url);
  if (!host) return { reliability: "F", sourceType: "other" };
  for (const r of RULES) if (r.domains.some((d) => hostIs(host, d))) return { reliability: r.reliability, sourceType: r.sourceType };
  const own = officialUrl ? hostOf(officialUrl) : null;
  if (own && (hostIs(host, own) || hostIs(own, host))) return { reliability: "C", sourceType: "company_site" };
  return { reliability: "F", sourceType: "other" };
}
