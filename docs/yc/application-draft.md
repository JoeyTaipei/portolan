# YC W2027 application: draft

Draft by Claude, 2026-11-02, for the founder to rewrite in her own words. Submit by 11/3 12:00 Perth.

How to use this:
- Every fact comes from the repo, with its file in [brackets]. Delete the brackets before pasting.
- **【創辦人填】** marks what only the founders can write. Nothing has been invented to fill those gaps.
- Rule (founder, 2026-11-01): everything is true. Only signed or paid pilots count as users; everything else counts as "conversations".
- I couldn't load the live form, so the questions below follow YC's usual set. Paste each answer into whichever field matches.
- Before submitting: print it, and cut every word that isn't needed (YC's own advice).

---

## Company

**Company name**
Portolan

**Describe what your company does in 50 characters or less**
Sourced stakeholder maps for entering Taiwan
(44 characters)

**Company URL / demo**
https://portolan-nu.vercel.app (the sample market opens without sign-up: https://portolan-nu.vercel.app/d/sample)
Demo video: 【創辦人填: link after tonight's recording】

**What is your company going to make? Please describe your product and what it does or will do.**
Portolan helps startups win their first customer or partner in a foreign market, starting with US and European drone and defense-tech startups selling to Taiwan. You enter your company, product and goal (for example, "a first government pilot in 12 months"). Portolan researches public sources and returns a map of who decides: government agencies, primes, investors, lawyers and events, each scored for influence and support. Every name, score and recommendation links to a source with the exact excerpt and the date it was checked; anything without a source is marked unverified. From the map you get a strategy brief, a one-page A4 report to share, and the three people to contact first, each with a concrete next step. After each meeting, a 30-second debrief updates that stakeholder's support score and the plan.
[design/intent.md §1, §4, §9; product rules in CLAUDE.md]

**Where do you live now, and where would the company be based after YC?**
【創辦人填】

## Progress

**How far along are you?**
The product is live at https://portolan-nu.vercel.app. All eight screens from our design work: market setup, the 3D stakeholder map and power matrix, strategy brief, one-page A4 report with share link, tracker with post-meeting debriefs, network (investors, lawyers, events), documents (AI-drafted meeting briefings), and a team layer showing which teammates already know someone at each organisation. The team layer runs on sample data only until a privacy lawyer reviews it.
We ran one full dossier end to end (a US counter-UAS startup, as a pilot test): 41 stakeholders mapped from 292 sources, at a research cost of US$4.48.
[docs/workflow.html; docs/decisions/0001-research-engine.md; live share link of that dossier]

**How long have each of you been working on this? How much of that has been full-time?**
Code started 2026-10-29 [git log]. 【創辦人填: when the idea started, and full-time or part-time for each founder】

**What tech stack are you using, or planning to use?**
Next.js on Vercel, Supabase Postgres, Parallel's Task API for web research, and the Claude API for scoring and writing. The model only rates evidence against a fixed rubric and cites source ids; code computes every score, so the numbers are reproducible. The app was built with Claude Code agents, one feature per branch, each with tests and a review before merge.
[CLAUDE.md tech stack; docs/decisions/0002-scoring-and-brief.md]

**Are people using your product?**
【創辦人填: be exact. As of 11/2, docs/users.md has no interviews logged and no signed or paid pilots. Write the number of conversations and quote what people said.】

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
What we understand: a market summary isn't the hard part, because general AI already writes decent ones. The hard part is knowing who actually decides, who supports you, and what happened in the last meeting. So every claim is sourced and checkable. Experts in this field won't trust a number they can't trace, and the post-meeting debriefs build data nobody else has: which path into each agency actually worked. We don't replace the chambers and consultants; we turn their meetings into a strategy and a record.
[design/intent.md §1 moat]

**How do or will you make money? How much could you make?**
The startup entering Taiwan pays: a free preview (map, top three stakeholders, one score), then a one-off full dossier with the A4 report (founder price US$4,000+), plus meeting briefings (US$300–800 each) and policy risk briefings (US$1.5k–5k). Pilots are full price with a discount. No success fees and no commission on introductions. Local experts get a fixed fee per document they review. [docs/decisions/0003-architecture-and-business.md; design/intent.md §7–8]
Research costs us about US$4.50 per dossier, so gross margin on a dossier is high; expert review is the main variable cost. [docs/decisions/0001-research-engine.md]
【創辦人填: market size. Number of foreign drone/defense startups targeting Taiwan × price. Use only a number you can source.】

**Biggest risks and how we'll handle them** (no form field of its own; fold into the answers above or "anything else")
1. Demand isn't proven yet. Nobody has paid. We're delivering the first dossiers by hand to 5–10 founders we know, and will count only signed or paid pilots. [design/intent.md §15]
2. Trust: one wrong name or title in a defense context ends a relationship. Every fact needs a source, excerpt and check date; anything else is labelled unverified; documents carry the reviewer's name, and named people are re-checked after 90 days. [design/intent.md §9; §7]
3. Privacy: the team-network feature holds contact details of people who never signed up. It stays on sample data until a lawyer reviews it under Taiwan, EU, US, Japan and Singapore privacy law; uploads keep only name, organisation, title and LinkedIn link, and a member can withdraw at once. [design/intent.md §6; S7 production check 2026-11-02]

**Which category best applies?** B2B 【創辦人 confirm】

**What other ideas did you consider?** 【創辦人填】

## Founders

**Please tell us about something impressive that each founder has built or achieved.**
【創辦人填, one or two sentences per founder. Pick the hardest thing, with numbers.】

**Please tell us about the time you most successfully hacked some (non-computer) system to your advantage.**
【創辦人填】

**Who writes code, or does other technical work on your product?**
【創辦人填: Joey builds the product with Claude Code agents; say who does what】

**How did the founders meet / how long have you known each other?** 【創辦人填】

## Equity and legal
【創辦人填: incorporation, equity split, any investment】

## Curious
**What convinced you to apply? How did you hear about YC?** 【創辦人填】
