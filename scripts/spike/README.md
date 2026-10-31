# Parallel 試做（workflow 3-3）

不是 App 程式。結果和建議在 `docs/decisions/0001-research-engine.md`。

- `lib.mjs`：讀 `.env.local` 的 `PARALLEL_API_KEY`（不印出）、呼叫 API、預算保護（累計估計超過 US$10 就停）
- `case.mjs`：Taiwan UAS 案例和 Task 的 input/output schema
- `task-run.mjs <processor>`：做法 1，一次 Task run 回傳整張地圖
- `findall.mjs`：做法 2，FindAll（`ingest`、`run <query> <generator> <limit>`、`enrich`）
- `task-enrich.mjs <source> <processor>`：做法 C，每個實體各跑一個 Task 補資料
- `analyze.mjs`：把各做法整理成同一個格式，寫 `out/summary.json`
- `spotcheck.mjs <picks.json>`：直接抓原網頁，檢查摘錄原文在不在
- `refetch.mjs`：重新抓 FindAll 快照（免費）
- `out/`：原始輸出、log、`ledger.json`（每次呼叫前記下的估計費用）

執行：`node scripts/spike/task-run.mjs ultra`（要先有 `.env.local`）。
