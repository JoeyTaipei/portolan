# YC W2027 application: draft v2

Draft by Claude, 2026-11-03 (v1 was 2026-11-02), for the founder to rewrite in her own words. Submit by **11/3 12:00 Perth**.

How to use this:
- Every fact comes from the repo or the live app, with its file in [brackets]. Delete the brackets before pasting.
- **【創辦人填】** marks what only the founders can write. Nothing has been invented to fill those gaps.
- Rule (founder, 2026-11-01): everything is true. Only signed or paid pilots count as users; everything else counts as "conversations".
- The questions follow YC's usual set (the live form wasn't loaded). Paste each answer into whichever field matches.
- Before submitting: print it, and cut every word that isn't needed (YC's own advice).

## What changed since v1 (11/2)
Shipped and live on 11/2–11/3: an entry verdict (Go / Conditional go / No-go) at the top of the A4; procurement routes and a code-picked "most likely first buyer"; named Taiwanese partner candidates; a "What we could not verify" box; a rule that strips "spec-in" advice; meeting memos that update a stakeholder's influence score; a full 繁體中文 version with a language switch; and a new visual design. The "Competitors" answer now uses our comparison against three AI deep-research reports.

---

## Ready-to-submit checklist (創辦人)

| # | To do | Who | Done |
|---|---|---|---|
| 1 | Rewrite every answer in your own words; delete the [brackets] | Founder | ☐ |
| 2 | Fill every 【創辦人填】 below, or delete the question if it doesn't apply | Founder | ☐ |
| 3 | Record the 1-minute founder video (all founders, no script reading) | Founders | ☐ |
| 4 | Record a 1-minute demo: /d/sample → map → A4 report → switch to 繁中 → tracker debrief | Founder | ☐ |
| 5 | Open the links below in a private window and check they load without sign-up | Founder | ☐ |
| 6 | Confirm the numbers under "Are people using your product?" are exact | Founder | ☐ |
| 7 | Equity split, incorporation and any money raised | Founders | ☐ |
| 8 | Each founder's YC profile filled (education, work, LinkedIn) | Each founder | ☐ |
| 9 | Print, cut words, submit before 12:00 Perth | Founder | ☐ |

Links to check:
- App: https://portolan-nu.vercel.app
- Sample market (no sign-up): https://portolan-nu.vercel.app/d/sample
- One-page report: https://portolan-nu.vercel.app/d/sample/report
- Waitlist: https://portolan-nu.vercel.app/waitlist

---

## Company

**Company name**
Portolan

**Describe what your company does in 50 characters or less**
Sourced stakeholder maps for entering Taiwan
(44 characters)

**Company URL / demo**
https://portolan-nu.vercel.app (the sample market opens without sign-up: https://portolan-nu.vercel.app/d/sample)
Demo video: 【創辦人填: link after recording】

**What is your company going to make? Please describe your product and what it does or will do.**
Portolan helps startups win their first customer or partner in a foreign market, starting with US and European drone and defense-tech startups selling to Taiwan.

You enter your company, product and goal (for example, "a first government pilot in 12 months"). Portolan researches public sources and returns a map of who decides: government agencies, primes, investors, lawyers and events, each scored for influence and support. Every name, score and recommendation links to a source with the exact excerpt and the date it was checked. Anything without a source is marked unverified, and the report lists what we could not verify.

The output is a one-page report a founder can act on the same week: a Go / Conditional go / No-go verdict with its conditions, the most likely first buyer and the procurement route to reach them, named Taiwanese partner candidates, the entry requirements that can kill a deal, and the three people to contact first, each with a next step. It comes in English and Traditional Chinese, so it can be handed to a Taiwanese partner as is. After each meeting, a 30-second debrief updates that stakeholder's support and influence and rewrites the plan.
[design/intent.md §1, §4, §9; PRs #20, #21, #23, #24, #25, #26, #27–#29]

**Where do you live now, and where would the company be based after YC?**
【創辦人填】

## Progress

**How far along are you?**
The product is live at https://portolan-nu.vercel.app. All eight screens from our design work are built: market setup, the 3D stakeholder map and power matrix, strategy brief, one-page A4 report with a share link, tracker with post-meeting debriefs, network (investors, lawyers, events, partner candidates), documents (AI-drafted meeting briefings), and a team layer showing which teammates already know someone at each organisation. The team layer runs on sample data only until a privacy lawyer reviews it.

We ran one full market end to end (a US counter-UAS startup, as a pilot test): 41 stakeholders mapped from 292 sources, at a research cost of US$4.48. For that case Portolan's verdict is "Conditional go": a first pilot will likely need a Taiwanese integrator, because the National Police Agency's tender bars foreign bidders.
[docs/decisions/0001-research-engine.md; /d/sample/report]

We built it in six days (first commit 2026-10-29), shipping 30 merged pull requests, each with tests and a review before merge. [GitHub JoeyTaipei/portolan]

**How long have each of you been working on this? How much of that has been full-time?**
Code started 2026-10-29 [git log]. 【創辦人填: when the idea started, and full-time or part-time for each founder】

**What tech stack are you using, or planning to use?**
Next.js on Vercel, Supabase Postgres, Parallel's Task API for web research, and the Claude API for rating evidence and writing. Claude only rates evidence against a fixed rubric and cites source ids; code computes every score, picks who to contact first and picks the first buyer, so the numbers are reproducible. Code then checks every sentence Claude writes: a sentence whose quote isn't in its source, or that recommends writing a tender's specs for the buyer, is removed. The app was built with Claude Code agents, one feature per branch.
[CLAUDE.md tech stack; docs/decisions/0002-scoring-and-brief.md; PR #24]

**Are people using your product?**
【創辦人填: be exact. As of 11/3, docs/users.md has no interviews logged, there are no signed or paid pilots, and the waitlist page (live since 11/2) has 1 entry. Write the number of conversations and quote what people said. Don't count our own test markets as users.】

**Do you have revenue?**
No. 【創辦人填: change this if anyone has paid or signed by submission time】

**If you are applying with the same idea as a previous batch, what changed?** Skip unless it applies.

## Idea

**Why did you pick this idea to work on? Do you have domain expertise? How do you know people need what you're making?**
【創辦人填 in your own words. The facts you gave on 10/30: you did market-entry reviews, have international-affairs training, and now work at Global UAV Academy, where you meet drone suppliers.】

What founders entering Taiwan told you: today they go through the chamber of commerce or people they already know; the language barrier makes the market hard; when it goes wrong they lose deals, time and their market niche. [docs/decisions/2026-10-30-founder-answers.md Q3–Q4]

Why now: Taiwan's Executive Yuan proposed a five-year NT$210 billion (about US$6.6B) drone budget in 2026 [mnd.gov.tw/en/News/MND/87537], and the Armaments Bureau plans to procure 48,750 drones in 2026–27 [trade.gov Taiwan country commercial guide, "Highly automated and autonomous systems"]. Foreign drone startups want in, and most have no one on the ground.

**Who are your competitors? What do you understand about your business that they don't?**
Today a startup combines free help from AmCham Taiwan, TAITRA and InvestTaiwan, a US$20–200/month deep-research tool, and, if it can afford one, a well-connected consultant. [design/intent.md §2]

We ran the same Taiwan drone-entry question through three AI deep-research tools and compared them with our one-page report. They read well, but: their citations didn't open or there were none; they named agencies that don't exist in Taiwan or were renamed years ago; their two-year budgets differed by 2–4×, so the numbers were guesses; and one recommended "spec-in" (helping the buyer write tender specs to exclude rivals), which can breach Article 26 of Taiwan's Government Procurement Act. [side-session note report-comparison.md, 2026-11-02; reports/顧問級進場報告改進建議.md]

What we understand: in defense, one wrong name or one illegal suggestion ends the relationship, so a report that looks complete is worse than useless if it can't be checked. Portolan makes fewer claims, and every one can be traced. It says what it couldn't verify instead of filling the gap. And post-meeting debriefs build data nobody else has: which path into each agency actually worked. We don't replace the chambers and consultants; we turn their meetings into a strategy and a record.
[design/intent.md §1 moat]

**How do or will you make money? How much could you make?**
The startup entering Taiwan pays: a free preview (map, top three stakeholders, one score), then a one-off full dossier with the A4 report (founder price US$4,000+), plus meeting briefings (US$300–800 each) and policy risk briefings (US$1.5k–5k). Pilots are full price with a discount. No success fees and no commission on introductions. Local experts get a fixed fee per document they review. [docs/decisions/0003-architecture-and-business.md; design/intent.md §7–8]
Research costs us about US$4.50 per dossier, so gross margin on a dossier is high; expert review is the main variable cost. [docs/decisions/0001-research-engine.md]
【創辦人填: market size. Number of foreign drone/defense startups targeting Taiwan × price. Use only a number you can source.】

**Biggest risks and how we'll handle them** (no form field of its own; fold into the answers above or "anything else")
1. Demand isn't proven yet. Nobody has paid. We're delivering the first dossiers by hand to 5–10 founders we know, and will count only signed or paid pilots. [design/intent.md §15]
2. Trust: one wrong name or title in a defense context ends a relationship. Every fact needs a source, excerpt and check date; anything else is labelled unverified; documents carry the reviewer's name, and named people are re-checked after 90 days. [design/intent.md §9; §7]
3. Legal advice by accident: AI tools suggest tactics that are illegal locally (see spec-in above). Our prompts forbid it and code removes any sentence that suggests it. [PR #24]
4. Privacy: the team-network feature holds contact details of people who never signed up. It stays on sample data until a lawyer reviews it under Taiwan, EU, US, Japan and Singapore privacy law; uploads keep only name, organisation, title and LinkedIn link, and a member can withdraw at once. [design/intent.md §6]

**Which category best applies?** B2B 【創辦人 confirm】

**What other ideas did you consider?** 【創辦人填】

## Founders

**Please tell us about something impressive that each founder has built or achieved.**
【創辦人填, one or two sentences per founder. Pick the hardest thing, with numbers.】
A fact you can use for Joey: built and shipped the whole product, live, in six days with Claude Code (30 merged PRs). [GitHub]

**Please tell us about the time you most successfully hacked some (non-computer) system to your advantage.**
【創辦人填】

**Who writes code, or does other technical work on your product?**
【創辦人填: Joey builds the product with Claude Code agents; say who does what】

**How did the founders meet / how long have you known each other?** 【創辦人填】

## Equity and legal
【創辦人填: incorporation, equity split, any investment】

## Curious
**What convinced you to apply? How did you hear about YC?** 【創辦人填】
