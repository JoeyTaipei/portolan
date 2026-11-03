# Portolan MVP Plan (docs/plan.md)

- Written 2026-11-01 16:00 Perth. Sources: `CLAUDE.md`, `docs/spec.md` (§0 decisions, §4 slices), `docs/scoring.md`, `docs/decisions/`, `design/direction.md`, `design/intent.md` §5 and §15, `docs/workflow.html` (YC and timeline).
- YC: submit **11/2 evening Perth**; hard deadline **11/3 12:00 Perth**. About 28 hours of build time, two lanes (ui, engine) in parallel.
- Slices are exactly spec §4: S0, S0b, S1–S8. Feature IDs (HOME-3, MAP-9…) are the spec's.
- If this plan conflicts with the spec, the spec wins; if the spec conflicts with intent.md, intent wins. Stop and ask.

---

## 1. Priority and order

| Priority | What | Slices | Rule |
|---|---|---|---|
| **P1** | YC demo path on `/d/sample` (sample only, no paid APIs) | S0 → S1, S2, S5 (ui); S0b in parallel (engine) | Nothing else starts in the ui lane until S5 is done |
| **P2** | Real dossiers | S3 → S4 (engine) | Not on the critical path for first users: pilot dossiers are made by hand by the team until S4 lands (intent §15) |
| **P3** | Network, documents, team network | S6, then S7 | Required, not cut. If they slip they ship after the demo path; the YC application states their status honestly |
| **P4** | Pre-launch check | S8 | Runs before the URL goes to users. If S6/S7 slip, S8 runs on what is merged, and its security pass reruns on S6/S7 when they land |

### Timeline (Perth time; Joey assumed asleep about 00:00–08:00, `/goal` keeps running)

| Clock | ui lane | engine lane | Joey |
|---|---|---|---|
| 11/1 16:00–19:30 | **S0** (3.5 h) | idle (waits for S0) | Confirm the package list; `supabase login` + `link` in your own terminal |
| 19:30–20:00 | S0 PR | — | Review preview, merge S0 |
| 20:00–00:30 | **S1** (4.5 h) | **S0b** 20:00–23:00 (3 h) | Merge S0b before bed |
| 00:30–03:30 | **S2** (3 h, stacked on S1) | **S3** mock 23:00–04:30 (5.5 h) | asleep |
| 03:30–06:00 | **S5** (2.5 h, stacked on S2) | **S4** mock 04:30–08:30 (4 h) | asleep |
| 06:00–09:00 | **S6 ui** (3 h, stacked on S5) | — | — |
| 09:00–11:00 | fixes from your S1/S2/S5 review | — | — |
| 11/2 08:00–10:00 | — | S3 live probe, S4 live run (each after your cost OK) | Merge S1 → S2 → S5 (demo path on main), S3, S4; confirm both live costs in chat |
| 08:30–10:30 | — | **S6 engine** (2 h) | — |
| 10:30–12:00 | — | **S7 engine** (1.5 h; parsing + matching first, by 11:00) | Merge S6 |
| 11:00–14:00 | **S7 ui** (3 h) | free | — |
| 14:30–16:00 | **S8** (1.5 h; both lanes otherwise idle) | — | Merge S7, then S8 |
| 16:00–20:00 | Fix only what users hit | — | Send URL, record demo + founder video, write application |
| 11/2 ~20:00 | | | **Submit** (16 h buffer to the deadline) |

Total estimate: about 37 lane-hours for the full spec; with the simpler versions and trimmed tests (P-16, P-17) about 31 (ui 18 h, engine 13 h), plus about 3 h of your reviews. The clock times below keep the original slots as buffer.

---

## 2. Decisions made in this plan

| # | Decision | Why |
|---|---|---|
| P-1 | **Mock Claude reuses the S0b ratings** (Joey, 2026-11-01). In `RESEARCH_MODE=mock`, rate/leads/brief return the hand-curated ratings, statements and brief sentences from `src/fixtures/sample-dossier.ts`, matched to the replayed Parallel sources **by URL**. Entities not in the fixture come out Unverified / Unknown. | Nothing invented; e2e exercises scoring and the brief. S3 mock depends on S0b. |
| P-2 | **Sample team network is illustrative and labelled** (Joey, 2026-11-01). The sample ships 3–4 teammates (first names only), contacts as redaction bars at real mapped organisations, and pre-written intro drafts. Every tie and draft carries "Illustrative — not a real connection" as well as Sample data. Warm paths still use only sourced A–B edges. | One-click YC demo of TEAM-5…9 without pretending ties are real. |
| P-3 | **Split slices use a sub-branch, one PR** (Joey, 2026-11-01). S6 and S7: `feature/S6` is the slice branch (ui lane); the engine part goes on `feature/S6-engine` (cut from `feature/S6` if it exists, else `origin/main`), and the ui session merges it into `feature/S6` (local merge, no PR). One PR to main per slice. | Keeps both lanes parallel and one PR per slice. |
| P-4 | **Parallel via plain `fetch`, no SDK.** The spike already uses `fetch` with `x-api-key` (`scripts/spike/lib.mjs`); webhooks and Task Group are plain REST; the SDK is not in spec §2's package list. | No extra package. |
| P-5 | **Webhooks only where documented; polling drives Task Group.** `discover` (one Task run) sets `webhook: { url, event_types: ["task_run.status"] }` and is also polled. `enrich` (Task Group): each `inputs[]` element accepts the same `webhook` field, but Parallel's docs **do not confirm** webhooks fire for group runs. So the progress endpoint polls `GET /v1/tasks/groups/{taskgroup_id}` (`is_active`, `task_run_status_counts`) and reads finished runs from `GET /v1/tasks/runs/{run_id}/result`. The webhook field is set too and handled idempotently, but correctness never depends on it. S3-T8 confirms with one tiny live run. | Spec §7.3 says webhook + polling; this keeps polling as the guarantee. |
| P-6 | **Webhook signature** = Standard Webhooks: headers `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64>` entries, space-separated, check each); HMAC-SHA256 over `<id>.<timestamp>.<raw body>`; key = account secret with `whsec_` stripped, base64-decoded. Reject timestamps older than 5 minutes (docs give no window; 5 min is the Standard Webhooks default). | From docs.parallel.ai/resources/webhook-setup. |
| P-7 | **Basis**: read `output.basis[]` (`field`, `citations[{url, excerpts[] or null, title}]`, `reasoning`, `confidence`) and `output.content`. `title` is not in the documented schema but is present in the spike output; treat it as optional (fall back to the URL's host). Do not send the legacy `parallel-beta: field-basis-2025-11-25` header. | Docs + `scripts/spike/out/task-ultra-enriched-core.json`. |
| P-8 | **Supabase CLI via `npx supabase@2` (pinned in the command), not a dependency.** Joey runs `npx supabase@2 login` and `npx supabase@2 link --project-ref <ref>` once in his own terminal (the password never goes in chat). Migrations apply with `npx supabase@2 db push`. Fallback: paste the SQL into the Supabase SQL editor. | Spec §3 lets the plan decide; nothing new in package.json. |
| P-9 | **All spec §2 packages are added in S0**, including `@anthropic-ai/sdk`, so `package.json` and `package-lock.json` belong to the ui lane only. | One file, one lane. |
| P-10 | **Contract stubs in S0.** S0 creates the engine-owned modules the ui needs to import, as stubs that return `{ ok: false, error: "…isn't switched on yet." }` or a `.nis` placeholder. From then on the engine lane owns them; ui never edits them. List in §3. | ui screens build and run before the engine lands. |
| P-11 | **Stacked ui branches.** If the previous ui slice is not merged yet, cut the next one from its branch and set the PR base to it; retarget to `main` once the earlier PR merges. Engine slices are cut from `origin/main`. | Lets the ui lane keep working overnight without you merging. |
| P-12 | **`cacheComponents: true` is on** (`next.config.ts`). Pages read per-request data (searchParams, the dossier) inside `<Suspense>`; `loading.tsx` files are the skeletons. Every UI slice reads the caching docs first. | This Next.js differs from older versions. |
| P-13 | **`/verify-ui` is user-invoked only** (`disable-model-invocation: true`). Inside `/goal`, Claude follows the steps in `.claude/skills/verify-ui/SKILL.md` with the built-in browser or Playwright MCP and prints the screenshots; you can still type `/verify-ui` at the end. | The skill can't be called by the model. |
| P-14 | **Vitest can't resolve `server-only`** (Next.js bundles it). `vitest.config.ts` aliases `server-only` to an empty module. | Server modules stay testable. |
| P-16 | **Simpler versions are the default** (Joey, 2026-11-01 evening). Every "Simpler version" below is built first; the fuller spec behaviour comes after the YC submission. All are spec defaults or borrowed patterns, not intent §5 rows; none touches sourcing, Unverified, China, the debrief → support loop or the A4 report. | 28 h left vs ~37 h for the full spec. |
| P-17 | **Tests trimmed to what protects users and money** (Joey, 2026-11-01 evening). Unit: scoring, sample sourcing, source-check + pre-display, quality + China filters, refresh matching, limits + cost cap, team parsing/matching/withdrawal, tracker debrief/Undo. Docs/intro state-flow unit tests are dropped. E2E: one `e2e/demo-path.spec.ts` grown by S1, S2, S5 (sample walk with no console errors and no sideways scroll at 1280; A4 is one page; share link hides the tracker; debrief → support → Out of date → Undo), plus `e2e/create.spec.ts` (S4, mock create → ready) and the existing `e2e/shell.spec.ts`. Four-width screenshots stay manual (`/verify-ui`), not Playwright. | Spec §17 updated to match. |
| P-15 | **The dev stand-in strips mockup placeholders.** `src/lib/sample/stand-in.ts` maps `taiwan-uas.ts` into the new types and drops `[DATE]`-style fields, "5.1 GHz", the fictional funds (Kestrel, Harbor Lane) and the US$7B figure, marking them Unverified. Until S0b merges, production `/d/sample` shows stand-in data, so the URL is not shared before S8. | No placeholders on screen, even in dev. |

---

## 3. File ownership

One file belongs to one lane. `src/lib/types.ts` and `supabase/migrations/*` change **only in S0**; any later need → stop and ask.

| Path | Owner | Created in |
|---|---|---|
| `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `.claude/settings.json`, `.env.example`, `next.config.ts` | ui | S0 (next.config.ts headers in S2) |
| `src/lib/types.ts`, `supabase/**` | ui (S0 only) | S0 |
| `src/app/layout.tsx`, `src/app/globals.css`, `src/app/not-found.tsx`, `src/app/page.tsx`, `src/app/(loading,error).tsx`, `src/app/d/[id]/**` pages, `src/app/s/**`, `src/app/privacy/**`, `src/app/robots.ts` | ui | S0–S7 |
| `src/components/{shell,home,map,score,brief,report,sources,tracker,network,docs,team}/**` | ui | S0–S7 |
| `src/lib/scoring/**`, `src/lib/ids.ts`, `src/lib/analytics.tsx`, `src/lib/browser-dossiers.ts`, `src/lib/sample/overlay.ts`, `src/lib/sample/stand-in.ts`, `src/lib/tracker/**`, `src/lib/docs/**`, `src/lib/db/{tracker,network,documents}.ts`, `src/app/d/[id]/*/actions.ts` | ui | S0, S5, S6 |
| **Contract stubs (engine from S0b/S3 on):** `src/lib/sample/reader.ts`, `src/lib/db/client.ts`, `src/lib/db/load-dossier.ts` (`loadDossier`, `loadByShareId`), `src/app/actions/research.ts` (`createDossier`, `refreshDossier`, `resolveMatch`, `estimateRebrief`, `rebrief`), `src/app/actions/drafts.ts` (`startBriefingDraft`, `saveTeamTies`, `withdrawMember`, `writeIntroDraft`), `src/components/progress/research-progress.tsx` (exports `ResearchProgress`, `MatchCheckList`) | engine | stubs in S0 |
| `src/fixtures/sample-dossier.ts` + `.test.ts` | engine | S0b |
| `src/lib/{parallel,research,claude,checks,limits,team}/**`, `src/lib/db/{research,write,dossiers,read,briefs,team}.ts`, `src/app/api/**`, `src/components/progress/match-check.tsx`, `scripts/ops/**`, `docs/templates/**` | engine | S3–S7 |
| `src/fixtures/taiwan-uas.ts`, `scripts/spike/**` | nobody edits | — |

---

## 4. Shared acceptance block

Every slice's `/goal` criteria use these lines, with the slice's routes, spec file and allowed-path regex filled in. `$BASE` = the branch the slice was cut from (`origin/main`, or the previous ui branch when stacked, P-11).

```
- `npm test` exits 0
- `npm run build` exits 0
- `npx playwright test <slice specs>` exits 0
- Screenshots of <routes> at 1440×900, 1920×1080, 1280×800 and 390×844, following .claude/skills/verify-ui/SKILL.md, are printed in the conversation
- On each route at 1280 and 390, `document.documentElement.scrollWidth <= innerWidth` prints true
- On each route, the browser console error list (read_console_messages, onlyErrors) prints 0 entries
- Each route with `?state=loading`, `?state=empty`, `?state=error` shows its .nis state (screenshot at 1440)
- `grep -rnE '\[(CLIENT|DATE|EXPERT NAME|Name)\]|5\.1 ?GHz|\bTBD\b|lorem' src --exclude=taiwan-uas.ts --exclude=stand-in.ts` prints nothing
- `grep -rn 'ATLAS' src --include='*.tsx'` prints nothing
- `grep -rnE 'PARALLEL_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SECRET_KEY' src | grep -vE '^src/lib/(db|claude|parallel)/'` prints nothing
- `git diff --name-only $BASE...HEAD | grep -vE '<allowed regex>'` prints nothing
- or stop after 30 rounds
```

Lines that don't apply to a slice (e.g. screenshots in S3) are dropped in that slice's block.

The slice's `/goal acceptance` block is what gets pasted into `/goal`. Each task's "Accept" line is checked as the task finishes: unless the task says otherwise, verify = `npm test` plus the slice's e2e spec or a 1440 screenshot printed in the conversation.

---

## 5. Slices

### S0 Skeleton

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/S0` | — | 3.5 h | P1 | `@supabase/supabase-js`, `@anthropic-ai/sdk`, `posthog-js`, `zod`, `vitest`, `@playwright/test` (all of spec §2; Joey confirms the list in chat before `npm install`) |

**Read first**: `node_modules/next/dist/docs/01-app/01-getting-started/` 02-project-structure, 03-layouts-and-pages, 05-server-and-client-components, 08-caching, 10-error-handling, 11-css, 13-fonts; `02-guides/` testing/vitest.md, testing/playwright.md, environment-variables.md, data-security.md, analytics.md; `03-api-reference/03-file-conventions/` layout, loading, error, not-found, dynamic-routes; `03-api-reference/05-config/01-next-config-js/cacheComponents.md`. Supabase docs: RLS, CLI `db push`, Storage private buckets. posthog-js Next.js guide. `design/direction.md`, `design/directions/color-admiralty/01-home.html` (`:root` tokens), `docs/scoring.md` (all), spec §6, §13, §15.

**Risky changes (spec §18 "Ask first") — list before code**:
- *Dossier ids* (`src/lib/ids.ts`): a short or predictable id lets strangers open dossiers. Verify: id = `randomBytes(16)` → base64url, 22 chars; `isDossierId()` rejects anything else before any DB query (checked by the S2 404 test and S8 review).
- *Keys* (`src/lib/db/client.ts`): the secret key in a client bundle exposes the whole database. Verify: `import "server-only"` on line 1; the key grep in §4; `npm run build` fails if a client component imports it.
- *Sources and Unverified marks* (`types.ts`): if `Fact.status` or `source_ids` are optional, unsourced facts can render as sourced. Verify: types make `status: "sourced" | "unverified"` required and `sourceIds: string[]`; scoring ignores unverified facts (scoring tests).
- *China rule* (migration): a person row for a Chinese organisation breaks the product rule. Verify: check constraint `not (is_china and is_person)` in the migration.
- *RLS*: a table without RLS is readable with the anon key. Verify: the migration has `enable row level security` for every table, no `create policy`, and `revoke execute … from anon, authenticated` on every function.

**Files** (allowed regex: `^(package(-lock)?\.json|vitest\.config\.ts|playwright\.config\.ts|\.claude/settings\.json|\.env\.example|supabase/.*|src/app/(layout|page|not-found)\.tsx|src/app/globals\.css|src/app/d/\[id\]/(layout|page|not-found)\.tsx|src/app/actions/(research|drafts)\.ts|src/lib/(types|ids)\.ts|src/lib/analytics\.tsx|src/lib/scoring/.*|src/lib/sample/(reader|overlay|stand-in)\.ts|src/lib/db/(client|load-dossier)\.ts|src/components/(shell|progress)/.*|e2e/shell\.spec\.ts)$`)

**Tasks**
- **S0-T1 Tooling** — `package.json` (add packages; scripts `test: vitest run`, `ops: node scripts/ops/index.ts`), `package-lock.json`, `vitest.config.ts` (`@/` alias, `server-only` alias P-14), `playwright.config.ts` (webServer `npm run dev`, port from `PORT`, default 3000; `RESEARCH_MODE=mock`), `.claude/settings.json` (allow npm test/build/dev/lint, `npx playwright test`, `npx vitest`, git status/diff/log/add/commit/push, `gh pr create/view`).
  Accept: `npm test` exits 0 with "No test files" allowed (`--passWithNoTests`); `npx playwright --version` prints a version. Verify: run both.
- **S0-T2 Theme and font** — `src/app/globals.css` (direction.md tokens on `:root`, radii, `.nis`, `.stamp`, `.icd`, `.paras`, `.exhibit`, `.ins-redact` base styles, tick border), `src/app/layout.tsx` (IBM Plex Sans Condensed 400/500/600/700 + italic via `next/font/google`; drop Inter/Newsreader/Plex Mono; themeColor `#FCFDFB`).
  Accept: no hex colour outside `globals.css` (`grep -rnE '#[0-9A-Fa-f]{6}' src --include='*.tsx'` prints nothing). Verify: grep + build.
- **S0-T3 Types** — `src/lib/types.ts`: the full `Dossier` aggregate for every slice (spec §13 tables as TS types: Dossier, ResearchRun/Step, Source, Stakeholder, Fact, SupportStatement, Edge, TimedEvent, Brief, Lead, TrackerItem, Debrief, PlaybookOutcome, DocumentRequest, Document, IntroRequest, TeamMember, Contact, Tie, OrgAlias), `Banded`, `InfluenceRatings`, `ActionResult<T>`, sample overlay shapes, `illustrative?: true` on sample ties/drafts (P-2).
  Accept: `npx tsc --noEmit` exits 0; no `any` (`grep -n '\bany\b' src/lib/types.ts` prints nothing). Verify: run both.
- **S0-T4 Database** — `supabase/config.toml` (`npx supabase@2 init`), `supabase/migrations/20261101160000_init.sql` (all §13 tables, FKs `on delete cascade`, unique `research_steps.parallel_run_id`, unique `usage_counters(day, scope)`, unique `dossiers.share_id`, China check, RLS on all, no policies; functions `claim_research_steps(run_id, n)` (`UPDATE … WHERE status='queued' … RETURNING`), `bump_usage(day, scope, max)` (atomic, returns allowed bool); private Storage bucket `documents`; site-wide `org_aliases` seeds 中科院 / 國家中山科學研究院 / NCSIST), `.env.example` (add `RESEARCH_MODE=mock`, `PARALLEL_WEBHOOK_SECRET`, `APP_BASE_URL`, `TEAM_NETWORK_REAL_ENABLED=false`, `EXPERT_REVIEW_ETA_TEXT="within 4 weeks"`), `src/lib/db/client.ts` (server-only Supabase client).
  Accept: `npx supabase@2 db push` (Joey linked) exits 0, or SQL editor run succeeds; `grep -c 'enable row level security' supabase/migrations/*.sql` equals the table count (26); `grep -c 'create policy' supabase/migrations/*.sql` prints 0. Verify: run the greps; Joey runs the push.
- **S0-T5 Scoring A** — `src/lib/scoring/source-weight.ts` (scoring §1), `influence.ts` (§2 incl. centrality from edges, range ±(5+5×missing)), `support.ts` (§3 incl. Unknown and debrief A1 ×2, §3.1), `src/lib/scoring/scoring.test.ts`.
  Accept: tests for influence (all 5, 2 missing → ±15), centrality buckets, support (Unknown when no statements, debrief recalculation) pass.
- **S0-T6 Scoring B** — `metrics.ts` (opposition with range and "based on N of M", entry readiness, window to act / "No sourced deadline found", data confidence, per-stakeholder confidence), `ranking.ts` (contact-first three incl. +15 warm path, blocker exclusion, Allies fill; quadrants; Unknown beside matrix), `brief-status.ts` (Out of date per scoring §7), `index.ts`, `scoring.test.ts`.
  Accept: one test per remaining scoring.md section passes (spec §17 scoring bullet complete).
- **S0-T7 Sample and data entry points** — `src/lib/ids.ts` (`newDossierId`, `newShareId`, `isDossierId`), `src/lib/sample/stand-in.ts` (P-15), `src/lib/sample/reader.ts` (exports the sample `Dossier`; imports the stand-in), `src/lib/sample/overlay.ts` (`portolan.sample.*` localStorage read/write/reset, try/catch, merges writes over the fixture), `src/lib/db/load-dossier.ts` (`loadDossier(id)`: `sample` → reader; bad format → `null`; otherwise `null` until S4; `loadByShareId`: sample share id → sample).
  Accept: `/d/sample` renders data from the stand-in; `/d/xyz` returns 404 with no DB call (log shows none).
- **S0-T8 Shell** — `src/components/shell/top-bar.tsx` (≥1024: brand, five tabs, Sample data stamp), `bottom-tabs.tsx` (<1024, fixed, 44px targets, current tab bold + underline), `sample-bar.tsx` (stamp + "Changes to the sample stay in this browser" + Reset sample), `nis.tsx` (`.nis` + `?state=` preview helper, only on `/d/sample` and dev; loading "Still loading…" + retry after 8 s), `src/app/d/[id]/layout.tsx` (shell, sample bar, `notFound()` when `loadDossier` is null).
  Accept: tabs at the top at 1440, at the bottom at 390; tabs without a dossier → `/` with "Pick a dossier first".
- **S0-T9 Not-found, stubs, analytics** — `src/app/not-found.tsx` (SHELL-2 404 copy + open sample), `src/app/actions/research.ts` + `src/app/actions/drafts.ts` (P-10 stubs returning `ActionResult`, incl. `estimateRebrief` so the S2 dialog can show the cost), `src/components/progress/research-progress.tsx` (stubs), `src/lib/analytics.tsx` (PostHog provider; rewrites `$current_url`, `$pathname`, `$referrer` `/d/<id>`→`/d/:id`, `/s/<id>`→`/s/:id`; `track(event)` for the three events; no email property; mounted in `layout.tsx`).
  Accept: build passes with the stubs imported from a page; `grep -n ':id' src/lib/analytics.tsx` shows both rewrites.
- **S0-T10 Placeholder pages and shell e2e** — `src/app/page.tsx` (minimal: "Open the sample dossier"), `src/app/d/[id]/page.tsx` (minimal), `src/app/d/[id]/not-found.tsx`, `e2e/shell.spec.ts` (`?state=loading|empty|error` on `/d/sample`; 404 for a bad id).
  Accept: `npx playwright test e2e/shell.spec.ts` exits 0.

**Tests added**: `src/lib/scoring/scoring.test.ts` (spec §17 scoring); `e2e/shell.spec.ts` (§17 "`?state=` for the three states").

**Simpler version (built by default)**: "Still loading…" after 8 s (spec default) → drop the timer, keep the skeleton.

**/goal acceptance**: §4 block with routes `/`, `/d/sample`, `/d/not-a-real-id`; specs `e2e/shell.spec.ts`; plus:
```
- `npx tsc --noEmit` exits 0
- `grep -c 'enable row level security' supabase/migrations/*.sql` prints 26 and `grep -c 'create policy' supabase/migrations/*.sql` prints 0
- `head -1 src/lib/db/client.ts` prints `import "server-only";`
- `grep -rnE '#[0-9A-Fa-f]{6}' src --include='*.tsx'` prints nothing
- or stop after 30 rounds
```

---

### S0b Sample data

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| engine | `feature/S0b` | S0 merged | 3 h | P1 | none |

**Read first**: spec §0 D1, §7.4, §7.5, §7.7, §16 Q6; `docs/scoring.md` §1–5; `docs/decisions/0001-research-engine.md` (spot-check findings), `2026-10-30-founder-answers.md` (48,750 drones OK with source; NT$210bn proposed / NT$63.4bn passed; no 5.1 GHz); `scripts/spike/out/task-ultra.json`, `task-ultra-enriched-core.json`, `spotcheck.json`; `src/fixtures/taiwan-uas.ts` (layout reference only).

**Risky changes — list before code**:
- *Sources and Unverified marks*: a hand-written rating whose quote isn't in the excerpt shows YC a fabricated claim. Verify: the fixture test checks every claim (cited id exists, quote ⊂ normalised excerpt, verified date present).
- *Names (Q6)*: only sourced public officials get a name and title; everyone else stays at organisation level. Verify: every `is_person` stakeholder cites a source whose excerpt contains the name.
- *China rule*: no person rows for Chinese organisations. Verify: test asserts `!(isChina && isPerson)` for every stakeholder.

**Files** (allowed regex: `^(src/fixtures/sample-dossier(\.test)?\.ts|src/lib/sample/reader\.ts)$`)

**Tasks**
- **S0b-T1 Stakeholders, sources, edges** — `src/fixtures/sample-dossier.ts`: real organisations from the spike (target 38+; drop fictional funds), each with sources from its own Basis (URL, title, excerpt, `verifiedAt` from the run date, reliability per the spec §7.5 domain rules, credibility with a reason), menu-text and home-page-only citations rejected with a reason (for the "Rejected sources" tab), sourced edges only, city/lat/lng where sourced.
  Accept: every stakeholder has ≥1 accepted source; rejected sources carry `rejectReason`.
- **S0b-T2 Ratings, statements, events, leads** — same file: the four influence ratings per scoring §2.1 (each citing source ids + quote), support statements (−2…+2, cited), next step per stakeholder (cited, or "Find a sourced contact route first"), timed events with future dates only (e.g. TADTE 2027), leads (investors / lawyers / events from the spike) with the Q4 checks.
  Accept: unsourced fields are `status: "unverified"`; no rating without `sourceIds`.
- **S0b-T3 Brief and judgments** — same file: brief v1 (rationale ≤120 words, path 3–5 steps in the scoring §5 order, 7-day plan four boxes, summary ≤70 words, risks ≤3, where to meet), three key judgments with ICD terms, each sentence cited; 48,750 drones only with the Armaments Bureau source; the NT$210bn / NT$63.4bn wording.
  Accept: sentence count with zero `sourceIds` = 0.
- **S0b-T4 Swap and test** — `src/lib/sample/reader.ts` (import `sample-dossier.ts` instead of the stand-in), `src/fixtures/sample-dossier.test.ts` (inline §7.7 checks over every claim; China person check; no placeholders; replaced by `src/lib/checks/source-check.ts` in S3-T5).
  Accept: `npx vitest run src/fixtures` exits 0; `grep -n 'stand-in' src/lib/sample/reader.ts` prints nothing.

**Tests added**: `src/fixtures/sample-dossier.test.ts` (§17 checks: "source-check loop over the sample fixture").

**Simpler version (built by default)**: none — S0b has no spec defaults; if short of time, curate fewer stakeholders (≥20) rather than relax sourcing.

**/goal acceptance**:
```
- `npx vitest run src/fixtures` exits 0
- `npm test` exits 0
- `npm run build` exits 0
- `grep -n 'stand-in' src/lib/sample/reader.ts` prints nothing
- `grep -nE 'Kestrel|Harbor Lane|5\.1 ?GHz|\[(CLIENT|DATE)\]|US\$7B' src/fixtures/sample-dossier.ts` prints nothing
- `npx vitest run src/fixtures --reporter=verbose` prints the passing tests "≥ 20 stakeholders", "≥ 60 accepted sources" and "every claim is sourced or unverified"
- `git diff --name-only origin/main...HEAD | grep -vE '^(src/fixtures/sample-dossier(\.test)?\.ts|src/lib/sample/reader\.ts)$'` prints nothing
- or stop after 30 rounds
```

---

### S1 Home + map

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/S1` | S0 merged | 4.5 h | P1 | none |

**Read first**: Next docs `01-getting-started/04-linking-and-navigating`, `06-fetching-data`, `08-caching`; `02-guides/streaming.md`, `preserving-ui-state.md`; `03-api-reference/04-functions/use-search-params.md`, `use-router.md`. `design/direction.md` (layout, map, stance marks, credibility components); `design/directions/color-admiralty/01-home.html`, `02-map.html` (`project()`, drag, tokens); `design/directions/estimate/02-map.html` (`.exhibit`, `.paras`); `design/mockup/src/01-dossiers.template.html`, `02-map.template.html`; `design/screens/01-dossiers.png`, `02-map.png`; spec §6, §12 (01, 02, SCORE-X), `docs/scoring.md` §2, §5. Use the frontend-design skill; avoid `docs/research/generic-risks.md` patterns.

**Risky changes — list before code**:
- *Dossier ids in the browser list* (`browser-dossiers.ts`): ids stored in localStorage are visible to anyone using that browser. Verify: only ids and names are stored, no email; the list is never sent anywhere.
- *Sample writes*: "Add to tracker" on the sample must never hit the server or a paid API. Verify: network log during the e2e shows no POST on `/d/sample`.

**Files** (allowed regex: `^(src/app/(page|loading|error)\.tsx|src/app/d/\[id\]/(page|loading|error)\.tsx|src/app/d/\[id\]/map/.*|src/components/(home|map|score)/.*|src/lib/browser-dossiers\.ts|e2e/demo-path\.spec\.ts)$`)

**Tasks**
- **S1-T1 Score components** — `src/components/score/score-x.tsx` (SCORE-X panel: result, factors with rating and weight, "Based on 3 of 5 factors", sources per factor linking `/d/[id]/sources?id=`, plain summary of the scoring.md section; Unknown → "No sourced statement found yet"), `stamp.tsx`, `icd-scale.tsx`, `paras.tsx`, `exhibit.tsx`.
  Accept: each score element opens SCORE-X by click and keyboard (Enter), Esc closes.
- **S1-T2 Home frame** — `src/app/page.tsx` (selects most recently opened dossier, else sample; three columns 300/1fr/340, ≥1600 320/1fr/400), `src/app/d/[id]/page.tsx` (overview; renders `ResearchProgress` stub while researching), `src/components/home/brand-bar.tsx` (HOME-1, "Market entry intelligence", plan label Pro, never ATLAS), `quick-nav.tsx` (HOME-2 six tiles), `src/lib/browser-dossiers.ts`.
  Accept: "Open the sample dossier" works with no form or email.
- **S1-T3 Right column** — `dossier-card.tsx` (HOME-3 stamps, name, country, relative refreshed with exact time on hover, three numbers, "Open stakeholder map"; HOME-4 confidence → SCORE-X; HOME-5 refresh button calling the `refreshDossier` stub, disabled on the sample with the reason), `key-judgments.tsx` (3 numbered cited paragraphs), `alert-card.tsx` (HOME-6, hidden when none), `dossier-select.tsx` (HOME-7 with confidence; "Link no longer works" + remove).
  Accept: confidence shows "High · N sources" style text, no %.
- **S1-T4 Form, chart, states** — `new-dossier-form.tsx` (HOME-8: required/optional fields, zod-matching limits, honeypot, market dropdown Taiwan + three disabled "coming soon", no China; on `{ok:true}` shows the link + Copy + "This link is the only key to your dossier. Save it now.", remembers it, goes to `/d/[id]`; stub error shown next to the button), `taiwan-chart.tsx` (stakeholders with a city on a fixed outline; click → map with it selected), `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/d/[id]/loading.tsx`, `error.tsx`.
  Accept: Start research with empty company shows the reason; with the stub shows "Research isn't switched on yet." and can be pressed again.
- **S1-T5 Map core** — `src/components/map/project.ts` (`project()` rotation, tilt 0.38, `f = 2.8/(2.8+z)`), `influence-map.tsx` (MAP-3 auto-rotate, drag, ← →, buttons, pause, reduced-motion paused; MAP-4 size, depth dot, stance shape+colour, names ≥78, dashed outline for still-researching / pending; MAP-5 focus + hint + Esc; draws top 30 + selected + three), `node-mark.tsx` (shared marks), `legend.tsx` (MAP-8).
  Accept: dragging rotates; Esc clears focus; no three.js (`grep -rn 'three' package.json` prints nothing).
- **S1-T6 Map page** — `src/app/d/[id]/map/page.tsx` (290/1fr/380, ≥1600 320/1fr/440, each column scrolls; MAP-1 "N of M stakeholders shown"; MAP-2 toggle `?view=matrix`), `power-matrix.tsx` (MAP-6 quadrants from `ranking.ts`, depth bands, Unknown beside), `category-filter.tsx` (MAP-7, "Clear filter" when empty), `src/app/d/[id]/map/loading.tsx` ("Placing stakeholders…"), `error.tsx`.
  Accept: `?view=matrix` survives reload.
- **S1-T7 Details and lists** — `details-panel.tsx` (MAP-9 fields incl. "High · 70–85 · based on 3 of 5 factors", Unverified fields; MAP-10 recommended action with 4px `--act` bar, View evidence → `/d/[id]/sources?s=`, Add to tracker via overlay → "Added to tracker"; sticky action bar), `contact-first.tsx` (MAP-11 list + dashed `--route` line), `stakeholder-list.tsx` (full list, phone order), `find-stakeholder.tsx` (⌘K / Ctrl K / `/`, arrows, Enter, Esc, empty suggestion).
  Accept: every stakeholder shows a next step (never blank).
- **S1-T8 E2E** — `e2e/demo-path.spec.ts` (create): `/` → Open the sample → map → select a node → Add to tracker (sends no request); no console errors; no sideways scroll at 1280.

**Tests added**: `e2e/demo-path.spec.ts`, home + map part (P-17).

**Simpler version (built by default)** (spec defaults or borrowed patterns not required by intent):
- Find a stakeholder ⌘K combobox (direction.md 10/31) → a plain search input above the full list.
- Focus hint "showing N direct ties" → highlight only; Esc still clears.
- Sticky action bar → normal position.
- HOME-7 "Link no longer works" + remove → hide dossiers that fail to load.
- HOME-3 new alerts "this browser hasn't seen" → count of future timed events.

**/goal acceptance**: §4 block with routes `/`, `/d/sample`, `/d/sample/map`, `/d/sample/map?view=matrix`; specs `e2e/demo-path.spec.ts`; allowed regex above; plus `- or stop after 30 rounds`.

---

### S2 Brief + A4 + share

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/S2` (stacked on S1 if unmerged) | S0, S1 (score components) | 3 h | P1 | none |

**Read first**: Next docs `01-getting-started/14-metadata-and-og-images` (titles never contain ids), `03-api-reference/05-config/01-next-config-js/headers.md`, `03-file-conventions/01-metadata/` (robots), `03-api-reference/04-functions/not-found.md`, `generate-metadata.md`; `design/directions/color-admiralty/05-report.html`; `design/mockup/src/03-strategy-brief.template.html`, `05-report-a4.template.html`; `design/screens/03-strategy-brief.png`, `05-report-a4.png`; spec §9, §11.1, §12 (03, 05, sources page), §10.8.

**Risky changes — list before code**:
- *Share links* (§9): if `/s/[shareId]` accepts the dossier id or shows tracker / debrief / team data, sending the report hands over the dossier. Verify: e2e opens `/s/<sample share id>` and asserts no tracker, debrief text, team ties or documents; `/s/<dossier id>` → 404; page `<title>` has no id.
- *Sources display*: an evidence row without a grade or date misleads experts. Verify: e2e asserts every evidence row has a stamp and a verified date.
- *Analytics*: `report_exported` must not carry ids. Verify: the PostHog request payload in the network log shows `/d/:id`.

**Files** (allowed regex: `^(next\.config\.ts|src/app/robots\.ts|src/app/d/\[id\]/(brief|report|sources)/.*|src/app/s/.*|src/app/privacy/.*|src/components/(brief|report|sources)/.*|e2e/demo-path\.spec\.ts)$`)

**Tasks**
- **S2-T1 Brief header and metrics** — `src/app/d/[id]/brief/page.tsx` (280/1fr/380, ≥1600 300/1fr/440; `?v=`), `loading.tsx`, `error.tsx` ("The brief failed to generate. Your research is saved." + retry), `src/components/brief/versions.tsx` (BRIEF-1 version list, Out of date label with reasons from `brief-status.ts`, RE-BRIEF button: cost confirm → `rebrief` stub; disabled on the sample with the reason), `metrics.tsx` (BRIEF-2 four metrics → SCORE-X; "No sourced deadline found" without a number).
- **S2-T2 Brief body** — `rationale.tsx` (BRIEF-3 numbered, `[S12]` jumps to evidence), `exec-path.tsx` (BRIEF-4 + "How to reduce opposition"), `seven-day.tsx` (BRIEF-5 four boxes; "No sourced event this week"), `evidence.tsx` (BRIEF-7 title, type, stamp, verbatim excerpt, Chinese original + machine translation label, "3 of N · Show all"; BRIEF-8 Export one-page A4 PDF → report). "Needs from you: …" for missing optional fields.
- **S2-T3 Sources page** — `src/app/d/[id]/sources/page.tsx` (`?s=`, `?id=`), `loading.tsx`, `error.tsx`, `src/components/sources/source-list.tsx` (filters by stakeholder/type; "Recheck due" over 90 days; facts citing each source; "Rejected sources" tab).
- **S2-T4 A4 report** — `src/app/d/[id]/report/page.tsx`, `src/components/report/a4-report.tsx` (REP-1…10; "Prepared for" line hidden when data is missing), `map-exhibit.tsx` (REP-5 fixed-angle SVG, three zones, Exhibit 1 + takeaway + "Source: Portolan analysis of N sources"), `report-toolbar.tsx` (Print / Save as PDF → `window.print()`; Copy share link → "Copied"; `report_exported`), `report.css` (`@page { size: A4; margin: 0 }`, 794×1123, padding 42/46/32, 6px tick border, toolbar hidden in print, phone `transform: scale`; fixed caps so it stays one page).
- **S2-T5 Share, headers, privacy shell** — `src/app/s/[shareId]/page.tsx` (report only, via `loadByShareId`; "This report is still being prepared" when no brief), `src/app/s/[shareId]/sources/page.tsx` (only cited sources), `next.config.ts` (`X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` for `/d/:path*` and `/s/:path*`), `src/app/robots.ts` (disallow `/d/`, `/s/`), `src/app/privacy/page.tsx` (shell: headings for each §10.8 topic).
- **S2-T6 E2E** — extend `e2e/demo-path.spec.ts`: map → brief → report; print is one page (`page.pdf()` page count = 1); the share link shows no tracker; `X-Robots-Tag` present.

**Tests added**: brief/report part of `e2e/demo-path.spec.ts` (P-17).

**Simpler version (built by default)**:
- REP-12 code-shortened lists → fixed caps always (top 5, risks 2, sources = those in the table).
- Rejected sources tab (spec addition) → drop the tab; rejects stay logged and on the progress screen.
- Separate share id (§9 spec default) → no simpler version recommended: sharing `/d/[id]/report` hands over an editable dossier. Keep as is.

**/goal acceptance**: §4 block with routes `/d/sample/brief`, `/d/sample/report`, `/d/sample/sources`, `/s/<sample share id>`, `/privacy`; specs `e2e/demo-path.spec.ts`; plus:
```
- `curl -sI localhost:$PORT/d/sample/report | grep -i 'x-robots-tag: noindex'` prints a line
- `curl -s -o /dev/null -w '%{http_code}' localhost:$PORT/s/sample` prints 404
- or stop after 30 rounds
```

---

### S5 Tracker

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/S5` (stacked on S2 if unmerged) | S0, S1 (details panel); S4 only for real dossiers | 2.5 h | P1 | none |

**Read first**: Next docs `01-getting-started/07-mutating-data`, `02-guides/forms.md`, `server-actions.md`; `design/mockup/src/06-tracker.template.html`, `design/screens/06-tracker.png`; spec §12 (06), §13 (tracker_items, debriefs, playbook_outcomes); `docs/scoring.md` §3.1, §7.

**Risky changes — list before code**:
- *Playbook anonymity* (TRK-5): a playbook row with names or free text leaks one client's meeting to the shared data. Verify: `flow.test.ts` asserts the outcome has only route, category, overall, next_step_agreed.
- *Support recalculation*: a wrong debrief weight changes every score the founder shows. Verify: support after debrief equals the scoring §3.1 formula (test reuses `support.ts`).

**Files** (allowed regex: `^(src/app/d/\[id\]/tracker/.*|src/components/tracker/.*|src/components/map/details-panel\.tsx|src/lib/tracker/.*|src/lib/db/tracker\.ts|e2e/demo-path\.spec\.ts)$`)

**Tasks**
- **S5-T1 State flow** — `src/lib/tracker/flow.ts` (stage moves; `applyDebrief` → debrief as A1 ×2 source, stage ≥ Met, optional next step with due date, playbook outcome, Out of date; `undoDebrief` restores everything), `src/lib/tracker/flow.test.ts`.
- **S5-T2 Page** — `src/app/d/[id]/tracker/page.tsx` (two columns 1fr/420, ≥1600 1fr/480), `loading.tsx`, `error.tsx`, `src/components/tracker/stage-counts.tsx` (TRK-1 filter + Show all), `next-steps.tsx` (TRK-7 editable stage/next step/due/meeting date, remove; stance marks; TRK-8 "Prepare a briefing note" → `/d/[id]/docs?item=`; empty state copy).
- **S5-T3 Debrief** — `debrief-due.tsx` (TRK-2 from the day after `meeting_at`, oldest first, one at a time; "Set meeting date"), `debrief-form.tsx` (TRK-3 Overall required with the reason on disabled Save; Yes/Not yet; notes ≤1000; playbook ticked by default), `debrief-result.tsx` (TRK-4 "old → new" + reason, stage change, next step, "Strategy brief marked out of date"; TRK-6 Undo; `debrief_saved`).
- **S5-T4 Real-dossier writes** — `src/app/d/[id]/tracker/actions.ts` (zod → id check → work → `ActionResult`: add item, edit, remove, save debrief, undo), `src/lib/db/tracker.ts`, `src/components/map/details-panel.tsx` (Add to tracker uses the action on real dossiers, overlay on the sample).
- **S5-T5 E2E** — extend `e2e/demo-path.spec.ts`: report → tracker; debrief → support changes → Out of date on the brief → Undo restores support.

**Tests added**: `src/lib/tracker/flow.test.ts` (debrief and Undo); tracker part of `e2e/demo-path.spec.ts` (P-17).

**Simpler version (built by default)**: TRK-6 Undo "later from the tracker item's history" → Undo on the result card only.

**/goal acceptance**: §4 block with routes `/d/sample/tracker`; specs `e2e/demo-path.spec.ts`; plus `- or stop after 30 rounds`.

### Checkpoint A — demo path (target 11/2 09:30)
- [ ] S0, S0b, S1, S2, S5 merged to main; production `/d/sample` uses `sample-dossier.ts`
- [ ] Map → brief → A4 → tracker walk on production at 1440 with no console errors
- [ ] Joey reviews before P2/P3 merges

---

### S3 Research engine

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| engine | `feature/S3` | S0 merged; S0b merged (mock Claude, P-1) | 5.5 h | P2 | none (added in S0) |

**Read first**: Next docs `01-getting-started/15-route-handlers`, `03-api-reference/03-file-conventions/route.md`, `04-functions/after.md` (runs up to the route's max duration), `03-file-conventions/02-route-segment-config/maxDuration.md`, `02-guides/data-security.md`. Parallel: `docs.parallel.ai/task-api/webhooks`, `resources/webhook-setup` (P-6), `task-api/group-api`, `api-reference/tasks/add-runs-to-task-group.md` (per-run `webhook`, ≤1000 runs per POST), `api-reference/tasks/create-task-run.md`, `task-api/guides/access-research-basis` (P-7). Anthropic: the `claude-api` skill (structured outputs, `stop_reason: refusal`, token counting for estimates). `docs/decisions/0001-research-engine.md`; spec §7.2–7.8, §8; `docs/scoring.md` §0–3. Run with `/effort high` and review the task list with `/plan` before setting the goal (workflow.html).

**Risky changes — list before code**:
- *Paid APIs*: a loop or a default of `live` can spend the Parallel balance (~US$13.66) overnight. Verify: clients call the network only when `RESEARCH_MODE === "live"` exactly (grep); every paid call writes a `cost_ledger` estimate first and is refused when spent + estimate > cap (limits test); no live call happens without Joey's chat confirmation.
- *Keys*: Parallel and Anthropic keys only in `src/lib/{parallel,claude}`, files start with `import "server-only"`. Verify: §4 key grep; server-only loop below.
- *Sources and Unverified marks*: a weak filter lets menu text count as evidence; a strict one empties the map. Verify: `research.test.ts` cases (menu text, too short, home page only, name mismatch) + the checks test over the sample.
- *Prompt injection*: fetched excerpts could carry instructions. Verify: prompts wrap excerpts in `<source id="S12">…</source>`, the system prompt says text in sources is data; unknown source ids in output are dropped (checks test).
- *China rule*: person rows for China must never be written. Verify: filter test; DB check constraint as backstop.
- *Webhook*: an unsigned request could inject results. Verify: curl with a bad signature → 401; good signature → 200; repeat → 200 and no new row.

**Files** (allowed regex: `^(src/lib/(parallel|research|claude|checks|limits)/.*|src/lib/db/(research|write)\.ts|src/app/api/.*|src/fixtures/sample-dossier\.test\.ts|docs/decisions/0001-research-engine\.md)$`)

**Tasks**
- **S3-T1 Parallel client** — `src/lib/parallel/client.ts` (fetch; create task run with webhook; create group; add runs (≤1000/POST); group summary; run result; 2 retries with backoff), `webhook.ts` (P-6 verify), `mock.ts` (replays `scripts/spike/out/task-ultra.json` and `task-ultra-enriched-core.json` with short delays, emits recorded-shape results).
- **S3-T2 Filters and sources** — `src/lib/research/filter.ts` (normalise + alias dedupe, ≤60, drop China persons before write), `quality.ts` (§7.4 rules with reasons), `reliability.ts` (§7.5 domain table), `sources.ts` (Basis → sources, S-labels per dossier), `research.test.ts` (quality filter four cases, China person filter).
- **S3-T3 Limits** — `src/lib/limits/prices.ts` (Parallel ultra $0.30, core $0.025; Sonnet/Opus per-token from the claude-api skill), `ledger.ts` (estimate → cap check → actual), `counters.ts` (email hash + salt, site, UTC+8 day, uses `bump_usage`), `limits.test.ts` (email and site counts, UTC+8 boundary, cap blocks the call).
- **S3-T4 Claude** — `src/lib/claude/client.ts` (server-only; mock vs live), `schemas.ts` (zod: ratings 0–3 with source ids + quote, statements −2…+2, credibility 1–6 with reason, next step, translation), `prompts.ts` (data blocks, goal-relative influence), `rate.ts` (one Sonnet 5.5 call per entity; refusal / invalid → Unverified, ≤2 retries), `mock.ts` (P-1: curated ratings and brief sentences from the fixture mapped by source URL).
- **S3-T5 Checks** — `src/lib/checks/source-check.ts` (§7.7 three checks, normalised whitespace/quotes/full-width), `pre-display.ts` (§11.1 sentence check: ids exist and pass §7.7, people/orgs on the map, placeholder regex, no China individuals → removed + logged), `checks.test.ts` (unsourced claim, quote not in excerpt, missing date fail; pre-display four cases), `src/fixtures/sample-dossier.test.ts` (switch inline helpers to `source-check.ts`).
- **S3-T6 Steps and writes** — `src/lib/research/steps.ts` (state machine discover → filter → enrich → sources → rate → check → score → leads; 20-min partial, 40-min stop), `discover.ts` (ultra schema ≤20 properties, 40–50 target), `src/lib/claude/leads.ts` (Sonnet; Q4 checks), `src/lib/db/research.ts` (runs, steps, claim), `src/lib/db/write.ts` (stakeholders, facts, statements, sources incl. rejected, edges, timed events, leads).
- **S3-T7 Routes and start** — `src/app/api/webhooks/parallel/route.ts` (verify → store → next steps; idempotent on `parallel_run_id`), `src/app/api/dossiers/[id]/progress/route.ts` (phase, counts, latest 20 items, elapsed/ETA; advances missed steps: polls Task Group summary, checks runs idle >2 min, claims ≤8 queued Claude steps into `after()`), `src/lib/research/start.ts` (insert run + discover step; used by S4).
- **S3-T8 Live probe (paid)** — one Task Group with 2 `core` runs carrying a `webhook` + one Sonnet rating call, to confirm whether group runs send webhooks and that live structured output passes the checks. **Estimated cost: Parallel 2 × $0.025 = $0.05 + Claude ≈ $0.04 → about US$0.10. Report this estimate in chat and wait for Joey's confirmation before running with `RESEARCH_MODE=live`.** Record the answer in `docs/decisions/0001-research-engine.md` "Still unverified".

**Tests added**: `research.test.ts` (quality filter, China person filter), `checks.test.ts` (source-check loop, pre-display), `limits.test.ts` (§17 limits); updates `sample-dossier.test.ts`.

**Simpler version (built by default)**:
- §7.3 background work to 40 min + late entities added + brief marked Out of date (spec default) → stop everything at 20 min; unfinished entities `incomplete`.
- §8 daily limits for RE-BRIEF, documents, intro drafts (spec default) → one shared per-dossier AI counter (`dossier:<id>:ai`, 10/day) plus the cost ledger cap.

**/goal acceptance**:
```
- `npm test` exits 0 (research, checks, limits, sample tests included)
- `npm run build` exits 0
- `grep -nE 'RESEARCH_MODE' src/lib/parallel/client.ts src/lib/claude/client.ts` prints only `=== "live"` comparisons
- `for f in $(ls src/lib/{parallel,claude,db}/*.ts | grep -v test); do head -1 "$f" | grep -q 'server-only' || echo "$f"; done` prints nothing
- `grep -rnE 'PARALLEL_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SECRET_KEY' src | grep -vE '^src/lib/(db|claude|parallel)/'` prints nothing
- `grep -n '<source id=' src/lib/claude/prompts.ts` prints a line
- With `PORT=3001 npm run dev` running: curl POST /api/webhooks/parallel with a bad signature prints 401; with a signature made from the test secret in .env.local prints 200; repeating it prints 200 and the research_steps row count is unchanged (printed before/after)
- `git diff --name-only origin/main...HEAD | grep -vE '^(src/lib/(parallel|research|claude|checks|limits)/.*|src/lib/db/(research|write)\.ts|src/app/api/.*|src/fixtures/sample-dossier\.test\.ts|docs/decisions/0001-research-engine\.md)$'` prints nothing
- S3-T8 not run until Joey confirms the cost in chat (the confirmation message is quoted)
- or stop after 30 rounds
```

---

### S4 Real dossiers

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| engine | `feature/S4` | S3, S1, S2 merged | 4 h | P2 | none |

**Read first**: Next docs `01-getting-started/07-mutating-data`, `02-guides/server-actions.md`, `forms.md`, `03-api-reference/04-functions/after.md`, `redirect.md`, `refresh.md`; the `claude-api` skill (Opus 5.5, effort, structured outputs); spec §7.1, §7.3 (RES-1), §7.6, §8, §11.1; `docs/scoring.md` §4–7.

**Risky changes — list before code**:
- *Dossier ids and share ids*: `createDossier` must use `newDossierId()` / `newShareId()` (128 bits) and never reuse one. Verify: unique constraint + 22-char check in the e2e.
- *Limits and paid calls*: the third same-email request in a day must be blocked before any Parallel call; RE-BRIEF must show the cost and wait. Verify: e2e in mock mode (third request → friendly message); RE-BRIEF dialog text shows "about US$0.30".
- *Sources on refresh*: a wrong merge attaches one stakeholder's debriefs to another. Verify: `research.test.ts` refresh matching three outcomes; uncertain matches go to "Needs your check".
- *Email*: stored as entered for `email_outbox` and as a salted hash for counting; never in PostHog. Verify: grep for `email` in `src/lib/analytics.tsx` prints nothing.

**Files** (allowed regex: `^(src/app/actions/research\.ts|src/components/progress/.*|src/lib/db/(dossiers|read|briefs|load-dossier)\.ts|src/lib/research/(refresh-match|steps|research\.test)\.ts|src/lib/claude/brief\.ts|e2e/create\.spec\.ts)$`)

**Tasks**
- **S4-T1 Create** — `src/app/actions/research.ts` (`createDossier`: zod, honeypot, limits, ids, write `dossiers` / `research_runs` / `email_outbox`, `start.ts`; returns `{ id, url }`), `src/lib/db/dossiers.ts`.
- **S4-T2 RES-1** — `src/components/progress/research-progress.tsx` (polls progress every 3 s; lines one by one, bar, phase names; "Still researching" counts; failure copy + Try again; ready → "Your dossier is ready" + link; fires `dossier_created` once).
- **S4-T3 Reads** — `src/lib/db/load-dossier.ts` (DB branch for `loadDossier` and `loadByShareId`; 404 for unknown), `src/lib/db/read.ts` (assemble the `Dossier` aggregate; scores recomputed via `scoring`, never read from storage).
- **S4-T4 Brief** — `src/lib/claude/brief.ts` (Opus 5.5 effort high; inputs = sourced facts, code scores, contact-first order, form; outputs per scoring §6 + summary, risks, meet; `pre-display.ts`; "What changed and why" for v2+), `src/lib/research/steps.ts` (brief step), `src/lib/db/briefs.ts` (versions, `brief_check_log`), `rebrief` in `research.ts` (cost estimate → confirm → new version; limit).
- **S4-T5 Refresh** — `src/lib/research/refresh-match.ts` (§7.6 three rules), `research.test.ts` (three outcomes), `refreshDossier` + `resolveMatch` in `research.ts`, `src/components/progress/match-check.tsx` ("Same as X" / "Different"), `steps.ts` (refresh run kind; `not_found_latest`).
- **S4-T6 E2E** — `e2e/create.spec.ts` (mock: form → link shown → ≥10 progress lines one by one → ready in <60 s; third same-email request blocked).
- **S4-T7 Live run (paid)** — one real dossier end to end (the founder's chosen market/case). **Estimated cost: Parallel ≈ US$1.25–1.50 (cap $2) + Claude ≈ US$1.5–2.5 (cap $3.5) → about US$3–4, at most US$5.5. Report this estimate in chat and wait for Joey's confirmation before running with `RESEARCH_MODE=live`.** Print the `cost_ledger` total and elapsed time afterwards (spec §19.4).

**Tests added**: `research.test.ts` refresh matching (§17); `e2e/create.spec.ts` (§17 "create a dossier → progress lines appear → done").

**Simpler version**: none of S4's items are spec defaults (D2 refresh matching and D3 no-email are Joey's decisions). If late, ship create + RES-1 + reads + brief first and leave refresh for after the demo path (HOME-5 stays disabled with "Refresh opens soon").

**/goal acceptance**: §4 block with routes `/` (form), `/d/<mock dossier id>`, `/d/<mock id>/map`, `/d/<mock id>/brief`, `/d/<mock id>/report`; specs `e2e/create.spec.ts`; plus:
```
- In mock mode the e2e prints elapsed < 60 s and ≥ 10 progress lines
- `grep -n 'email' src/lib/analytics.tsx` prints nothing
- S4-T7 not run until Joey confirms the cost in chat (the confirmation message is quoted); afterwards the cost_ledger total ≤ 5.5 is printed
- or stop after 30 rounds
```

### Checkpoint B — real dossiers (target 11/2 10:00)
- [ ] One live dossier reached ready; Joey opened 5 stakeholders' sources and they match (workflow step 6)
- [ ] `cost_ledger` total ≤ US$5.5

---

### S6 Network + documents

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine | `feature/S6` (ui; stacked on S5 if unmerged); `feature/S6-engine` (engine, P-3) | S5; S4 for real dossiers; S3 for leads data | ui 3 h + engine 2 h | P3 | none |

**Read first**: Next docs `02-guides/server-actions.md`, `03-file-conventions/route.md` (PDF stream), `04-functions/after.md`; Supabase Storage (private bucket, server download); `design/mockup/src/04-network.template.html`, `07-documents.template.html`, `08-briefing-note.template.html`; `design/screens/04-network.png`, `07-documents.png`, `08-briefing-note.png`; spec §11.2–11.5, §12 (04, 07, 08); `docs/scoring.md` (Q4 note in spec §16).

**Risky changes — list before code**:
- *Paid draft* (briefing note, Opus): repeated requests spend money. Verify: per-dossier document limit + cost ledger; sample uses the pre-written note and never calls Claude (network log).
- *Document PDFs*: a public Storage URL exposes confidential decks. Verify: bucket private; viewer route checks the dossier id before streaming; no `getPublicUrl` (grep).
- *Ops scripts and the secret key*: scripts run only locally with `.env.local`. Verify: `scripts/ops` reads the key from env, never logs it; every action writes `ops_log`.
- *Sources in the note*: names verified >90 days ago are not used or marked "recheck"; "5.1 GHz" can't appear. Verify: `pre-display.ts` runs on every note sentence; placeholder grep.

**Files** — ui (allowed: `^(src/app/d/\[id\]/(network|docs)/.*|src/components/(network|docs)/.*|src/lib/db/(network|documents)\.ts)$`); engine (allowed: `^(docs/templates/.*|src/lib/claude/briefing-note\.ts|src/app/actions/drafts\.ts|scripts/ops/.*|src/fixtures/sample-dossier\.ts)$`). The slice PR diff must match the union.

**Tasks**
- **S6-T1 Network page (ui)** — `src/app/d/[id]/network/page.tsx` (260/1fr/360, ≥1600 280/1fr/400; grid 2 cols at 1440, 3 at 1920), `loading.tsx`, `error.tsx`, `src/components/network/tabs.tsx` (NET-1, NET-2 notes), `lead-card.tsx` (NET-3 match "High match · 3 of 4 checks", events "9 mapped stakeholders", why, route, stamp, Unverified).
- **S6-T2 Network actions (ui)** — `src/app/d/[id]/network/actions.ts` (save lead / add to plan → tracker Found with event date; intro request), `src/lib/db/network.ts`, `src/components/network/intro-form.tsx` (NET-6: preselected who, purpose ≤300, "Request received — we'll update your tracker", no success fee), NET-5 Show on map (disabled with a reason when not on the map) in `lead-card.tsx`.
- **S6-T3 Documents page (ui)** — `src/app/d/[id]/docs/page.tsx` (320/1fr/340, ≥1600 360/1fr/400), `loading.tsx`, `error.tsx`, `src/components/docs/request-form.tsx` (DOC-2…6, `?item=` preselect, expert switch text with `EXPERT_REVIEW_ETA_TEXT`), `doc-card.tsx` (DOC-10…12 status stamps per §11.3 labels; progress while drafting; Open / Add debrief / Open PDF / Strategy brief), `watch-list.tsx` (DOC-13).
- **S6-T4 Document flow (ui)** — `src/app/d/[id]/docs/actions.ts` (status moves per §11.3, §11.5 kept inline) (writes `document_requests` + `documents`, calls `startBriefingDraft`), `src/lib/db/documents.ts`.
- **S6-T5 Briefing note viewer (ui)** — `src/app/d/[id]/docs/[docId]/page.tsx` (NOTE-1…5, three A4 pages, print styles; uploaded PDFs: embedded viewer + download streamed after the id check), `src/components/docs/briefing-note.tsx`.
- **S6-T6 Walk-through (ui)** — `/verify-ui` steps on screens 04, 07, 08: save lead → tracker Found; request a briefing note on the sample → draft_ready with the sample note (screenshots printed; no new spec, P-17).
- **S6-T7 Template + sample note (engine)** — `docs/templates/briefing-note.md` (from mockup 08 with the §11.2 limits), `src/fixtures/sample-dossier.ts` (pre-written sample briefing note, sourced, Sample data; 48,750 only with its source).
- **S6-T8 Draft (engine)** — `src/lib/claude/briefing-note.ts` (Opus 5.5 per template; sourced facts only; `pre-display.ts`; inside `after()`), `src/app/actions/drafts.ts` (`startBriefingDraft`: limit, cost ledger, status drafting → draft_ready / failed). Live check of one draft is paid: **estimated ≈ US$0.30 (Opus); report in chat and wait for Joey's confirmation before `RESEARCH_MODE=live`.**
- **S6-T9 Ops scripts (engine)** — `scripts/ops/index.ts` (command router, `ops_log`), `docs.ts` (`doc:start`, `doc:approve`, `doc:changes`, `doc:upload`), `intro.ts` (`intro:update`, `introduced` moves the tracker item to Contacted), `admin.ts` (`outbox:list`, `dossier:delete`). Relative imports only (run with `node` via the `ops` script from S0-T1).

**Tests added**: none (P-17).

**Simpler version (built by default)**:
- Q4 match level (spec default) → show only "3 of 4 checks" with the list, no level word.
- Ops scripts (§11.4 spec default method) → keep `doc:approve`, `doc:upload`, `intro:update`, `dossier:delete`; do `doc:start`, `doc:changes`, `outbox:list` with the SQL editor (still writing an `ops_log` row by hand).
- Daily limit for document requests (spec default) → the shared AI counter (see S3).

**/goal acceptance**: §4 block with routes `/d/sample/network`, `/d/sample/network?tab=lawyers`, `/d/sample/docs`, `/d/sample/docs/<sample note id>`; the `npx playwright test` line runs the full suite; allowed regex = ui ∪ engine; plus:
```
- `grep -rn 'getPublicUrl' src scripts` prints nothing
- `git log --oneline feature/S6-engine | head -1` is contained in `git log feature/S6` (sub-branch merged, P-3)
- the paid draft check not run until Joey confirms the cost in chat
- or stop after 30 rounds
```

---

### S7 Team network

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine | `feature/S7` (ui; stacked on S6 if unmerged); `feature/S7-engine` (engine, P-3) | S1, S4 (spec); S7-T1/T2 before S7-T6/T7 | ui 3 h + engine 1.5 h | P3 | none |

**Read first**: spec §10 (all), §16 Q6, `design/intent.md` §6; LinkedIn export help (`linkedin.com/help/linkedin/answer/a566336`), Google Contacts export (`support.google.com/contacts/answer/7199294`), vCard RFC 6350 (FN, ORG, TITLE); `design/mockup/src/02-map.template.html` (team layer); `docs/scoring.md` §5 (+15 warm path). Run `/effort high` + `/plan` first; run `/security-review` before the PR (workflow.html).

**Risky changes — list before code** (uploaded contact files):
- *Third-party data*: contacts are people who never signed up. Keeping email/phone/notes or unmatched contacts stores data we don't need. Verify: `team.test.ts` asserts parsed records have only name, org, title, LinkedIn URL; server stores only matched or confirmed contacts.
- *Real dossiers before the lawyer*: `TEAM_NETWORK_REAL_ENABLED=false` must hide upload on real dossiers and the server must refuse. Verify: calling `saveTeamTies` with the flag false returns `{ ok: false }` (output printed); the real-dossier map shows "Team connections open after our privacy review".
- *Malicious files*: oversized, binary, formula-prefixed or HTML values. Verify: tests for >2 MB / >30,000 rows / non-UTF text rejected; `=+-@` prefixed with `'`; values rendered as text (no `dangerouslySetInnerHTML`, grep).
- *Withdrawal*: must delete at once. Verify: test "no data left after withdrawal" (sample state); server path hard-deletes contacts and ties.
- *Illustrative sample ties* (P-2): must never look real. Verify: every sample tie and draft renders the "Illustrative — not a real connection" label (screenshot).
- *China*: no individual names for Chinese organisations (only "1 contact"). Verify: matching test.
- *No sending*: drafts only have Copy and Close. Verify: grep for `mailto:` or send APIs in `src/components/team` prints nothing.

**Files** — engine (allowed: `^(src/lib/team/.*|src/lib/db/team\.ts|src/lib/claude/intro\.ts|src/app/actions/drafts\.ts|src/fixtures/sample-dossier\.ts)$`); ui (allowed: `^(src/components/team/.*|src/components/map/(influence-map|legend)\.tsx|src/app/d/\[id\]/map/page\.tsx|src/lib/sample/overlay\.ts|src/app/privacy/page\.tsx)$`).

**Tasks**
- **S7-T1 Parsing (engine)** — `src/lib/team/parse.ts` (LinkedIn CSV with note lines → header row containing `First Name`; Google CSV; vCard FN/ORG/TITLE; manual entry; drop email/phone/address/notes; trim 200; neutralise `=+-@`; size/row/encoding limits), `src/lib/team/team.test.ts`.
- **S7-T2 Matching and paths (engine)** — `src/lib/team/match.ts` (normalise; exact → matched, Jaccard ≥0.5 → confirm list, else discarded; China → count only), `warm-path.ts` (≤2 hops over sourced A–B edges; rank by strength, sources, length), `withdraw.ts` (pure removal used by overlay and server), `team.test.ts` (matching, 2-hop limit, no data after withdrawal). Merge into `feature/S7` by 11:00 so the ui can use it.
- **S7-T3 Server path, flag off (engine)** — `src/app/actions/drafts.ts` (`saveTeamTies`, `withdrawMember`, `writeIntroDraft`; refuse when `TEAM_NETWORK_REAL_ENABLED !== "true"`), `src/lib/db/team.ts` (store matched only; hard delete), `src/lib/claude/intro.ts` (Opus ≤120 words; inputs limited to §10.6 list; intro-draft daily limit).
- **S7-T4 Illustrative sample team (engine)** — `src/fixtures/sample-dossier.ts` (3–4 first-name teammates incl. one invited; contacts as redacted entries at mapped orgs; ties with strength and how; pre-written intro drafts; all `illustrative: true`).
- **S7-T5 Map layer (ui)** — `src/components/team/team-layer.tsx` (TEAM-2 centre nodes, white fill + `--act` border, dashed invited, dashed lines width = strength), `src/components/map/influence-map.tsx` (TEAM-1 switch in 3D only; warm path in `--route`), `src/components/map/legend.tsx` (Your team, Warm tie), `src/app/d/[id]/map/page.tsx` (left-column team block; real-dossier notice when the flag is off).
- **S7-T6 Members and upload (ui)** — `src/components/team/member-list.tsx` (TEAM-3 status, "3 of 4 connected", Add teammate = invited only), `upload-panel.tsx` (TEAM-4: "This is me" + consent tick; file → `parse.ts` in the browser; manual "I know X at Y"; confirm-matches list), `src/lib/sample/overlay.ts` (sample team state in localStorage, never sent).
- **S7-T7 Ties, paths, drafts (ui)** — `who-knows.tsx` (TEAM-5 member ties; TEAM-6 org "Who knows someone here"; redaction bars `role="img" aria-label="name withheld"`; ●●○; LinkedIn ↗ link), `warm-path.tsx` (TEAM-7 "Ask Mei to start the intro"; TEAM-8 none → "Request a Portolan expert intro" → NET-6 form), `intro-draft.tsx` (TEAM-9 "Draft · your teammate sends it", Copy draft, Close), `withdraw-dialog.tsx` (§10.7 copy; clears at once). `src/app/privacy/page.tsx` gets the team-ties paragraph only if S8 hasn't written it yet.

**Tests added**: `src/lib/team/team.test.ts` (§17 team bullet in full).

**Simpler version (built by default)**:
- §10.3 "store only matched contacts" server path (spec default; real dossiers stay off until the lawyer anyway) → skip S7-T3 entirely; the flag stays false and the server actions stay stubs. Saves ~1 h.
- Intro-draft daily limit (spec default) → shared AI counter (see S3).

**/goal acceptance**: §4 block with routes `/d/sample/map` (team layer on, a member selected, an org selected, a warm path shown, an intro draft open), `/d/<mock dossier id>/map` (flag-off notice); no new Playwright spec, so the `npx playwright test` line runs the full suite; allowed regex = ui ∪ engine; plus:
```
- `npx vitest run src/lib/team` exits 0
- `grep -rnE 'dangerouslySetInnerHTML|mailto:' src/components/team` prints nothing
- `grep -rniE 'linkedin\.com/(v2|oauth)|api\.linkedin' src` prints nothing
- /security-review run and its verified findings fixed (output printed)
- or stop after 30 rounds
```

### Checkpoint C — P3 (target 11/2 14:30)
- [ ] S6, S7 merged, or their status written down for the application

---

### S8 Pre-launch check

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui (run when no other coding session is open) | `feature/S8` | all merged (or what is merged, P4 rule) | 1.5 h | P4 | none |

**Read first**: Next docs `02-guides/production-checklist.md`, `data-security.md`, `content-security-policy.md`; the `agent-skills:shipping-and-launch` skill; spec §18, §19, §10.8; workflow.html step 6 (pre-launch check text and the audit workflow prompt).

**Risky changes — list before code**: S8 reviews every risky area (ids and share links, keys, paid calls and limits, sources and Unverified, China, uploads, prompt injection). Each verified finding is listed with how it could hurt a user and how the fix is verified, **before** the fix.

**Files**: `src/app/privacy/page.tsx`, `src/lib/sample/stand-in.ts` (delete), plus only the files named in verified findings (the PR lists each finding → file). Allowed regex: `^(src/app/privacy/page\.tsx|src/lib/sample/stand-in\.ts|<files from verified findings>)$`.

**Tasks**
- **S8-T1 Stand-in gone** — delete `src/lib/sample/stand-in.ts`; `grep -rn 'stand-in' src` prints nothing.
- **S8-T2 §19 success criteria** — run each of the 9 and print the evidence (Playwright full suite at four widths; placeholder grep; sample sourcing test; mock create <60 s; live dossier ledger from S4-T7; debrief/Undo; one-page PDF + share link; third request blocked; withdrawal leaves 0 rows; privacy content).
- **S8-T3 Security audit** — the workflow.html audit (every route and server action: leaked keys, prompt injection from fetched pages, guessable share links, per-email and site-wide limits), adversarially verified; `/security-review`; fix verified findings only.
- **S8-T4 Privacy page** — §10.8 content in plain English (what we store; inputs and fetched pages go to Parallel and Anthropic; the link is the only key; team ties: fields kept/dropped, matched only, this dossier only, withdrawal deletes; self-certified upload; how to ask for deletion; documents are research references, not legal or investment advice).
- **S8-T5 Boundaries** — §18 greps: `NEXT_PUBLIC_` only for PostHog; no three.js; no LinkedIn API; every `src/lib/{db,claude,parallel}` file is server-only; no `dangerouslySetInnerHTML` on fetched or uploaded text.
- **S8-T6 Production walk** — after merge: core flow on the production URL at 1440; dossier and A4 share link on a 390 phone viewport; Joey opens 5 sources of a known market before sending the URL.

**Tests added**: none (spec §17 lists none for S8).

**/goal acceptance**:
```
- `npm test` exits 0; `npm run build` exits 0; `npx playwright test` (full suite) exits 0
- `grep -rn 'stand-in' src` prints nothing
- `grep -rnE '\[(CLIENT|DATE|EXPERT NAME|Name)\]|5\.1 ?GHz|\bTBD\b|lorem' src --exclude=taiwan-uas.ts` prints nothing; `grep -rn 'ATLAS' src --include='*.tsx'` prints nothing
- `grep -rn 'NEXT_PUBLIC_' src | grep -v POSTHOG` prints nothing
- `grep -rnE "from ['\"]three['\"]|api\.linkedin" src` prints nothing
- §19 items 1–9: one evidence line each printed
- audit workflow + /security-review output printed; every verified finding has a fix commit
- screenshots of every route at 1440, 1920, 1280, 390 printed
- `git diff --name-only origin/main...HEAD` prints only privacy, stand-in and the files named in verified findings
- or stop after 30 rounds
```

---

### S9 Market home (option C) + "Markets" wording

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/dossier-page` | main after S8 | 2 h | P4 | none |

Joey picked option C "Briefing room" and the word "Markets" on 2026-11-02 (spec §12 01).

**Risky changes — list before code**: sources and Unverified (next moves and the bottom line reuse map/brief view models that already drop unaccepted sources; a stakeholder with no sourced step shows the Unverified fallback). No ids, keys, paid calls, China or uploads touched.

**Files**: `src/components/home/**`, `src/app/d/[id]/page.tsx`, `src/app/page.tsx`, `src/app/(loading,error).tsx`, `src/app/d/[id]/(error,not-found).tsx`, `src/app/d/[id]/map/page.tsx`, `src/app/s/[shareId]/not-found.tsx`, `src/app/privacy/page.tsx`, `src/components/shell/{tabs,nis,not-found-state,pick-first}.tsx`, `src/components/progress/progress-client.tsx` (copy only), `src/components/{map,network,brief}/*` (copy only), `e2e/*.spec.ts` (copy only), `docs/spec.md`, `docs/plan.md`, `CLAUDE.md` (tab names).

**Tasks**
- **S9-T1 Wording** — every on-screen "dossier" → "market"; code names, routes, tables, events unchanged. Server action error strings stay (engine lane; follow-up).
- **S9-T2 Layout** — HOME-1…9 as in spec §12 01: header + evidence panel, next moves, side column (alert, key judgments, chart inset, workspace links, your markets).
- **S9-T3 Source chips** — SRC-CHIP: `src/components/score/{grade.ts,source-chip.tsx,stamp.tsx,explain.ts}`, `src/components/brief/model.ts`, `src/components/map/details-panel.tsx`, `src/components/report/a4-report.tsx`, `src/app/globals.css`. Risk: a grade must never disappear or point at the wrong source. Verify: every chip's card shows the same label and grade as the source list; e2e checks `data-grade` on every evidence row; A4 still one page.

**Tests added**: none (copy and layout; e2e strings updated).

---

### S10 Briefing room layout for Map, Brief, A4 report, Tracker

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui | `feature/pages-briefing-room` (stacked on `feature/dossier-page`) | S9 | 2 h | P4 | none |

**Risky changes — list before code**: sources (brief citations become chips; evidence cards stay; A4 stays one page). Verify: e2e evidence-row grade check, A4 one-page check, chips open the right source.

**Files**: `src/components/{map,brief,report,tracker}/**` (layout and styling), `src/app/d/[id]/brief/page.tsx`, `e2e/demo-path.spec.ts` (only if a label moves), `docs/spec.md`, `docs/plan.md`.

**Tests added**: none.

### S11 Entry requirements on the brief and A4 (added 2026-11-02, Joey)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine (one session) | `feature/entry-requirements` | S10 | 3 h | P4 | none |

Why: three AI-written entry reports (Gemini, ChatGPT-style) all lead with "what you must meet to bid"; ours had it only scattered in Key risks. Joey picked "Claude writes it into the brief" and layout B (replaces Key risks on the A4).

**Risky changes — list before code** (sources and Unverified marks; types + migration, approved by Joey 2026-11-02):
- *An unsourced rule shown as fact* (e.g. "foreign firms can't bid" when a source doesn't say so) could make a user give up on a market. Verify: requirements go through the same pre-display check as every brief sentence (`brief.test.ts` asserts an uncited requirement is removed); the sample fixture test checks every requirement's sources.
- *The export-control check line read as advice.* It is fixed code text, grey, dashed mark, "Needs a specialist check (no source found)"; it is never written by Claude. Verify: unit test that it appears only when no sourced export-control item exists.
- *A4 runs past one page.* Verify: the e2e one-page check; the A4 shows at most 4 items.
- *Migration not applied before deploy* → inserting a brief fails in production. Verify: Joey runs `npx supabase@2 db push` before merging; reading old rows without the column falls back to `[]`.
- No paid API call is needed to build or test this (mock brief uses the sample).

**Files**: `supabase/migrations/20261102120000_brief_requirements.sql`, `src/lib/types.ts` (Brief.requirements), `src/lib/db/{briefs,read}.ts`, `src/lib/claude/brief.ts`, `src/lib/scoring/brief-status.ts` (cited ids), `src/fixtures/sample-dossier.ts` (+ test), `src/components/brief/{model.ts,requirements.tsx}`, `src/app/d/[id]/brief/page.tsx`, `src/components/report/{model.ts,a4-report.tsx,report.css}`, `src/lib/claude/brief.test.ts`, `src/lib/scoring/scoring.test.ts` (Brief literal), `design/entry-requirements-options/index.html`, `docs/spec.md`, `docs/plan.md`.

**Tests added**: `brief.test.ts` — an uncited requirement is removed; the export-control line appears only without a sourced export-control item. Fixture test covers requirements.

### S12 Entry verdict on the A4 and home (added 2026-11-02, Joey)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui (one session) | `feature/entry-verdict` | S11 | 2 h | P4 | none |

Why: research (`reports/顧問級進場報告改進建議.md`) found consulting entry reports lead with a Go / Conditional-Go / No-Go call and its conditions. Joey chose a fixed code rule (not Claude) and layout A.

**Risky changes — list before code** (a new scored output; `docs/scoring.md` §8 thresholds approved by Joey when picking option A):
- *A verdict that overstates the evidence* (Go on thin data) could push a user into a market. Verify: Go needs every check at 3, opposition Low, a contact-first pick and data confidence not Low; unit tests cover each branch.
- *Reasons without sources read as facts.* Money and licence reasons cite their check's sources; the others are computed from scores and say so in their wording. No Claude text, no new prompt, no paid call.
- *A4 runs past one page.* Verify: e2e one-page check.
- No migration and no `src/lib/types.ts` change: the verdict is computed on each read like the metrics.

**Files**: `src/lib/scoring/{verdict.ts,index.ts,scoring.test.ts}`, `src/components/report/{model.ts,a4-report.tsx,report.css}`, `src/components/home/{model.ts,market-header.tsx}`, `src/components/score/verdict.ts`, `src/app/globals.css` (stamp), `design/verdict-options/index.html`, `docs/{scoring,spec,plan}.md`.

**Tests added**: `scoring.test.ts` — one case per verdict (none, no-go by licence 0, no-go by opposition High, go, conditional with reasons) and the sample gives Conditional go.

### S13 Waitlist page (added 2026-11-02, Joey)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine (one session) | `feature/waitlist` | S11 merged | 3 h | P4 | none |

Why: after a pitch, interested people leave company, email and phone so the team can follow up. Not in intent.md §5; Joey asked for it on 2026-11-02. Every decision is in spec §12 "09 Waitlist" (settled with Joey one question at a time): own page `/waitlist`, Supabase table as the CRM, Slack webhook notification (optional), all three fields required, required consent checkbox, honeypot + per-IP and site-wide daily limits, removal by replying to us, PostHog `waitlist_joined`.

**Risky changes — list before code** (personal data of people outside any dossier; a new migration, allowed by this plan):
- *Contact details readable by anyone.* The table has RLS on, no policies, and `revoke all … from anon, authenticated`; only the server (secret key) writes. There is no read path in the app. Verify: migration review; `grep` shows `waitlist` is read nowhere in `src/`.
- *Personal data leaking to analytics or logs.* The PostHog event carries only `from`; server logs never print the email or phone. Verify: unit test on the event props; code review of `console.*` lines.
- *Slack webhook URL exposed.* Server-only env var, read only in `src/lib/waitlist/notify.ts` (imports `server-only`). Verify: the acceptance `grep` for `NEXT_PUBLIC_.*SLACK` prints nothing; build passes with `server-only`.
- *Spam fills the table or floods Slack.* Honeypot + 5/IP/day + 200/day before any write or post. Verify: unit tests (6th call refused; honeypot stores and counts nothing).
- *The raw IP stored.* Only `sha256(ip + EMAIL_HASH_SALT)` appears, inside the `usage_counters` scope. Verify: unit test.
- *Migration not applied before deploy* → every submission fails with the friendly error. Verify: Joey runs `npx supabase@2 db push` before merging.
- No paid API is called.

**Files**: `supabase/migrations/20261102180000_waitlist.sql`, `src/lib/waitlist/{join.ts,join.test.ts,shared.ts,notify.ts}`, `src/lib/db/waitlist.ts`, `src/app/waitlist/{page.tsx,actions.ts,loading.tsx,error.tsx}`, `src/components/waitlist/**`, `src/app/privacy/page.tsx`, `src/lib/analytics.tsx` (event name), `src/app/d/[id]/docs/page.tsx` + `src/components/docs/docs-view.tsx` (a `footer` slot at the foot of the right column) and `src/app/s/[shareId]/page.tsx` (one link each), `.env.example`, `docs/metrics.md`, `design/waitlist-options/index.html`, `docs/spec.md`, `docs/plan.md`. `src/lib/types.ts` is not changed (the waitlist types live in `src/lib/waitlist/join.ts`).

**Tests added**: `join.test.ts` — validation (each field, phone rule, consent required, `from` falls back to direct); honeypot stores and counts nothing; IP limit checked before the site limit and a refusal writes nothing; the stored scope holds a hash, not the IP; analytics props contain only `from`.

**Acceptance**: the shared block (§4) with route `/waitlist` (plus `/privacy`, `/d/sample/docs`, `/s/<sample share id>` for the links) at 1440 and 390; `grep -rn 'NEXT_PUBLIC_[A-Z_]*SLACK' .` prints nothing.

### S14 No spec-in rule + "What we could not verify" (added 2026-11-02, slices A + B of the consulting-report handover)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine (one session) | `feature/spec-in-rule-and-unverified-box` | S12 | 3 h | P4 | none |

Why: the research report (`reports/顧問級進場報告改進建議.md`) found one of three AI entry reports advised "spec-in", which can break Government Procurement Act Art. 26 and Art. 88. Its other finding: listing what we could not verify turns the Unverified rule into a selling point. Spec BRIEF-10, BRIEF-11, REP-13.

**Risky changes: list before code** (sources and Unverified marks; prompts of paid calls, but no paid call is made):
- *A: the check removes a lawful sentence* (a sourced fact about Art. 26, or the lawful alternative) and a section goes thin. Verify: `checks.test.ts` keeps an Art. 26 fact and the lawful alternative; it also runs every sample brief sentence and next step through the check and expects no match.
- *A: Claude words spec-in in a way the phrase list misses.* The prompt rule is the main guard and the list is a backstop; removals are logged in `brief_check_log`, so new wordings can be added. Verify: test covers English and Chinese wordings (spec-in, 綁標, tailor the tender, help the buyer write the specification, lock out rivals, name your brand in the tender).
- *A: a blocked next step.* It becomes Unverified ("Find a sourced contact route first"); this adds an Unverified mark and never hides one.
- *A: changed prompts change live output.* Nothing is run now; the next real brief costs about US$0.30 as before. Mock briefs are not affected.
- *B: the box says something is unverified when it is sourced, or the reverse.* It counts from the same data and filters as the marks on the map and metrics (`citable`, `scoreStakeholders`, `briefMetrics`). Verify: a unit test checks the sample's counts against those functions and that the box drops a line when that gap is filled.
- *B: the box hides an existing Unverified mark.* It only adds; the export-control line, Unknown support and Unverified next steps stay where they are. Verify: existing tests unchanged; screenshots.
- *B: the box reads as a finding or advice.* Fixed code sentences, grey dashed style like the export-control line, no Claude text, no names (counts and topic names only; the A4 is shared by link).
- *B: the A4 runs past one page.* The A4 line is cut by characters with "and N more in the strategy brief". Verify: e2e one-page check.
- No migration and no `src/lib/types.ts` change: the box is computed on read, like the metrics.

**Files**: A: `src/lib/claude/{prompts.ts,brief.ts,briefing-note.ts,rate.ts}`, `src/lib/checks/{pre-display.ts,checks.test.ts}`, `src/components/brief/model.ts` and `src/components/map/model.ts` (display filters). B: `src/components/brief/{model.ts,unverified.tsx}`, `src/app/d/[id]/brief/page.tsx`, `src/components/report/{model.ts,a4-report.tsx,report.css}`, `src/lib/claude/brief.test.ts`, `design/unverified-options/index.html`. Both: `docs/spec.md`, `docs/plan.md`.

**Tests added**: `checks.test.ts`: spec-in sentences removed with the reason; lawful sentences kept; no sample sentence matches. `brief.test.ts`: the box's lines and counts on the sample, and a line goes away when its gap is sourced.

**Acceptance**: the shared block (§4) with routes `/d/sample/brief` and `/d/sample/report`; `PORT=3001 npx playwright test e2e/demo-path.spec.ts` (A4 stays one page).

### S15 Partner candidates (added 2026-11-02, slice C of the consulting-report handover)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui (one session) | `feature/partner-cards` (stacked on S14) | S14 | 3 h | P4 | none |

Why: the founder approved slices A, B, C, D and F on 2026-11-02 (not E, G, H). The research report ranks named local partners as the strongest upgrade: a paid report with no named partners repeats the free trade.gov guide. Joey chose "existing data only" (no Claude classification, no Parallel enrich). Spec NET-7, REP-14.

**Risky changes: list before code** (sources and Unverified marks; China rule):
- *A card read as an endorsement.* "Candidate" label, fixed line "Ranked by public evidence, not endorsed", human intro as the route.
- *Evidence overstated* (an MOU shown as a contract). Each item is its own sourced text; code adds no kind label.
- *A wrong flag.* Flags come from verbatim quotes and show that quote. Verify: tests for both flags and for non-matches.
- *China rule.* An Industry stakeholder in China never gets a card. Verify: unit test.
- *Unsourced items on a card.* Only accepted sources with a verified date; a next step with none shows Unverified. Verify: test that every evidence item has refs.
- *A4 past one page.* Verify: e2e one-page check.
- No migration, no `src/lib/types.ts` change, no paid call.

**Files**: `src/components/partners/{model.ts,partners.test.ts,partner-card.tsx}`, `src/components/network/{model.ts,tabs.tsx,network-view.tsx}`, `src/app/d/[id]/network/page.tsx`, `src/components/report/{model.ts,a4-report.tsx,report.css}`, `design/partner-options/index.html`, `docs/spec.md`, `docs/plan.md`.

**Tests added**: `partners.test.ts`: sample cards, order and counts; exclusive flag on MiTAC and JC Tech only; contract trouble on Tron Future only; China excluded; every evidence item cited.

**Acceptance**: the shared block (§4) with routes `/d/sample/network?tab=partners` and `/d/sample/report`; `PORT=3001 npx playwright test e2e/demo-path.spec.ts`.

### S16 Procurement routes and the first buyer (added 2026-11-02, slice D of the consulting-report handover)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine (one session) | `feature/procurement-routes` (stacked on S15) | S15 | 4 h | P4 | none |

Why: a consultant says who pays first, through which channel, and whether the money is there. The research report found the 2026 budget changed sharply, so every amount carries a date and a status. Joey chose a code rule for the first buyer (`docs/scoring.md` §9). Spec BRIEF-12, REP-15.

**Risky changes: list before code** (sources and Unverified marks; brief prompt of a paid call; `types.ts` + migration, approved with this plan by Joey 2026-11-02):
- *An out-of-date amount read as current.* No amount without `as_of` and `status`; the status is printed next to it. Verify: unit test.
- *A route said to be open to foreign firms when it is not.* The access value is part of a cited row; an uncited row is removed. Verify: test.
- *First buyer overstated.* Code rule with its explanation, worded "most likely". Verify: one test per ranking step.
- *Spec-in.* Route sentences go through BRIEF-10.
- *Migration not applied before deploy.* `briefs.routes jsonb default '[]'`; old rows read `[]` and the section hides. Verify: Joey runs `npx supabase@2 db push` before merging.
- *Paid call.* None in this slice; the next user-triggered brief (~US$0.30, cost shown first) writes routes.
- *A4 past one page.* Verify: e2e one-page check.

**Files**: `supabase/migrations/20261102200000_brief_routes.sql`, `src/lib/types.ts`, `src/lib/db/{briefs,read}.ts`, `src/lib/claude/brief.ts`, `src/lib/scoring/{first-buyer.ts,index.ts,brief-status.ts,scoring.test.ts}`, `src/fixtures/sample-dossier.ts`, `src/components/brief/{model.ts,routes.tsx}`, `src/app/d/[id]/brief/page.tsx`, `src/components/report/{model.ts,a4-report.tsx,report.css}`, `src/lib/claude/brief.test.ts`, `design/route-options/index.html`, `docs/{spec,scoring,plan}.md`.

**Tests added**: `scoring.test.ts`: first-buyer ranking steps and the none case. `brief.test.ts`: sample routes in order; an uncited route is removed; an undated amount is hidden; a missing route shows in What we could not verify.

**Acceptance**: the shared block (§4) with routes `/d/sample/brief` and `/d/sample/report`; `PORT=3001 npx playwright test e2e/demo-path.spec.ts`.

### S18 Meeting memo → influence score (added 2026-11-02, Erin)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + engine (one session) | `feature/meeting-memo` | S16 | 5 h | P4 | none |

Why: a meeting tells the team who really decides, who holds the money and what's moving now, but the debrief only changed support. Erin chose "memo wins" (a first-hand answer replaces the research rating for that factor), quick questions plus optional detail, and the sample showing the loop everywhere. Spec TRK-9…12, `docs/scoring.md` §3.2.

**Risky changes: list before code** (scores and sources; `types.ts` + migration, approved with this plan by Erin 2026-11-02):
- *A team's impression overriding sourced research.* The factor is labelled "From your meeting, {date}" wherever it's explained; Undo restores the research rating; "Not sure" writes nothing. Verify: unit tests for override, Not sure and Undo.
- *China rule.* "Who we met" for a China stakeholder is role only; a value that looks like a personal name is refused by the client and the zod check. Verify: test.
- *Memo text steering Claude.* Memo free text is bounded (zod) and goes into its own fenced `<debrief>` block; notes are never sent. Verify: `brief.test.ts` fence test.
- *Privacy.* The memo is excluded from the share link, A4 and playbook. Verify: e2e share-link HTML has no memo text; playbook test unchanged.
- *Migration not applied before deploy.* `debriefs.memo jsonb` (nullable), `facts.debrief_id` and `edges.debrief_id` (nullable, cascade). Old rows read null. Verify: the merger runs `npx supabase@2 db push` before merging.
- *Research statements hidden by a run-less fact.* `read.ts` ignores debrief facts when picking a stakeholder's latest run. Verify: test.
- *Paid call.* None.

**Files**: `supabase/migrations/20261102220000_debrief_memo.sql`, `src/lib/types.ts`, `src/lib/tracker/{memo.ts,flow.ts,flow.test.ts}`, `src/lib/scoring/{influence.ts,brief-status.ts,scoring.test.ts}`, `src/lib/db/{tracker.ts,read.ts}`, `src/app/d/[id]/tracker/actions.ts`, `src/components/tracker/{debrief-form.tsx,memo-detail.tsx,debrief-result.tsx,tracker-view.tsx}`, `src/components/score/explain.ts`, `src/components/map/{model.ts,sample-map.tsx}`, `src/app/d/[id]/map/page.tsx`, `src/components/brief/{model.ts,sample-live.tsx}`, `src/app/d/[id]/brief/page.tsx`, `src/lib/sample/{overlay.ts,use-sample-dossier.ts}`, `src/lib/claude/{brief.ts,briefing-note.ts,prompts.ts,brief.test.ts}`, `e2e/demo-path.spec.ts`, `design/memo-options/index.html`, `docs/{spec,scoring,plan}.md`.

**Tests added**: `flow.test.ts`: a "Decides" answer → authority 3 replacing research; Not sure adds nothing; Undo restores influence exactly; stance override; memo edge raises centrality; China name refused. `scoring.test.ts`: debrief-first rule; brief status gives the debrief reason only. e2e: sample memo → map details shows "From your meeting" and the new influence, brief shows Out of date, Undo restores; share link has no memo text.

**Acceptance**: the shared block (§4) with routes `/d/sample/tracker`, `/d/sample/map`, `/d/sample/brief`; `npx playwright test e2e/demo-path.spec.ts`.

---

### S17 Traditional Chinese (繁中) version (added 2026-11-02, Erin)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui (one side session) | `claude/zh-tw-68e50f` | S16 merged | 5 h | P4 | none |

Why: Erin asked for a Chinese version of the app beside the English one, with a visible switch. Spec SHELL-4 (I18N-1…7). Runs beside `feature/meeting-memo`, which touches `src/components/{tracker,score}/*`, `src/components/map/details-panel.tsx`, `src/lib/{tracker,scoring}/*` and `src/lib/types.ts`: in those files strings are only wrapped in `t(…)`, nothing is restructured.

**Approach** (Next.js 16 i18n guide read; no package): the guide's `app/[lang]` routing would move every route and change every dossier and share URL, so the locale is a cookie instead. A typed dictionary keyed by the English text (`src/lib/i18n/zh-TW.ts`); `t("Add to tracker")` only compiles when the key exists, and English is the fallback. Server components call `await getT()` (reads the cookie inside the existing `<Suspense>` boundaries; `cacheComponents` stays on); client components call `useT()` from a provider in the root layout. Code-written sentences built in model files are translated where they are shown with `tx()`, which matches dictionary patterns such as `Based on {n} of {m} factors` and keeps the `{…}` values verbatim, so model files do not change.

**Risky changes — list before code** (sources and Unverified marks; share links):
- *A source excerpt, title, quote or name gets translated or changed.* `tx()` is only applied to code-written strings; placeholder values are copied as they are. Verify: unit test that `tx` leaves a sample excerpt and an organisation name unchanged and that every `{…}` value survives; e2e checks a sample excerpt is identical in both languages.
- *An "Unverified" mark or "Sample data" stamp disappears in Chinese.* They become 未驗證 / 範例資料 with the English word kept in `data-*`/`title`. Verify: e2e checks 範例資料 on the Chinese A4; screenshots.
- *The Chinese A4 runs past one page.* Verify: e2e prints the Chinese A4 and expects one page.
- *Share or dossier URLs change.* The locale never enters a URL. Verify: e2e share link text is the same in both languages.
- *Static shell shows the wrong language.* Locale-dependent text renders inside `<Suspense>`; the static shell only holds skeletons. Verify: build passes with `cacheComponents`; screenshots in Chinese with a cold load.
- *Research text mistranslated by a paid call.* No paid call is made; research text stays in its language.
- No migration, no `src/lib/types.ts` change.

**Files**: new `src/lib/i18n/{index.ts,server.ts,client.tsx,zh-TW.ts,i18n.test.ts}`, `src/components/shell/lang-switch.tsx`, `src/components/brief/evidence-card.tsx` (the evidence card moved out of `evidence.tsx` so the sources page, a client component, can still use it); string wrapping in `src/app/**/*.tsx` (pages, layouts, loading, error, not-found), `src/components/**/*.tsx`, `src/components/report/report.css` and `src/app/globals.css` (CJK font stack, A4 fit), `src/app/layout.tsx` (Noto Sans TC, provider), `e2e/demo-path.spec.ts` (Chinese check), `design/language-options/index.html`, `docs/spec.md`, `docs/plan.md`. Model `.ts` files and `src/lib/**` (other than `src/lib/i18n/`) are not changed, except the date formatter calls listed in their components.

**Tests added**: `i18n.test.ts`: `tx` exact and pattern matches, values kept verbatim, English fallback, Chinese dates. `demo-path.spec.ts`: switch to 繁中 on `/d/sample`, tabs read 市場/地圖, the A4 prints on one page with 範例資料, switch back to English.

**Acceptance**: the shared block (§4) with routes `/`, `/d/sample`, `/d/sample/{map,brief,report,tracker,network,docs,sources}`, `/s/<sample share id>`, `/privacy`, `/waitlist`, in both languages; `PORT=3001 npx playwright test e2e/demo-path.spec.ts`.

### S18 Market conclusions, brief and A4 in 繁中 (added 2026-11-02, Erin; brief and A4 added the same day)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui (one side session) | `feature/zh-sample-conclusions` | S17 merged | 1.5 h | P4 | none |

Why: spec I18N-8. Sample only; real dossiers need a paid step, so the options and costs go to Erin in the PR (not built).

**Risky changes — list before code** (sources and Unverified marks; sample data):
- *A translation changes a fact* (a number, a date, who decides). Verify: unit test that every number in each Chinese sentence matches the English (NT$210 billion → 2,100 億, 27 August 2026 → 2026年8月27日); organisation names are the stakeholders' sourced `nameZh`.
- *A translation stands in for a real dossier's sentence.* `t.r` is an exact-match lookup on the sample's sentences only. Verify: unit test that an unknown sentence comes back unchanged.
- *A home conclusion is missed.* Verify: unit test that every bottom line, key judgment and next step on `/d/sample` has an entry; e2e that no conclusion on `/d/sample` in 繁中 has a run of English words.
- No paid call, no migration, no `src/lib/types.ts` change; tracker and memo files untouched.

**Files**: `src/fixtures/sample-dossier.zh.ts` (new), `src/lib/i18n/{index.ts,zh-TW.ts,i18n.test.ts}`, `src/components/home/{model.ts,market-header.tsx,key-judgments.tsx,next-moves.tsx,dossier-select.tsx}`, `src/components/brief/{rationale,exec-path,seven-day,requirements,routes}.tsx`, `src/app/d/[id]/brief/page.tsx`, `src/components/report/a4-report.tsx`, `e2e/demo-path.spec.ts`, `docs/spec.md`, `docs/plan.md`.

**Acceptance**: `npm test`, `npm run build`, `npx playwright test e2e/demo-path.spec.ts` (no English sentence on the sample's home, brief and A4 in 繁中; the A4 prints on one page); screenshots of `/d/sample`, `/d/sample/brief`, `/d/sample/report` in 繁中 at 1440 and 390.

### S19 繁中 for real dossiers: translation pass after the brief (option B, Erin 2026-11-03)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| engine + ui (one side session) | `feature/zh-real-dossiers` (stacked on S18's `feature/zh-sample-conclusions`) | S18 | 4 h | P4 | none |

Why: spec I18N-9. Erin picked option B from PR #28 and approved the migration and `src/lib/types.ts` change. (S18 here is the 繁中 sample slice; PR #26's meeting memo also says S18, so this is S19.)

**Risky changes — list before code** (a paid API call; sources and Unverified marks; a migration):
- *A translation changes a fact* (number, date, amount). Code compares the numbers in each pair; a mismatch falls back to English. Verify: unit tests for a changed number, a dropped number, and billion/億 and date conversions passing.
- *A translation cites differently or invents a name.* The output carries the item's source ids, which must equal the English ones; names travel as tokens that must all come back, and the raw output may not contain any stakeholder's Chinese name outside a token. A translated abbreviation (e.g. 警政署 for "NPA") can't be caught by code; the prompt says names that aren't tokens stay in their original letters. Verify: unit tests for a missing token, an extra source id and a raw Chinese name.
- *An unchecked sentence gets translated.* Input is built only from the stored brief (already through the pre-display check) and sourced action facts. Verify: unit test that a removed sentence isn't sent.
- *Prompt injection from data.* Each sentence is fenced as data; no excerpt, title or URL is sent. Verify: prompt test.
- *China organisation-level rule.* Person stakeholders in China are never tokenised with a name (their token stays the English organisation-level label) and the sentences come from text that already passed the check. Verify: unit test.
- *Cost.* One Sonnet call per brief version: input ≈ 4–10k tokens, output ≈ 3–7k → ≈ US$0.05–0.10, worst case (max_tokens 12,000) ≈ US$0.14. Estimate written to `cost_ledger` before the call (purpose `brief_zh`); inside a run it is capped like the brief (the brief reserve is free once the brief is written); RE-BRIEF is limited by the daily AI counter, and its shown estimate rises to US$0.40. No live call is made in this slice; tests use mock mode.
- *Translation failure breaks the brief.* It runs after the brief row is inserted, inside try/catch; failure only logs. Verify: unit test with a failing call.
- *Migration not applied before deploy* → inserts/updates fail. `briefs.zh jsonb null`; the update is skipped on error and logged. Verify: Joey runs `npx supabase@2 db push` before merging.

**Files**: `supabase/migrations/20261103090000_brief_zh.sql`, `src/lib/types.ts` (`Brief.zh`), `src/lib/db/{briefs,read}.ts`, `src/lib/claude/{translate.ts,translate.test.ts,brief.ts}`, `src/lib/limits/ledger.ts` (`brief_zh` uses the brief's cap), `src/lib/research/steps.ts`, `src/app/actions/research.ts`, `src/lib/i18n/{index.ts,zh-TW.ts}`, `src/components/home/*`, `src/components/brief/*`, `src/components/report/{model.ts,a4-report.tsx}`, `src/app/d/[id]/brief/page.tsx`, `docs/spec.md`, `docs/plan.md`. Tracker and memo files untouched.

**Tests added**: `translate.test.ts` — the checks (numbers, ids, tokens, raw names, Chinese present), mock output on the sample, failure leaves `zh` null, fenced prompt with no excerpts.

**Acceptance**: `npm test`, `npm run build`, `npx playwright test e2e/demo-path.spec.ts` (mock mode). No paid call.

### S20 Vietnam and Thailand, demo version (added 2026-11-03, Joey)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| engine + ui (this session) | `feature/market-choice` | main @ 363738e | 3 h | P4 | none |

Why: spec MKT-1. Joey wants to show a South-East Asian travel-agency startup how it could enter Vietnam or Thailand, and picked the demo version over a full travel-industry profile. Joey approved the migration and the `src/lib/types.ts` change (`Market`).

**Risky changes — list before code** (sources and grades; a migration; the China rule):
- *A VN/TH prompt still says Taiwan*, so research looks in the wrong country. Every prompt and Parallel input takes the market from the dossier. Verify: unit test that the VN prompts and discover/enrich inputs name Vietnam and contain no "Taiwan".
- *VN/TH government sources graded F*, which would hide official sources and lower data confidence. Add `gov.vn`, `chinhphu.vn`, `go.th` as A and their wire services and national papers as B. Verify: unit test on `gradeSource`.
- *A Taiwan sentence leaks into a VN/TH page* (made-in-Taiwan question, "Taiwanese partner"). Code-written strings take the market. Verify: unit tests on the partner questions and brief needs for VN.
- *China rule.* Unchanged: the filter and prompt rule do not depend on the market. Verify: existing tests pass.
- *Taiwan dossiers change.* Taiwan keeps its exact wording where it named Taiwan; the sample stays the same. Verify: e2e demo path (one-page A4) passes.
- *Migration not applied before deploy* → creating a VN/TH market fails (TW still works). Verify: Joey runs `npx supabase@2 db push` before merging.
- *Cost.* No paid call in this slice. A live VN or TH run costs about US$4.50 Parallel plus Claude; it is run only after Joey confirms the estimate.

**Files**: `supabase/migrations/20261103120000_market_vn_th.sql`, `src/lib/types.ts` (`Market`), `src/lib/markets.ts` (new: names per market), `src/app/actions/research.ts`, `src/lib/db/{dossiers,read}.ts`, `src/lib/research/{discover,reliability}.ts`, `src/lib/claude/{prompts,brief,briefing-note,leads}.ts`, `src/components/home/{new-dossier-form,model,home-view}.tsx|ts`, `src/components/brief/*`, `src/components/partners/model.ts`, `src/components/network/network-view.tsx`, `src/components/report/{model.ts,a4-report.tsx}`, `src/components/docs/docs-view.tsx`, `src/lib/db/documents.ts`, `src/lib/i18n/zh-TW.ts`, tests next to them, `docs/spec.md`, `docs/plan.md`.

**Tests added**: `markets.test.ts` — VN prompts and Parallel inputs name Vietnam with no "Taiwan"; VN/TH government domains grade A; VN partner questions and needs have no Taiwan wording.

**Acceptance**: `npm test`, `npm run build`, `PORT=3001 npx playwright test e2e/demo-path.spec.ts` (mock mode). No paid call.

### S21 Vietnam sample, hand-curated (added 2026-11-03, Joey)

| Lane | Branch | Depends on | Estimate | Priority | Packages |
|---|---|---|---|---|---|
| ui + fixture (this session) | `feature/sample-vietnam` (stacked on S20's `feature/market-choice`) | S20 | 4 h | P4 | none |

Why: spec MKT-2. Joey wants a demo for a Taiwanese travel-agency startup going to Vietnam, in 繁中, with no paid research.

**Risky changes — list before code** (sources and Unverified marks; sample ids and share links):
- *A made-up fact in a defence-grade product.* Every fact cites a fetched page with a verbatim excerpt; the same source-check loop as the Taiwan sample runs on it (quote in excerpt, numbers in excerpt). Verify: `sample-vietnam.test.ts`.
- *A hand translation changes a fact.* Translations keep the same numbers and dates. Verify: unit test that each 繁中 sentence has the same digits as its English.
- *A second sample id opens writes or the database.* Every place that refuses writes for `sample` also refuses `sample-vn` (one `isSampleId` helper). Verify: unit test on the helper; e2e opens `/d/sample-vn` with no non-GET requests.
- *Share link guessable.* `sample-vn` is a fixed public id like `sample`; it shows only Sample data. Real ids stay 128-bit.
- *Named people.* None, except a sourced public official in a head fact.
- *Cost.* No Parallel or Claude call; research is done by hand in this session.

**Files**: `src/fixtures/sample-vietnam.ts` (繁中 in its brief's `zh`), `src/lib/ids.ts` (`SAMPLE_VN_ID`, `isSampleId`), `src/lib/sample/reader.ts`, `src/lib/db/load-dossier.ts`, `src/app/d/[id]/layout.tsx`, the server actions that refuse sample writes (`src/app/actions/drafts.ts`, `src/app/d/[id]/{docs,network,tracker}/actions.ts`), `src/lib/browser-dossiers.ts`, `src/lib/sample/*`, `src/lib/sample/overlay.ts` (a separate local-changes key for `/d/sample-vn`), `docs/spec.md`, `docs/plan.md`.

**Tests added**: none (Joey 2026-11-03: 「no need to run tests. just build」). The source-check loop was run once by hand on the fixture before commit and passed; the contact order is computed by the scoring code inside the fixture.

**Not changed (Joey: 「i don't want this to cover my original website」)**: `/`, `/d/sample` and the "Your markets" list. The Vietnam sample is reached only by its own link.

**Acceptance**: `npm run build`. No paid call.

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| S0 runs long and blocks both lanes | High | S0 tasks are small; if S0 passes 4 h, merge after T8 and finish T9–T10 on `feature/S0` follow-up commits before S1 needs them |
| Joey asleep → no merges overnight | Medium | Stacked ui branches (P-11); engine branches need only S0/S0b merged before bed |
| Task Group webhooks don't fire | Low | Polling is the guarantee (P-5); S3-T8 confirms for US$0.10 |
| Parallel balance (~US$13.66) too low for live runs + pilots | Medium | Only S3-T8 (~$0.10), S4-T7 (~$1.5 Parallel) and S6-T8 are planned; top up before launch (spec §16 Q2) |
| Production `/d/sample` shows stand-in data before S0b merges | Medium | URL is not shared before S8; S0b merges ~23:00 11/1 |
| A slice needs a type or migration change | Medium | Stop and ask (CLAUDE.md); S0 defines the whole schema and the RPC functions up front |
| `intent.md` §5 still says `/d/sample` uses `taiwan-uas.ts` | Low | Superseded by spec D1 and intent §15 (real organisations, sourced); worth a one-line fix in intent.md (not changed here) |
| `/verify-ui` can't be model-invoked | Low | P-13: follow its steps inside `/goal` |

---

## 7. intent §5 → spec → slice → task → priority

| Screen | intent §5 row | Spec feature | Slice | Task | Priority |
|---|---|---|---|---|---|
| 01 | Brand bar, plan label, tagline | HOME-1 | S1 | S1-T2 | P1 |
| 01 | 01–06 quick-nav grid | HOME-2 | S1 | S1-T2 | P1 |
| 01 | Current dossier card (stamps, name, country, refreshed) | HOME-3 | S1 | S1-T3 | P1 |
| 01 | Confidence + source count, opens the method | HOME-4, SCORE-X | S1 | S1-T3, S1-T1 | P1 |
| 01 | Refresh button | HOME-5, §7.6, §8 | S1 (button), S4 (wired) | S1-T3, S4-T5 | P1 / P2 |
| 01 | Three numbers | HOME-3 | S1 | S1-T3 | P1 |
| 01 | Open 3D stakeholder map | HOME-3 | S1 | S1-T3 | P1 |
| 01 | Time-sensitive alert | HOME-6 | S1 | S1-T3 | P1 |
| 01 | Select dossier | HOME-7 | S1 | S1-T3 | P1 |
| 01 | + New dossier / Close | HOME-8 | S1 | S1-T4 | P1 |
| 01 | Form (required, optional, market dropdown) | HOME-8, §7.1 | S1 (UI), S4 (wired) | S1-T4, S4-T1 | P1 / P2 |
| 01 | Research progress screen | RES-1, §7.3 | S3 (API), S4 (screen) | S3-T7, S4-T2 | P2 |
| 02 | Title bar, N of M shown, Sample data | MAP-1 | S1 | S1-T6 | P1 |
| 02 | 3D / Power Matrix toggle | MAP-2 | S1 | S1-T6 | P1 |
| 02 | 3D map (project, auto/drag/button rotation, pause) | MAP-3 | S1 | S1-T5 | P1 |
| 02 | Node size, colour, diamond, Unknown, names ≥78 | MAP-4 | S1 | S1-T5 | P1 |
| 02 | Click to highlight, click again to clear | MAP-5 | S1 | S1-T5 | P1 |
| 02 | Power Matrix quadrants, Unknown beside | MAP-6 | S1 | S1-T6 (rules S0-T6) | P1 |
| 02 | Category filter | MAP-7 | S1 | S1-T6 | P1 |
| 02 | Legend | MAP-8 | S1 | S1-T5 | P1 |
| 02 | Details panel | MAP-9, SCORE-X | S1 | S1-T7, S1-T1 | P1 |
| 02 | Recommended action, View evidence, Add to tracker | MAP-10 | S1 (sample), S5 (real) | S1-T7, S5-T4 | P1 |
| 02 | Three highlighted by default, list on phones | MAP-11 | S1 | S1-T7 (rule S0-T6) | P1 |
| 02 | Your team's connections switch | TEAM-1 | S7 | S7-T5 | P3 |
| 02 | Team member nodes, dashed lines, line width | TEAM-2 | S7 | S7-T5 | P3 |
| 02 | Your team's network list | TEAM-3 | S7 | S7-T6 | P3 |
| 02 | Upload LinkedIn export, Connect contacts | TEAM-4 | S7 | S7-T1, S7-T6 | P3 |
| 02 | Click a member to see ties | TEAM-5 | S7 | S7-T7 | P3 |
| 02 | Click an organisation: who knows someone here | TEAM-6 | S7 | S7-T7 | P3 |
| 02 | Best warm path | TEAM-7 | S7 | S7-T2, S7-T7 | P3 |
| 02 | Request a Portolan expert intro | TEAM-8, NET-6 | S7, S6 | S7-T7, S6-T2 | P3 |
| 02 | Intro draft, Copy draft, Close | TEAM-9 | S7 | S7-T3, S7-T4, S7-T7 | P3 |
| 03 | Version, RE-BRIEF, Out of date | BRIEF-1 | S2 (UI), S4 (RE-BRIEF) | S2-T1, S4-T4 | P1 / P2 |
| 03 | Four metrics | BRIEF-2, SCORE-X | S2 | S2-T1 (rules S0-T6) | P1 |
| 03 | Position rationale | BRIEF-3 | S2 | S2-T2 | P1 |
| 03 | Recommended executive path | BRIEF-4 | S2 | S2-T2 | P1 |
| 03 | 7-day entry plan | BRIEF-5 | S2 | S2-T2 | P1 |
| 03 | Pre-display check | BRIEF-6 | S3, S4 | S3-T5, S4-T4 | P2 |
| 03 | Evidence dossier | BRIEF-7, sources page | S2 | S2-T2, S2-T3 | P1 |
| 03 | Export one-page A4 PDF | BRIEF-8 | S2 | S2-T2 | P1 |
| 04 | Tabs: Investors, Lawyers, Events | NET-1 | S6 | S6-T1 | P3 |
| 04 | Note on each tab | NET-2 | S6 | S6-T1 | P3 |
| 04 | Card (type, name, match, terms, why, route) | NET-3, §16 Q4 | S6 (data S3) | S6-T1, S3-T6 | P3 |
| 04 | Save lead / Add to plan | NET-4 | S6 | S6-T2 | P3 |
| 04 | Show on map | NET-5 | S6 | S6-T2 | P3 |
| 04 | Ask Portolan for an intro | NET-6, §11.5 | S6 | S6-T2, S6-T9 | P3 |
| 05 | Header, Prepared for (no placeholders) | REP-1 | S2 | S2-T4 | P1 |
| 05 | Confidence and source count | REP-2 | S2 | S2-T4 | P1 |
| 05 | Executive summary | REP-3 | S2 | S2-T4 | P1 |
| 05 | Three metrics | REP-4 | S2 | S2-T4 | P1 |
| 05 | Map thumbnail | REP-5 | S2 | S2-T4 | P1 |
| 05 | Top 5 stakeholders table | REP-6 | S2 | S2-T4 | P1 |
| 05 | Recommended entry path, 7-day plan | REP-7 | S2 | S2-T4 | P1 |
| 05 | Where to meet them | REP-8 | S2 | S2-T4 | P1 |
| 05 | Entry requirements (Key risks when none) | REP-9, BRIEF-9 | S2, S11 | S2-T4, S11 | P1 |
| 05 | Source list and full-list link | REP-10 | S2 | S2-T4, S2-T5 | P1 |
| 05 | Share link, Sample data line | REP-11, §9 | S2 | S2-T4, S2-T5 | P1 |
| 05 | A4 print styles | REP-12 | S2 | S2-T4 | P1 |
| 06 | Four stage counts, filter, Show all | TRK-1 | S5 | S5-T2 | P1 |
| 06 | Debrief due card | TRK-2 | S5 | S5-T3 | P1 |
| 06 | Debrief form | TRK-3 | S5 | S5-T3 | P1 |
| 06 | What changed after Save debrief | TRK-4 | S5 | S5-T1, S5-T3 | P1 |
| 06 | Anonymised outcome to the playbook | TRK-5 | S5 | S5-T1, S5-T3 | P1 |
| 06 | Undo | TRK-6 | S5 | S5-T1, S5-T3 | P1 |
| 06 | Next steps list | TRK-7 | S5 | S5-T2 | P1 |
| 06 | Prepare a briefing note | TRK-8 | S5 | S5-T2 | P1 |
| 07 | Title, AI-drafted expert-reviewed, Connect | DOC-1 | S6 | S6-T3 | P3 |
| 07 | + Request a document / Close | DOC-2 | S6 | S6-T3 | P3 |
| 07 | Document types | DOC-3 | S6 | S6-T3 | P3 |
| 07 | Pick a meeting or stakeholder | DOC-4 | S6 | S6-T3 | P3 |
| 07 | Expert review switch and finish times | DOC-5, §16 Q1 | S6 | S6-T3 | P3 |
| 07 | Request → Request received | DOC-6 | S6 | S6-T4 | P3 |
| 07 | Briefing note AI draft | DOC-7, §11.2 | S6 (engine) | S6-T7, S6-T8 | P3 |
| 07 | Expert review | DOC-8, §11.3, §11.4 | S6 | S6-T4, S6-T9 | P3 |
| 07 | Risk deck, watch-list update | DOC-9 | S6 | S6-T4, S6-T9 | P3 |
| 07 | Your documents statuses | DOC-10 | S6 | S6-T3 | P3 |
| 07 | Briefing note Open, Add debrief | DOC-11 | S6 | S6-T3 | P3 |
| 07 | One-page report Open PDF, Strategy brief | DOC-12 | S6 | S6-T3 | P3 |
| 07 | Watch list (90–180 days) | DOC-13 | S6 | S6-T3 | P3 |
| 08 | Page 1 header, review stamp, meeting info, 24-hour debrief | NOTE-1 | S6 | S6-T5 | P3 |
| 08 | Four sections | NOTE-2, §11.2 | S6 | S6-T5, S6-T7, S6-T8 | P3 |
| 08 | Pages 2–3 | NOTE-3 | S6 | S6-T5 | P3 |
| 08 | Footer sources and not legal advice | NOTE-4 | S6 | S6-T5 | P3 |
| 08 | Quality bar (sourced numbers, no 5.1 GHz) | NOTE-5, §11.2 | S6 | S6-T7, S6-T8 | P3 |
| Every page | Bottom tabs | SHELL-1 | S0 | S0-T8 | P1 |
| Every page | Loading, empty, error; button feedback | SHELL-2 + each screen's states | S0 + each slice | S0-T8, and the loading/error task in each UI slice | P1 (P3 for S6/S7 pages) |
| Every page | `/d/sample`, Sample data on every page, direct entry from home | SHELL-3, D1 | S0, S0b, S1 | S0-T7, S0-T8, S0b-T4, S1-T2 | P1 |
