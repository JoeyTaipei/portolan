import "server-only";
import { z } from "zod";

// Structured output for the `rate` and `leads` steps (spec §7.2, docs/scoring.md §2–3).
// Every claim names the source labels it relies on ("S12") and the exact text in that excerpt
// (the quote, checked in code by src/lib/checks/source-check.ts). Number ranges are validated
// in code after parsing, so the JSON schema stays within what structured outputs accept.

const cited = {
  source_ids: z.array(z.string()).describe('Source labels from the <source id="…"> blocks, e.g. "S12"'),
  quote: z.string().describe("Exact text copied from one cited source that supports the claim"),
};

export const RatedFactor = z.enum(["authority", "budget", "access", "recent"]);

export const RatingOutput = z.object({
  role: z
    .object({ value: z.string().describe("What this organisation does that matters for the client's goal, one sentence"), ...cited })
    .nullable(),
  head: z
    .object({
      value: z.string().describe('Name and title of the head, as written in the source, e.g. "Li Shih-chiang (李世強), President"'),
      ...cited,
    })
    .nullable()
    .describe("Only a public official or executive named in a source; null if none, or if the organisation is in China"),
  ratings: z.array(
    z.object({
      factor: RatedFactor,
      rating: z.number().int().describe("0–3 per the rubric"),
      value: z.string().describe("Short reason for the rating, one sentence"),
      ...cited,
    }),
  ),
  statements: z.array(
    z.object({
      rating: z.number().int().describe("−2 clearly against … +2 clearly for foreign companies like the client"),
      summary: z.string().describe("What they said or did, one sentence"),
      source_id: z.string(),
      quote: z.string(),
      stated_at: z.string().nullable().describe("YYYY-MM-DD if the source dates it, else null"),
    }),
  ),
  credibility: z.array(
    z.object({
      source_id: z.string(),
      credibility: z.number().int().describe("Admiralty 1–6: 1 confirmed by other independent sources … 6 cannot be judged"),
      reason: z.string(),
    }),
  ),
  next_step: z
    .object({ value: z.string().describe("One concrete next step for the client with this organisation"), ...cited })
    .nullable(),
  translations: z.array(
    z.object({ source_id: z.string(), text: z.string().describe("English translation of a non-English excerpt") }),
  ),
});
export type RatingOutput = z.infer<typeof RatingOutput>;

export const LeadsOutput = z.object({
  leads: z.array(
    z.object({
      entity_key: z.string().describe("The key attribute of the <entity> block"),
      kind: z.string().describe('e.g. "Venture capital", "Law firm", "Defence exhibition"'),
      why: z.object({ text: z.string(), source_ids: z.array(z.string()) }),
      route: z.string().nullable().describe("How the client reaches them, only if a source shows the route"),
      checks: z.array(
        z.object({
          label: z.enum(["sector", "stage", "experience", "tie"]),
          passed: z.boolean(),
          source_ids: z.array(z.string()),
          note: z.string().describe('e.g. "Sector fit: drones and counter-UAS"'),
        }),
      ),
      event_date: z.string().nullable().describe("Events only: first day, YYYY-MM-DD, as stated in a source"),
    }),
  ),
});
export type LeadsOutput = z.infer<typeof LeadsOutput>;
