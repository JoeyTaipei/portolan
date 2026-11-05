import type { Market } from "@/lib/types";

// MKT-1: the words that change with a dossier's target market.
export interface MarketInfo {
  /** "Vietnam" — used in prompts, Parallel inputs and UI copy (an i18n key). */
  name: string;
  /** "Vietnamese" — "No Vietnamese firm…", "Through a Vietnamese partner" (an i18n key). */
  adjective: string;
  /** Official country name for the home header. */
  country: string;
  /** The procurement law the no-spec-in rule cites. */
  procurementLaw: string;
}

export const MARKETS: Record<Market, MarketInfo> = {
  TW: {
    name: "Taiwan",
    adjective: "Taiwanese",
    country: "Republic of China (Taiwan)",
    procurementLaw: "Taiwan Government Procurement Act Art. 26 and Art. 88",
  },
  VN: {
    name: "Vietnam",
    adjective: "Vietnamese",
    country: "Socialist Republic of Viet Nam",
    procurementLaw: "Vietnam's Law on Bidding",
  },
  TH: {
    name: "Thailand",
    adjective: "Thai",
    country: "Kingdom of Thailand",
    procurementLaw: "Thailand's Public Procurement and Supplies Administration Act B.E. 2560",
  },
  // MKT-3: fixture-only sample markets (the 碳基 demo); not offered in the new-market form.
  US: {
    name: "United States",
    adjective: "American",
    country: "United States of America",
    procurementLaw: "the US Federal Acquisition Regulation (FAR) and DFARS",
  },
  JP: {
    name: "Japan",
    adjective: "Japanese",
    country: "Japan",
    procurementLaw: "Japan's Accounts Act and Ministry of Defense procurement rules",
  },
  PL: {
    name: "Poland",
    adjective: "Polish",
    country: "Republic of Poland",
    procurementLaw: "Poland's Public Procurement Law",
  },
  PH: {
    name: "the Philippines",
    adjective: "Philippine",
    country: "Republic of the Philippines",
    procurementLaw: "the Philippines' New Government Procurement Act (Republic Act No. 12009)",
  },
};

export const MARKET_CODES = Object.keys(MARKETS) as Market[];

export const marketInfo = (m: Market | null | undefined): MarketInfo => MARKETS[m ?? "TW"] ?? MARKETS.TW;
