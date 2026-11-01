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

## Founder ranking check (2026-11-01 evening)

The founder ranked the 10 by influence over a US counter-drone startup's first government pilot. The list named NCSIST twice (2nd and 6th) and left out the National Police Agency, so it is compared two ways. "Ours" = Sonnet majority of 3 with the decision 0004 rules.

| Founder rank | Stakeholder | Ours | Our rank |
|---|---|---|---|
| 1 | Defense Committee | Medium 53 | 5 |
| 2 | NCSIST | High 71 | 4 |
| 3 | AIDC | Low 33 | 7 |
| 4 | Armaments Bureau | High 87 | 1 |
| 5 | ITRI | Low 30 | 8 |
| 6 | (NCSIST again; read as National Police Agency) | High 77 | 3 |
| 7 | Coast Guard | High 82 | 2 |
| 8 | Tron Future | Medium 45 | 6 |
| 9 | Taiwania Capital | Low 15 | 9 |
| 10 | Lee and Li | no score | 10 |

Rank agreement (Spearman): **0.44** reading the 6th as the Police Agency, **0.57** dropping the duplicate (Opus: 0.52 / 0.63). Moderate: right at the bottom, wrong in the middle and top.

Where we differ:
1. **The legislature is under-rated.** The Defense Committee scored budget 1 ("can influence priorities"), but the Legislative Yuan approves the defence budget, which the rubric's 3 ("drafts or approves this budget") should cover. The rubric wording led the model to treat "approve" as an executive act.
2. **Gatekeepers are missing.** The founder puts AIDC (state-backed aerospace prime) and ITRI high; we put them low, partly because decision 0004 sets their authority and budget to 0. For a foreign startup the route often runs through a local prime or certifier (the NPA tender is open to domestic firms only), and none of the five factors measures "controls the route in".
3. **Buyers are over-rated relative to the founder.** We rank the Coast Guard and Police Agency 2nd–3rd; the founder 6th–7th.

Caveats: one expert, 10 items, one duplicate. Ask the founder why AIDC and ITRI are 3rd and 5th before changing weights.

## Re-run with the clarified rubric (2-pass + 3rd if split, US$0.36)

| Founder rank | Stakeholder | Before | After |
|---|---|---|---|
| 1 | Defense Committee | Medium 53 | Medium 53 |
| 2 | NCSIST | High 71 | High 70 |
| 3 | AIDC | Low 33 | Low 33 |
| 4 | Armaments Bureau | High 87 | High 87 |
| 5 | ITRI | Low 30 | Medium 50 |
| 6 | National Police Agency | High 77 | High 82 |
| 7 | Coast Guard | High 82 | High 82 |
| 8 | Tron Future | Medium 45 | Medium 62 |
| 9 | Taiwania Capital | Low 15 | Low 6 |
| 10 | Lee and Li | no score | no score |

Spearman fell to **0.34 / 0.43** (from 0.44 / 0.57). The model applied the new wording; the gap is evidence:
- Defense Committee: its sources show it reviewing the drone bill, while the plenary passes the budget, so budget stayed 1.
- AIDC: its sources show it only as one bidder in the NPA tender, so it stayed low.
- Tron Future: the gatekeeper wording lifted it (prime on the Army C-UAS contract), against the founder's view.

Conclusion: the remaining gap is knowledge the founder has that our sources don't (e.g. AIDC as the defence ministry's aerospace prime, the committee's practical power over the defence budget). Rubric wording can't add it; better research queries or expert input as a dated, attributed source can.

Cost: 7 of 10 needed a 3rd pass, so "3rd only if split" averages about 2.7 passes; at S3's live price (about US$0.029 per pass) that is about US$3.8 for 48 entities, still over the US$3.5 Claude cap.
