# Influence score test, 10 stakeholders (2026-11-01)

Does the influence method in `docs/scoring.md` §2 give stable, sourced ratings? Asked by the founder; run with Joey's cost OK.

## What we ran
- 10 stakeholders from the sample dossier (`src/fixtures/sample-dossier.ts`): Armaments Bureau, Coast Guard, NCSIST, National Police Agency, AIDC, Legislative Defense Committee, Taiwania Capital, Lee and Li, Tron Future, ITRI.
- Each got the client goal ("first government pilot within 12 months", US counter-UAS sensor kit), the scoring.md §2.1 rubric, and its accepted source excerpts. The model rated the four factors Claude rates (authority, budget, access, recent) 0–3 or "none", each with a source id and a verbatim quote. Code added network centrality and computed the score with `src/lib/scoring`.
- Claude Sonnet 5.5 three times (consistency), Claude Opus 5.5 once (cross-check), compared with the hand ratings in the sample file.
- 40 calls, **US$0.74** in total (estimate was US$2.70, cap US$4).

## Results

| Stakeholder | Sonnet run 1 | run 2 | run 3 | Opus | Sample file |
|---|---|---|---|---|---|
| MND Armaments Bureau | High 87 | High 87 | High 87 | High 83 | High 87 |
| Coast Guard | High 82 | High 82 | High 82 | High 82 | High 82 |
| National Police Agency | High 77 | High 77 | High 77 | High 82 | High 82 |
| NCSIST | High 70 | High 71 | **Medium 62** | High 70 | High 70 |
| Defense Committee | Medium 53 | Medium 47 | Medium 53 | Medium 53 | Medium 57 |
| ITRI | Medium 40 | **Low 30** | Medium 53 | Medium 53 | Low 31 |
| Tron Future | Medium 45 | **Low 38** | Medium 40 | Low 28 | Low 38 |
| AIDC | Low 33 | **Medium 53** | Low 33 | Low 33 | Medium 52 |
| Taiwania Capital | Low 15 | Low 12 | Low 15 | Low 10 | Low 21 |
| Lee and Li | Low 0 | Low 0 | Low 0 | Low 0 | Low 0 |

| Check | Result |
|---|---|
| Quotes found word-for-word in the cited source | **133 of 133 (100%)**, 0 wrong source ids |
| Same High/Medium/Low level in all 3 Sonnet runs | 6 of 10 |
| Same factor rating in all 3 Sonnet runs | 30 of 40 (75%) |
| Sonnet vs Opus, same factor rating | 32 of 40 (80%) |
| Sonnet vs sample file, same factor rating | 30 of 40 (75%) |

## What it means
1. **Sourcing holds.** Every rating cited a real source and a quote that is really in it. The anti-fabrication rule works.
2. **Clear cases are stable.** The government buyers (Armaments Bureau, Coast Guard, Police Agency) and the clearly peripheral ones (Taiwania, Lee and Li) score the same every time, on both models.
3. **Middle cases wobble, mostly for one reason.** 5 of the 10 disagreements are the model switching between "0" and "none" for the same factor (e.g. AIDC budget: 0 in two runs, "none" in one → Low 33 vs Medium 53). Because a "none" factor is left out of the average, that single switch moves the score by up to 20 points and changes the level. The rest are scores sitting on a level boundary (NCSIST 62 vs 70).
4. **One output is misleading.** Lee and Li shows "Low 0" from a single rated factor. One factor is not enough to show a score.
5. **Not yet tested: is the ranking right?** The "sample file" column was also written by Claude (when the sample was curated), so agreement with it is not expert validation. Only a person who knows Taiwan can say whether this order is correct.

## Proposed changes (need a decision; they change `docs/scoring.md`)
- **A. Rate three times, take the majority** per factor (Sonnet; about +US$0.03 per stakeholder, ~US$1.50 per 48-stakeholder dossier, inside the US$3.5 Claude cap). Removes most run-to-run wobble.
- **B. Make "0 vs none" a code rule for structural cases.** Budget control for companies, investors and law firms is 0 by definition (they don't control government budgets); code sets it, the model doesn't. "None" stays only for "we couldn't find out".
- **C. Show no score below 2 rated factors.** Show "Not enough sourced factors" instead of "Low 0".
- **D. Founder check (10 minutes, free):** rank these 10 from most to least influential for a US counter-drone startup's first government pilot. We compare that order with the scores; that is the number to quote.

Raw outputs and scripts: kept outside the repo (scratchpad), not committed.
