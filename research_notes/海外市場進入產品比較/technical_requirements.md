# Technical requirements and best practices for a trustworthy AI market-intelligence / stakeholder-mapping product for defence-tech startups (Portolan)

Research date: 2026-11-04. All items dated where the source gives a date. "Inference" sections are my reasoning, not sourced fact.

## 1. Grounding and citation quality: state of the art, how products show sources, measured error rates

### Takeaway
Measured citation error rates in commercial generative search are high. About half of sentences are not fully supported, and 25–60%+ of citations or attributions are wrong. Current best practice is claim-level (atomic-fact) verification against the cited passage with an NLI or small fact-check model, combined with UI that jumps to the exact cited sentence. Portolan's verbatim-quote check is stronger than what most products do, but it only covers precision ("the quote exists"). It does not check support ("the quote entails the claim") or recall ("every claim has a quote").

### Cited Findings
**Measured error rates**
- Liu, Zhang and Liang audited Bing Chat, NeevaAI, perplexity.ai and YouChat (EMNLP Findings 2023). On average only 51.5% of generated sentences were fully supported by citations (citation recall), and only 74.5% of citations supported their sentence (citation precision). — [ACL Anthology](https://aclanthology.org/2023.findings-emnlp.467/)
- Per-engine results: perplexity.ai had recall 68.7 and precision 72.7. Bing Chat had recall 58.7 and precision 89.5. YouChat had recall 11.1 and precision 63.6. Fluency and perceived utility were high (about 4.5/5), and fluency was inversely related to citation quality. Queries were collected Feb–Mar 2023, and 34 annotators used the AIS standard. — [Formative Digital summary of Liu et al.](https://formativedigital.com/research/ai-citation-accuracy-study/); [Axios](https://www.axios.com/2023/05/03/chat-based-search-citations-accuracy-research)
- Liu et al. released a dataset of about 11k verifiability judgments (complete, partial or no support, plus annotator-selected evidence sentences). It can be used to train or calibrate a support classifier. — [GitHub](https://github.com/nelson-liu/evaluating-verifiability-in-generative-search-engines)
- Tow Center / CJR (March 2025) ran 1,600 queries across 8 AI search tools. The tools gave incorrect answers about source identification (headline, publisher, date, URL) for more than 60% of queries. Perplexity was wrong 37% of the time, ChatGPT Search 67% (134/200), and Grok 3 94%. Tools rarely hedged. They fabricated or broke URLs: 154 of Grok 3's 200 citations led to error pages. They also cited syndicated copies instead of the original. — [CJR](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php); [Ars Technica](https://arstechnica.com/ai/2025/03/ai-search-engines-give-incorrect-answers-at-an-alarming-60-rate-study-says/); [dataset/GitHub](https://github.com/TowCenter/genSearch-Part2)
- FActScore (EMNLP 2023): on biographies, InstructGPT, ChatGPT and retrieval-augmented PerplexityAI scored 42%, 58% and 71% of atomic facts supported. ChatGPT dropped from 80% to 16% as entity rarity increased. About 40% of ChatGPT sentences mixed supported and unsupported facts. — [FActScore paper](https://doi.org/10.18653/v1/2023.emnlp-main.741)
- ALCE (Gao et al. 2023): on ELI5, even the best models lacked complete citation support 50% of the time. — [ALCE arXiv](https://ar5iv.labs.arxiv.org/html/2305.14627v2)

**Verification methods (state of the art)**
- AIS framework (Rashkin et al.): a statement is attributable only if a generic reader shown the cited source would agree that the source says it. ALCE implements this with an NLI model (TRUE). Citation recall means the concatenated cited passages entail the statement. Citation precision flags citations that are irrelevant. — [ALCE](https://ar5iv.labs.arxiv.org/html/2305.14627v2)
- FActScore splits text into atomic facts and labels each one against a chosen knowledge source. Its automated estimator approximates human FActScore with under 2% error, and it is available via `pip install factscore`. — [FActScore](https://arxiv.org/html/2305.14251v2); [PyPI](https://pypi.org/project/factscore/)
- MiniCheck (EMNLP 2024) is a small fact-checking model that reaches GPT-4-level accuracy on grounding at roughly 400x lower cost. MiniCheck-FT5 (770M parameters) matches GPT-4 on the LLM-AggreFact benchmark, which aggregates 11 datasets. It is sentence-level, so multi-sentence claims should be split first. — [ACL Anthology](https://aclanthology.org/2024.emnlp-main.499/); [GitHub](https://github.com/Liyan06/MiniCheck/)
- Parallel's Basis returns a FieldBasis for each output field and each list element (e.g. `key_executives.0`). Each FieldBasis holds `citations[{url, excerpts}]`, `reasoning`, and `confidence` (high/medium/low). The legacy `parallel-beta: field-basis-2025-11-25` header should be removed as of 2026-08-24, because per-element basis is now the default. — [Parallel Research Basis docs](https://docs.parallel.ai/task-api/guides/access-research-basis)
- Parallel markets Basis confidence as "calibrated". — [parallel.ai](https://parallel.ai/). I found no independent calibration study.

**How production products show and verify sources**
- AlphaSense and Elicit show the exact source location of each citation inline in deep-research output, so users do not have to leave the report. — [AlphaSense blog, 2025-07](https://www.alpha-sense.com/resources/research-articles/deep-research-tools-2025/)
- AlphaSense returns citations over its API as Markdown `[[N • Source Name]]` markers. Its homepage claim of "no hallucinations" should be treated as marketing. — [stockmarketstack review](https://stockmarketstack.com/tools/alphasense) (secondary source)
- Hebbia claims sentence-level citations on every answer, including in its Matrix grid ("each figure traces to the line it came from"), and holds SOC 2 Type 2, ISO 27001 and ISO 42001. — [Hebbia, 2026-11-02](https://www.hebbia.com/resources/alphasense-competitors) (vendor marketing)
- Users report that deep-research tools still sometimes give outdated or incorrect information even when they cite sources. — [AlphaSense blog](https://www.alpha-sense.com/resources/research-articles/deep-research-tools-2025/)

### Inferences
- Portolan's current check (quote appears verbatim in the stored excerpt) guards against fabricated quotes. It does not guard against (a) a quote that exists but does not entail the claim (an AIS precision failure), (b) uncited sentences (a recall failure), or (c) a Parallel excerpt that does not match the live page. Suggested layered pipeline:
  1. Decompose each generated stakeholder card or score rationale into atomic claims (FActScore-style).
  2. Require every claim to carry ≥1 source id. Uncited claims get blocked or marked 未驗證.
  3. Run a support check per (claim, excerpt). Cheap options are MiniCheck (self-hosted, needs a Python service or Modal/Replicate, since this is a Next.js app) or a second Claude call as judge with a strict 3-way label (supported / partial / not supported) matching Liu et al.'s labels.
  4. Optionally re-fetch the URL (e.g. Parallel Extract) and confirm the excerpt still exists. This catches dead links (the Tow Center failure mode) and syndicated copies.
- Calibrate the LLM-as-judge on 100–200 hand-labelled (claim, excerpt) pairs from Portolan's own dossiers, and/or the Liu et al. test split, before trusting it.
- UI pattern to copy (Elicit/AlphaSense): clicking a citation shows the highlighted excerpt in place, with URL, publisher, publication date and checked date. Show "partial support" visibly rather than hiding it.

### Gaps
- No published citation-accuracy numbers for Elicit, Consensus, Hebbia or AlphaSense from independent audits. Only vendor claims were found.
- I did not find a 2026 replication of the Liu et al. precision/recall audit on current engines.
- I found no source on how reliable LLM-as-judge is for attribution specifically (e.g. AttributionBench numbers). This was not retrieved in this session.
- I found no independent evaluation of Parallel Basis confidence calibration.

## 2. Data freshness and dates: publication-date extraction, stale facts, change monitoring

### Takeaway
Storing the run date as "checked date" is not enough. Portolan should store `published_at` (extracted), `modified_at` and `retrieved_at` separately. Open-source date extraction (htmldate) reaches about 0.90 accuracy. Parallel Monitor can push webhook events with Basis citations when tracked facts change, which also removes some of the polling.

### Cited Findings
- htmldate finds original and updated publication dates using header meta and Open Graph tags, `<time>`/`abbr` elements, then text heuristics. Benchmark on 1,000 pages (as of 2026-06-01): htmldate[all] 1.10 extensive mode had precision 0.908, recall 0.993, accuracy 0.903 and F1 0.949. Fast mode had accuracy 0.861. newspaper4k had accuracy 0.680 and goose3 0.545. — [htmldate GitHub](https://github.com/adbar/htmldate/)
- Date extraction "is not a completely solved task"; extractors rely on heuristics. The original benchmark set includes some Chinese pages. — [Barbaresi blog](https://adrien.barbaresi.eu/blog/evaluation-date-extraction-python.html); [JOSS paper](https://joss.theoj.org/papers/10.21105/joss.02439.pdf)
- htmldate is GPL-3.0 and Python. Text-based refinements support German, English and Turkish only. — [JOSS paper](https://joss.theoj.org/papers/10.21105/joss.02439.pdf)
- The Tow Center study explicitly scored whether AI tools retrieved the correct publication date, and most tools often failed. — [TowCenter GitHub](https://github.com/TowCenter/genSearch-Part2)
- Parallel Monitor API: `POST /v1/monitors` with `type` (`event_stream` or `snapshot`), `frequency` (`1h`/`1d`/`1w`), processor (`lite` default, `base` for more recall), and a webhook with events `monitor.event.detected`, `monitor.execution.completed` and `monitor.execution.failed`. Webhooks are HMAC-signed and have a retry policy. — [Monitor webhooks](https://docs.parallel.ai/monitor-api/monitor-webhooks)
- Snapshot monitors return `changed_output` (only changed fields, each with basis) plus `previous_output`. Every event carries `basis` (citations, reasoning, confidence) and an `event_date`, and `event_id` can be used for deduplication. — [Monitor events](https://docs.parallel.ai/monitor-api/monitor-events)
- Monitor tracks only new updates from creation time ("Don't use for historical research"). Unused monitors should be cancelled to save cost. — [Monitor quickstart](https://docs.parallel.ai/monitor-api/monitor-quickstart)
- A monitor event can feed a follow-up Task run by passing `event_id` as `previous_interaction_id`, which preserves provenance. Task runs can use a webhook instead of polling `GET /v1/tasks/runs/{run_id}`. — [Follow-up tasks](https://docs.parallel.ai/monitor-api/monitor-task)
- Structured sources expose their own change timestamps. Examples: SAM Opportunities (active notices updated daily, archived weekly); Contract Awards API `publicDeltaDate` (last-modified/reveal date); the GCIS company API `Change_Of_Approval_Data` (最後核准異動日) and filter by change date; Legislative Yuan datasets updated daily. — [SAM Opportunities](https://open.gsa.gov/api/get-opportunities-public-api/); [Contract Awards API](https://open.gsa.gov/api/contract-awards/); [GCIS 開發指引](https://data.gcis.nat.gov.tw/od/rule); [LY dataset](https://data.ly.gov.tw/getds.action?id=6)

### Inferences
- Schema change: on each source, add `published_at` (nullable, plus a `published_at_method` field: meta / htmldate / LLM / unknown), `retrieved_at` (the current "checked date"), and `last_verified_at` (when a re-check confirmed the excerpt still exists).
- Show "Published 2024-03 · checked 2026-11-03" and decay confidence for facts older than N months. Person-role facts need a shorter half-life than organisation facts.
- Because htmldate is Python and GPL, a TypeScript stack could use meta-tag parsing (`article:published_time`, JSON-LD `datePublished`, `<time>`) as the first pass. Then ask Claude to extract a date only from the stored page text, with "unknown" allowed. Or run htmldate as a separate service, and keep the GPL implications in mind if it is distributed.
- For stale people facts (officials changing roles), create one Parallel `snapshot` monitor per high-priority stakeholder, with fields such as `current_title` and `current_org`, at `1w` frequency. Changed fields come back with basis. Enable this only for tracked or shortlisted stakeholders to control cost. This needs the founder's cost approval under CLAUDE.md.
- Replace polling with Parallel Task webhooks. Verify the HMAC and deduplicate on run_id/event_id. Vercel functions can receive these.

### Gaps
- I found no accuracy figures for date extraction specifically on Taiwanese government (gov.tw) or Chinese-language pages.
- I did not retrieve pricing for Parallel Monitor. Check the Parallel pricing page before estimating cost.
- Other web-change-monitoring APIs (e.g. Diffbot, Visualping, changedetection.io) were not researched in this session.

## 3. Structured official data to complement web search

### Takeaway
US federal data is free, well-documented and has stable IDs (UEI, PIID). The main constraints are SAM.gov's very low default API quotas (10 requests/day for a personal non-federal key with no role) and a 90-day delay before DoD contract data is public. FPDS has been absorbed into SAM.gov. Its ATOM feed was due to be decommissioned on 2026-10-31. Taiwan data is open under the 政府資料開放授權條款 (attribution required). The procurement (PCC) open datasets are partial, and full tender data is mostly obtained by scraping or third-party mirrors. The company registry (GCIS) API requires registering your IP on a whitelist. Legislative Yuan data has an official API plus a richer community API (LYAPI v2).

### Cited Findings
**SAM.gov Get Opportunities API**
- Endpoint `https://api.sam.gov/opportunities/v2/search`. It requires an `api_key` (generated on the SAM.gov Account Details page). `postedFrom`/`postedTo` are mandatory and the window is at most 1 year. Maximum `limit` is 1000 per page. Filters include ptype (solicitation, sources sought, award notice…), NAICS, set-aside, organization and response deadline. The API returns only the latest active version. — [open.gsa.gov](https://open.gsa.gov/api/get-opportunities-public-api/)
- Daily limits depend on role and the docs page does not give numbers. Secondary sources cite the Entity Management docs and FSD KB0017604: 10/day for a non-federal personal key with no SAM role, 1,000/day for a non-federal key with an entity role or a non-federal system account, and 10,000/day for a federal system account. Quota resets at midnight UTC and exceeding it returns 429. The key goes in the URL query string, so request logs must be scrubbed. — [Boring Data Platform, checked 2026-11-02](https://www.boringdataplatform.com/guides/sam-gov-api-rate-limits); [govconapi](https://govconapi.com/sam-gov-rate-limits-reality) (secondary; verify against open.gsa.gov Entity API page)

**SAM.gov Contract Awards API (replaces FPDS)**
- All public FPDS functionality has moved to SAM.gov. ezSearch was decommissioned on 2026-02-24. The ATOM feed is being replaced by the SAM.gov Contract Awards API (JSON/CSV, includes deleted contracts). Viewing results requires a SAM.gov account, but no role. — [sam.gov/fpds](https://sam.gov/fpds); [SAM announcement](https://sam.gov/announcements/fpdsgov-decommissions-february-24-2026-0)
- The DoW (DoD) says the FPDS ATOM feed "will be decommissioned … on October 31, 2026" and asked consumers to move by 2026-10-16. — [OUSD A&S DPC](https://www.acq.osd.mil/asda/dpc/ce/cap/fpds.html)
- Contract Awards API details: `https://api.sam.gov/contract-awards/v1/search`. It returns 10 records per page by default (max 100) and only the first 400,000 records. An async extract (JSON/CSV) goes up to 1,000,000 records. Revealed (public) data excludes DoD contracts signed less than 90 days ago, and also excludes immediate and domestic parent UEI. Unrevealed data is DoD-only. Filters include dateSigned, dollarsObligated, awardee name, NAICS/PSC and others. — [open.gsa.gov Contract Awards](https://open.gsa.gov/api/contract-awards/); [FPDS vs SAM mapping PDF](https://open.gsa.gov/api/contract-awards/v1/FPDSvsSAM-ContractDataAPI.pdf)

**USAspending API**
- No authorization is required. The API is v2 (v1 deprecated). Key endpoints are `POST /api/v2/search/spending_by_award/`, recipient endpoints by UEI, subawards, transactions, and spending by category (agency, NAICS, PSC, recipient). — [USAspending API endpoints](https://api.usaspending.gov/docs/endpoints)
- Practical notes: `fields` takes display names ("Award ID", "Recipient Name"). Contracts use award_type_codes A–D. Pagination uses `page_metadata.hasNext` with no total count. No documented rate limit, so be polite and back off on 429. — [apicoding.com, 2026-09-21](https://apicoding.com/querying-usaspending-for-federal-contract-awards-with-a-post-search-and-no-api-key/); [conorscode reference](https://conorscode.github.io/usaspending-api-reference/) (secondary)

**Taiwan Government e-Procurement (政府電子採購網, PCC)**
- Official open datasets on data.gov.tw are limited:
  - 決標金額前5大之決標公告: daily, JSON, free, 政府資料開放授權條款-第1版. — [data.gov.tw/dataset/6155](https://data.gov.tw/dataset/6155)
  - 前1年度公告金額以上採購限制性決標公告: yearly. — [data.gov.tw/dataset/165150](https://data.gov.tw/dataset/165150)
  - 近半年GPA決標資料集: monthly, with winning and losing bidder lists. — [data.gov.tw/dataset/172023](https://data.gov.tw/dataset/172023)
  - All are published by 行政院公共工程委員會.
- A citizen suggestion asked for an API covering all 招標/決標/無法決標/撤銷公告. Its status shows "已回復" with no indication of a full API. The suggestion notes that existing third-party services likely scrape web.pcc.gov.tw. — [data.gov.tw/suggests/88841](https://data.gov.tw/suggests/88841)
- Third-party mirrors exist. 台灣標案網 (twbuying.org) offers a keyless, CORS-enabled API with tender and award search (≤200 rows per call, CSV) and OCDS 1.1 output. It says the original PCC notice is authoritative. — [twbuying.org/api](https://twbuying.org/api). OpenDataTW mirrors historic award data (fields include 機關, 案號, 得標/未得標廠商, 決標日期). — [opendatatw.org](https://opendatatw.org/dataset/900002)

**Taiwan Legislative Yuan**
- The official platform data.ly.gov.tw offers per-dataset APIs (json/xml/csv). Datasets include 質詢事項 (from term 10), 行政院答復 (more than 1M rows), 委員會審議之議案, 委員發言片段影片, and 遊說登記 (lobbying registrations: lobbyists, lobbied officials, purpose). Updates are daily, the license is the open-data license, and access is free. — [data.ly.gov.tw id=6](https://data.ly.gov.tw/getds.action?id=6); [ID999 catalogue](https://data.ly.gov.tw/ID999Action.action); [id=46](https://data.ly.gov.tw/getds.action?id=46)
- LYAPI (ly.govapi.tw/v2) is a community project. It aggregates LY databases, converts PDF and Word documents to machine-readable form, and has a Swagger UI. The legacy `ly.govapi.tw` is moving to `v2.ly.govapi.tw`. — [LYAPI v2](https://ly.govapi.tw/v2/); [legisTaiwan R package docs](https://davidycliao.github.io/legisTaiwan/articles/quickstart.html)

**Taiwan company registry (商工登記)**
- The 商工行政資料開放平臺 (data.gcis.nat.gov.tw) has 508 datasets and 60 APIs. Access is by bulk CSV download or system API. API use requires submitting a 使用告知書 by email and having your **external IP whitelisted**. Usage is limited by total connections, concurrent connections and daily calls. Parameters are `$format` (json/xml), `$filter`, `$skip` (≤500,000) and `$top` (≤1000). — [GCIS 開發指引](https://data.gcis.nat.gov.tw/od/rule)
- 公司登記基本資料-應用一 (about 1.62M records) returns 統編, name, status, capital, 負責人, address, setup date and last change date. The license is 政府資料開放授權條款-第1版, and the mandatory 顯名聲明 (attribution) must be shown or the license is void from the start. — [GCIS dataset](https://data.gcis.nat.gov.tw/od/detail?oid=8776818F-EB3C-445F-BE95-AE22577CBEBC)
- A 董監事 (directors and supervisors) API exists by 統編. — [sdwh.dev example](https://sdwh.dev/posts/2023/08/API-Resources/) (secondary). The findbiz.nat.gov.tw web UI supports searching by director or manager, by 章程所訂外文公司名稱 (registered English name), and by former names. — [findbiz](https://findbiz.nat.gov.tw/)

### Inferences
- These sources fit Portolan's 來源 model directly. Each record has a canonical URL and a stable ID (notice ID, PIID, UEI, 統編, 標案案號), so "source = official record" can earn a higher Admiralty reliability grade (e.g. A) than web pages.
- SAM's 10/day quota is unusable for live user queries. Options: (a) register Portolan as an entity in SAM.gov to get 1,000/day; (b) nightly cache or bulk download (SAM Data Services extracts) into Supabase; or (c) use USAspending (no key) for award history and SAM only for open opportunities.
- Because of the 90-day DoD reveal lag, recent DoD awards will be missing. Label this in the UI ("DoD awards <90 days not public").
- For Taiwan tenders, MND and 國防部 procurement may be partly in PCC. Defence-sensitive tenders may not be published at all; this is unverified. Third-party mirrors should be cited as "via mirror; original PCC notice URL" and spot-checked against the PCC page.
- The GCIS IP-whitelist requirement conflicts with Vercel serverless, where egress IPs change. You would need a static-egress proxy, Vercel Secure Compute, or a scheduled bulk CSV import instead.
- Legislative Yuan interpellation and 遊說登記 data give sourced evidence of a legislator's *stance* on drones/defence procurement. This could reduce the "unknown stance" share for Taiwanese political stakeholders.

### Gaps
- I did not confirm the official SAM Entity Management API public versus FOUO field split, or its exact numeric limits from open.gsa.gov directly. The figures above come from secondary sources.
- I did not confirm whether the 政府資料開放授權條款 explicitly allows commercial reuse. It is widely understood to, but read http://data.gov.tw/license.
- I did not confirm PCC's terms on scraping web.pcc.gov.tw, or whether pcc.g0v.ronny.tw (a well-known g0v mirror) is still maintained.
- I did not research whether the GCIS API returns English names. The basic API fields listed do not include one.

## 4. Entity resolution / knowledge graph across English and Chinese names

### Takeaway
Name similarity alone is the weakest signal. Production ER combines strong identifiers (LEI, UEI, 統編, CAGE, Wikidata QID) with probabilistic or rule-based scoring on several attributes, and keeps a persistent "judgement" graph of human merge and no-merge decisions. OpenSanctions/nomenklatura is the most relevant open-source reference for cross-script matching and human-in-the-loop dedupe.

### Cited Findings
- Splink (MIT, UK Ministry of Justice) does probabilistic record linkage using Fellegi–Sunter with term-frequency adjustments. It runs on DuckDB or Spark, links about 1M records on a laptop in about a minute, and needs no training data. It works best with several uncorrelated columns and "is not designed for linking a single column containing a 'bag of words'… a single 'company name' column". — [Splink GitHub](https://github.com/moj-analytical-services/splink/)
- nomenklatura (OpenSanctions) dedupes Follow-the-Money entities. It uses a blocking index, then candidate scoring, then a SQL-persisted **Resolver graph** of judgements (same / not same / undecided) with transitive inference. It includes a text UI for human merge decisions. — [nomenklatura GitHub](https://github.com/opensanctions/nomenklatura/)
- The OpenSanctions `logic-v2` matcher uses "cultural reference data for precise and explainable cross-language and cross-script matching". Identifier matches carry heavy weight: LEI 0.95, UEI 0.95, generic registration/tax ID 0.85. Mismatches subtract (country −0.20, DOB −0.15/−0.25). The training data and code are public. — [OpenSanctions matcher](https://www.opensanctions.org/matcher/)
- OpenSanctions enriches entities from GLEIF, OpenCorporates, PermID, OpenFIGI and Wikidata (persons only for roles and relations). Its API has `/match`, `/search` and an OpenRefine reconciliation endpoint. It deliberately does not link companies to Wikidata because "an encyclopedia['s] … legal entities is not granular enough for due diligence". — [OpenSanctions enrichment](https://www.opensanctions.org/docs/enrichment/); [Wikidata dataset](https://www.opensanctions.org/datasets/wikidata/)
- The GLEIF API offers full-text and "fuzzy" name and address matching, parent/child ownership, and mapped identifiers (BIC, ISIN). It has been in production since fall 2020, and the data is a free daily Golden Copy. — [GLEIF API](https://www.gleif.org/en/lei-data/gleif-api/); [OpenSanctions GLEIF dataset](https://www.opensanctions.org/datasets/ext_gleif/)
- Taiwan's findbiz supports searching by registered foreign-language company name and by former names and 統編. This gives an official English↔Chinese bridge for registered companies. — [findbiz](https://findbiz.nat.gov.tw/)

### Inferences
- Recommended design for Portolan refresh matching, in order:
  1. Match on a hard identifier when one exists (統編, UEI/CAGE, LEI, Wikidata QID, official profile URL on a .gov.tw or .mil domain).
  2. Otherwise score a pair with several features: normalised name in both scripts (zh-Hant, plus pinyin/Wade-Giles romanisation, plus the English alias), org type, country, parent org, and role or title for people.
  3. Auto-merge above a high threshold, send the middle band to a human queue, and record each decision in a `entity_judgements` table (A=B / A≠B) so it persists across refreshes. This is the nomenklatura pattern.
- For people, especially officials, store a role as a time-bounded edge (person –holds→ position @ org, from/to, source). Do not store it as a person attribute. Then "official changed roles" becomes a new edge rather than a mismatched entity.
- Splink is likely overkill at Portolan's scale (tens to hundreds of entities per dossier). A rule-based matcher in TypeScript plus a judgement table is probably enough. Calling the OpenSanctions `/match` API is an option (check licensing; commercial use is paid).
- China rule: organisation-level only, so person ER should be disabled for CN-jurisdiction entities.

### Gaps
- I did not retrieve OpenCorporates API terms or pricing, or OpenSanctions commercial licence costs.
- I did not find an evaluated benchmark for Traditional-Chinese↔English organisation name matching.
- I did not research Wikidata coverage of Taiwanese officials or MND units.

## 5. Human-in-the-loop expert review workflows

### Takeaway
Expert networks wrap expert content in compliance gates: vetting, AI-flagging, holds pending approval, redaction with an audit trail, and retention settings. They keep traceability from synthesis back to the verbatim expert statement. The transferable pattern for Portolan's manual 專家審稿 is a review state machine with per-claim annotations and an audit trail. It is not a free-text comment box.

### Cited Findings
- GLG transcript compliance features: AI reviews every transcript and flags concerns in categories the firm chooses; compliance can redact with a full audit trail; "transcript holds" require approval before users see content; summary-only access; download controls; configurable retention; AI feature toggles. Client transcripts are never used for training. — [GLG Transcript Compliance](https://glg.com/how-we-help/transcript-compliance)
- GLG synthesis "maintain[s] traceability to original expert statements". The MCP connector lets users "trace every insight back to a source quote". AI-moderated calls open with a compliance disclaimer and redirect experts away from sensitive territory. — [GLG Transcript Compliance](https://glg.com/how-we-help/transcript-compliance); [GLG AI-moderated calls](https://glg.com/articles/enhancing-primary-research-with-ai-moderated-calls)
- AlphaSights: 100% of experts are background-checked before interaction. Vetting data is cross-referenced against its AlphaGraph knowledge graph. Platform content gets "multi-layered human review… every sentence", with flags escalated through multiple stages up to the General Counsel. It has 60+ legal and compliance staff. — [AlphaSights Compliance](https://www.alphasights.com/compliance/)
- The GLG Expert Content Feed delivers compliance-reviewed transcripts with 40+ metadata fields (tickers, dates, expert bios) in PDF/JSON. — [GLG Expert Content Feed](https://glg.com/how-we-help/expert-content/feed)
- GLG Frontier uses experts to author tasks and rubrics and to review model outputs for domain-specific failure modes. This is a model for using experts to *evaluate* AI output, not only to supply content. — [GLG Frontier](https://frontier.glg.com/)

### Inferences
- Portolan's 專家審稿 record could have these states: `requested → in_review → changes_suggested / approved → published`. Each change is a per-claim annotation: agree / disagree / adjust rank / add stance with expert-provided source / mark outdated. Store reviewer, timestamp and diff in an append-only log.
- Expert input without a URL source must be labelled distinctly, e.g. "Expert judgement (reviewed 2026-11-xx)" with an Admiralty grade such as B2. This keeps the "every claim has a source" rule intact.
- Expert rank adjustments double as labelled training and evaluation data for the ranking problem (Section 7).
- Annotation tooling such as Argilla or Label Studio was not researched. An in-app table plus a Supabase audit table is likely enough at pilot scale.

### Gaps
- I found nothing public on Tegus/AlphaSense internal transcript QA beyond "compliance reviewed".
- I did not retrieve Argilla or Label Studio feature or licensing docs this session.
- I found no published accuracy uplift from expert review of AI reports.

## 6. Security and compliance expectations for defence-tech customers

### Takeaway
For an MVP selling to drone/defence startups, the key rule is to stay out of scope. Do not let users upload ITAR technical data, CUI or export-controlled specs. If you hold CUI, CMMC/DFARS 7012 flow-downs apply, and so do FedRAMP-Moderate-equivalent cloud requirements. SOC 2 Type 1 is achievable in about 2–5 months for roughly $10–25k all-in and is the usual first attestation. Both Anthropic and Parallel offer ZDR on request, with caveats. "Link = key" sharing must at least meet capability-URL hygiene: ≥128-bit, revocable, expiring, no-referrer, plus an audit log.

### Cited Findings
**ITAR / EAR / CUI**
- 22 CFR 120.54(a)(5): sending, taking or storing technical data is *not* an export if it is unclassified, secured with end-to-end encryption, uses FIPS 140-2 (or successor) modules or at least AES-128-equivalent strength, and is not intentionally sent to or stored in a §126.1 proscribed country. End-to-end means the means of decryption are not provided to any third party, which includes the cloud provider. — [eCFR 22 CFR 120.54](https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-120/subpart-C/section-120.54)
- The carve-out covers only the encrypted blob. Decrypting where an unauthorised foreign person can see it is an export, and giving decryption keys to a foreign person is a release. — [Visioneer IT, 2026-09](https://www.visioneerit.com/blog/itar-cmmc-compliance-defense-contractor) (secondary)
- Cloud or external service providers handling CUI must be FedRAMP Moderate authorised or demonstrate equivalency. It is the contractor's duty to verify this. — [Unanet CMMC guide, updated 2026-09](https://unanet.com/guide-to-cmmc)

**CMMC**
- The final DFARS CMMC rule was published 2025-09-10 and took effect 2025-11-10 (clauses 252.204-7021/-7025; the program rule is 32 CFR 170). — [DoD Office of Small Business Programs](https://business.defense.gov/Programs/Cyber-Security-Resources/CMMC-20/)
- Original phases: Phase 1 from 2025-11-10 (Level 1/2 self-assessment); Phase 2 from 2026-11-10 (Level 2 C3PAO certification); Phase 3 from 2027-11-10 (Level 3); Phase 4 full rollout from 2028-11-10. The Level 2 minimum score is 88/110 with POA&M close-out in ≤180 days. — [DoW CIO CMMC 101, Nov 2025](https://dowcio.war.gov/Portals/0/Documents/CMMC/CMMC-101-Nov2025.pdf)
- **Conflicting/updated:** two secondary sources say that on 2026-07-13 the Department suspended the Phase 2 transition and put later milestones on hold pending review, while Phase 1 self-assessments and DFARS 252.204-7012 obligations remain. — [Unanet](https://unanet.com/guide-to-cmmc); [Visioneer IT](https://www.visioneerit.com/blog/itar-cmmc-compliance-defense-contractor). I did not verify this against a primary DoW notice. Treat it as uncertain.
- CMMC applies to contractors and subcontractors that process, store or transmit FCI or CUI on their systems. It excludes COTS-only procurements. — [DoW CIO CMMC 101](https://dowcio.war.gov/Portals/0/Documents/CMMC/CMMC-101-Nov2025.pdf)

**SOC 2**
- Drata (2026-03): Type 1 takes 3–6 months in total and costs $7.5k–$60k. Type 2 takes 6–15 months (including a 3–12 month observation period) and costs $12k–$100k. — [Drata](https://drata.com/learn/soc-2/type-1-vs-type-2)
- Vanta: first-year startup cost starts around $20k all-in. Type 1 takes 3–5 months from a standing start, or 10–12 weeks if controls already exist. Type 2 needs a minimum 3-month observation window. — [Vanta](https://www.vanta.com/collection/soc-2/soc-2-for-startups)
- Seed-stage benchmark: platform $7–15k/yr, Type 1 auditor $8–15k, pentest $5–12k, 80–120 hours of internal time. Many buyers accept "Type 1 done, Type 2 window in progress". — [Causo Hub, 2026-06](https://hub.causo.ai/guides/soc2-for-seed-startups-enterprise-deals-2026). Secureframe is the only one of the three with a published price ($7.5k/yr). — [justinmckelvey.com, 2026-11-03](https://justinmckelvey.com/blog/vanta-vs-drata)
- Before you have a report, send a security packet: data flow and subprocessors, the AI provider's data terms, controls with evidence, and the planned auditor and month. — [Oktopeak, 2026-02](https://oktopeak.com/blog/soc2-compliance-early-stage-saas/)

**LLM / research provider data retention**
- Anthropic API: inputs and outputs are deleted within 30 days by default, with exceptions for longer-retention features (Files API), agreed ZDR, Usage Policy enforcement (flagged content up to 2 years, classifier scores up to 7 years) and legal requirements. — [Anthropic Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- Anthropic ZDR is available on request via sales and enabled per organisation. It covers Messages and Token Counting for eligible features. It does not cover the Console/playground, Batch API, Files API, Managed Agents, or **Covered Models** (Claude Fable 5/5.1, Mythos 5/5.1), which require 30-day retention. ZDR organisations cannot call the API from a browser (CORS rejected). — [Anthropic API and data retention docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention); [Help Center](https://support.claude.com/en/articles/16824617-turn-on-data-retention-for-a-workspace-in-a-zero-data-retention-organization)
- Even under ZDR, Anthropic keeps User Safety classifier results. — [Anthropic Privacy Center ZDR article](https://privacy.claude.com/en/articles/8956058-i-have-a-zero-data-retention-agreement-with-anthropic-what-products-does-it-apply-to)
- Parallel is SOC 2 Type 1 and Type II (since April 2025). Data is encrypted and stored in US data centres. **Under the standard Customer Terms, Parallel may use de-identified inputs and outputs to train models**. Enterprise plans with ZDR exclude this, as does the EU Search endpoint. Private-cloud and on-prem deployments are available for enterprise customers. Monthly spend limits are notify-only and never block requests. — [Parallel FAQ](https://docs.parallel.ai/resources/faqs)
- Parallel EU data residency (2026-10-14) applies to Search and Extract only (not Task), runs ZDR by default, and requires an enterprise agreement. Billing, metrics and logs are processed in the US. — [Parallel blog](https://parallel.ai/blog/eu-data-residency). The trust centre and subprocessor list are at [trust.parallel.ai](https://trust.parallel.ai/).

**Share-link access control**
- OWASP token guidance: generate with a CSPRNG, make tokens long enough to resist brute force, store them securely (hashed), make them single-use, expire them, send `Referrer-Policy: no-referrer`, rate-limit to prevent brute forcing, and never build URLs from the Host header. — [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- Magic-link best practice: store a hash or verifier rather than the raw token, consume atomically (conditional UPDATE), keep links out of analytics, logs, referrers and third-party scanners, and note that email prefetchers may "click" links. — [emailbump](https://emailbump.com/blog/magic-link-email-authentication); [dev.to capability boundary](https://dev.to/kevindev27/verification-tokens-need-a-capability-boundary-52fp) (secondary blogs restating OWASP)

### Inferences
- **What Portolan must avoid storing:** customer product technical data (drawings, performance specs, source code, test data for ITAR/EAR-controlled UAS items), any CUI or FCI from DoD contracts, and MNPI. Put an upload and intake warning in the 文件 (Docs) and 會後回報 (debrief) features: "Do not upload export-controlled technical data or CUI". Also scan uploads for markings such as "CUI", "ITAR", "EAR99/ECCN" and "Distribution Statement" and block them. Staying out of CUI scope avoids the FedRAMP-equivalency and CMMC questions for Portolan itself.
- Even public-source market intelligence on Taiwan defence stakeholders is sensitive to customers. Expect questionnaire questions on data residency (US vs AU vs TW), subprocessors (Anthropic, Parallel, Supabase, Vercel, PostHog) and AI training. Parallel's default "may train on inputs" term is a likely objection. Seek ZDR (or contractual exclusion) before selling to defence customers, and avoid sending customer-confidential context (e.g. the founder's own product details) to Parallel inputs.
- If Portolan uses a Claude Covered Model, ZDR is unavailable for that traffic. Pick a non-covered model for ZDR workspaces. (Check which model Portolan calls.)
- Share links: the current "link = key" with a ≥128-bit id is acceptable for an MVP only if links are (a) revocable and rotatable by the owner, (b) optionally expiring, (c) served with `Referrer-Policy: no-referrer` and `noindex`, (d) kept out of PostHog and URL logs (PostHog autocapture records `$current_url`, so strip it), and (e) recorded in an access log (timestamp, coarse IP or UA hash, action). Next step: separate the *edit* capability from the *view* capability (two tokens), then email-verified magic-link login, then SSO (SAML) for larger customers.
- Unverified email: send a verification link before attaching quotas or sharing to an email. Otherwise the per-email research cap can be bypassed and links can be sent to the wrong person.
- Audit log: use an append-only Supabase table (actor, dossier_id, action, target, before/after hash, ts). RLS should deny all anon access, consistent with the existing rule.

### Gaps
- The CMMC Phase 2 suspension (2026-07-13) is confirmed only by secondary sources. Check the Federal Register or a DoW CIO notice.
- I did not retrieve BIS (EAR §734.18(a)(5)) cloud-encryption text or DDTC cloud FAQs directly. ITAR is cited from eCFR.
- I did not research Taiwan-side rules (e.g. 個人資料保護法 for storing personal data on Taiwanese officials, or 國家機密保護法).
- I did not research Supabase or Vercel region options or their own SOC 2 status this session.
- I found no source on whether Parallel ZDR applies to the Task and Monitor APIs specifically. The FAQ says ZDR is on "Enterprise plans" generally.

## 7. Evaluation: ranking quality vs expert judgement

### Takeaway
With Spearman 0.34–0.43 measured on small lists, the confidence interval is very wide. Roughly 150 ranked items are needed for a ±0.15 CI at ρ≈0.3, so the current result can't distinguish "weak" from "moderate". Use NDCG@k with graded expert relevance for top-of-list quality, Kendall τ for pairwise agreement, and measure expert–expert agreement as the ceiling.

### Cited Findings
- Sample size for a 95% CI of width 0.3 on Spearman: 149 items at ρ=0.3 and 16 at ρ=0.9. For width 0.1: 1,331 at ρ=0.3. Kendall τ-b needs fewer items (65 at τ=0.3 for width 0.3). A minimum of about 149 is "usually adequate" to establish at least moderate correlation. — [PMC11148401](https://pmc.ncbi.nlm.nih.gov/articles/PMC11148401/)
- Bonett & Wright give improved standard errors and a two-stage sample-size approximation for Pearson, Kendall and Spearman CIs. — [Psychometrika](https://www.cambridge.org/core/journals/psychometrika/article/abs/sample-size-requirements-for-estimating-pearson-kendall-and-spearman-correlations/840CA9F25E521DBD1C389D48638CE2F1); PASS procedure example: [NCSS](https://www.ncss.com/wp-content/themes/ncss/pdf/Procedures/PASS/Confidence_Intervals_for_Spearmans_Rank_Correlation.pdf)
- NDCG (Järvelin & Kekäläinen 2002) uses graded gains with a log position discount, so it rewards getting the most relevant items at the top. It has good discriminative power and handles multi-grade labels. Kendall τ is (concordant − discordant)/total pairs. — [Metrikov thesis, Northeastern](https://repository.library.northeastern.edu/files/neu:cj82kc012/fulltext.pdf)
- NDCG can be estimated from incomplete or sampled judgments with confidence intervals (infAP/stratified sampling), which cuts the cost of expert labels. — [Yilmaz, Kanoulas, Aslam, SIGIR 2008](https://dl.acm.org/doi/10.1145/1390334.1390437)

### Inferences
- Evaluation protocol for Portolan:
  1. For each dossier (market), have the expert or founder grade each stakeholder 0–3 ("must meet first" … "irrelevant") rather than giving a full rank. This is faster and supports NDCG.
  2. Report NDCG@5 and @10 (top of list is what matters for "who to meet first"), Kendall τ-b, and precision@5.
  3. Pool across dossiers. About 10 dossiers × 15–20 stakeholders gives 150–200 items, which reaches the ~149 threshold. Report bootstrap CIs by resampling dossiers, not items, because items within a dossier are correlated.
  4. Get a second expert on a subset to compute expert–expert agreement (Kendall's W or τ between experts). If experts agree at only about 0.5, then 0.4 is near the ceiling.
- Diagnose the disagreement: run an ablation per scoring factor (influence, relevance, accessibility, stance), correlating each factor alone with the expert grades. Half of stakeholders have unknown stance, so check whether stance=unknown is being imputed as neutral and distorting ranks.
- Expert adjustments collected via the review workflow (Section 5) become the growing evaluation set. Freeze a held-out set to avoid tuning to it.

### Gaps
- I found no published benchmark of AI stakeholder-ranking against expert consultants (no comparable domain dataset).
- I did not retrieve the TREC guidance on topic counts (commonly cited as 50 topics) this session, so it is uncited.
- I did not research Admiralty-grade (NATO AJP-2.1 source reliability / information credibility) standards or how to map automated signals to those grades.
