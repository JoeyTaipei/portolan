# 0001 研究引擎：Parallel 怎麼用

- 狀態：建議（等創辦人選）
- 日期：2026-10-30
- 範圍：workflow 第 3-3 步，Parallel 試做
- 原始輸出和程式：`scripts/spike/`（`out/` 是每次執行的原始 JSON 和 log；`out/summary.json` 是比較表的原始數字）

## 結論（先看這段）

**建議做法 C：Task `ultra` 找名單 → 每個實體各跑一個 Task `core` 補資料。**
- 每份 dossier 預估 **US$1.25–1.50**（ultra $0.30 + 每個實體 $0.025 × 38–48 個），**約 12 分鐘**（ultra 約 8 分 + 補資料約 3 分，補資料是平行跑）。
- 試做結果：38 個實體，**38 個都有自己的來源網址 + 摘錄**（每個約 10 筆引用、共 215 個不同網址），**38 個具名負責人都有引用**；抓到範例 16 個可比對節點中的 10 個。
- 投資人和律師想要更多時，可以加做法 B 的 FindAll `investors`、`law` 兩個查詢（+ 約 US$1.50、平行跑不加時間）。這個可以等真的有使用者覺得網絡分頁太少再加。

## 測了什麼

同一個案例（和 `src/fixtures/taiwan-uas.ts`、01 表單一樣）：美國反無人機新創（名稱不公開）、產品 Counter-UAS sensor kit、市場 Taiwan、目標 12 個月內拿到第一個政府試辦案。程式見 `scripts/spike/case.mjs`。

| 代號 | 做法 | 程式 |
|---|---|---|
| Task pro | 一次 Task run 回傳整張地圖（利害關係人、投資人、律師、活動） | `task-run.mjs pro` |
| Task ultra | 同上，ultra | `task-run.mjs ultra` |
| FindAll | FindAll `base`，分 5 個查詢（政府、產業、投資人、律師、活動） | `findall.mjs run …` |
| FindAll + 補資料 | 上面 5 個 FindAll 加 Task `core` enrichment | `findall.mjs enrich …` |
| C：ultra + 補資料 | Task ultra 的名單，每個實體再跑一個 Task `core` | `task-enrich.mjs task-ultra core` |

先跑了一個 FindAll `preview`，用一個「所有相關機構」的大查詢：13 個候選只對中 1 個，而且都是隨機的 LinkedIn 公司頁。所以 FindAll 正式跑時改成每類一個窄查詢。

## 結果

「有來源」= 這個實體自己的 Basis 至少有一筆網址 + 摘錄（不是整份輸出共用的來源）。

| | Task pro | Task ultra | FindAll | FindAll + 補資料 | **C：ultra + 補資料** |
|---|---|---|---|---|---|
| 找到的實體 | 33 | 38 | 56 | 56 已補資料（另有 17 個多出來的配對） | **38** |
| 有自己的網址 + 摘錄 | 14（42%） | 34（89%） | 56（100%） | 56（100%） | **38（100%）** |
| 不同來源網址 | 9 | 32 | 116 | 326 | **215** |
| 投資人 / 律師 / 活動 | 6 / 2 / 1 | 6 / 3 / 4 | 10 / 8 / 8 | 8 / 8 / 8 | **6 / 3 / 4** |
| 具名負責人（有引用） | 0 | 6（4） | 0 | 54（53） | **38（38）** |
| 對到範例節點（16 個） | 10 | 10 | 10 | 8 | **10** |
| 牆鐘時間 | 3 分 23 秒 | 8 分 17 秒 | 6 分 54 秒（5 個平行） | + 2 分 49 秒 | **8 分 17 秒 + 3 分 13 秒** |
| 估計費用 | $0.10 | $0.30 | $2.93 | + $1.40（+ 可能 $0.51） | **$0.30 + $0.95** |

### 費用
- 試做總花費（估計，偏保守）：**US$6.29**，在 US$10 的預算內。帳戶約剩 US$13.66。
- 費用是用官方價目表 × 實際成功的 run 數和配對數算的（Task：pro $0.10、ultra $0.30、core $0.025 一次；FindAll base：每次 $0.25 + 每個配對 $0.03）。明細在 `scripts/spike/out/ledger.json`。
- **沒拿到 Parallel 的實際帳單數字**：Balance API（`/service/v1/balance`）要 service JWT，API key 不能用；內建瀏覽器的 platform.parallel.ai 沒有登入。請到 https://platform.parallel.ai 的用量頁對一下。
- 「可能 $0.51」：FindAll 加 enrichment 後 run 會重新排隊，又多配對了 17 個（超過 match_limit）。這 17 個有沒有收費文件沒寫，所以先算進去。

### 抽查摘錄（9 筆，`out/spotcheck.json`）
直接抓原網頁（不經過 Parallel），去掉 HTML 後找摘錄原文。

| 做法 | 來源 | 原文在不在 | 能不能支持那個說法 |
|---|---|---|---|
| Task ultra | cna.com.tw（立法院審無人機條例） | 在 | 能 |
| Task ultra | caa.gov.tw（民航局） | **這台機器連不到**（DNS 失敗，fetch、curl、WebFetch 都一樣） | 不能：摘錄只是網站選單和 PDF 檔名 |
| Task pro | tronfuture.com（Taiwania Capital 領投創未來 A 輪） | 在 | 能 |
| FindAll | trade.gov（軍備局採購 48,750 架無人機） | 在 | 能 |
| FindAll | tediboa.com.tw（聯盟新聞） | 在 | 能 |
| FindAll（另抽） | triadr.com（Chen & Chang 一位律師的個人頁） | 在 | 弱：講的是爭議解決，不是出口管制 |
| FindAll（另抽） | scienceglobe.org（無人機研討會） | 在 | 弱：會議聚合網站，而且已經過期（2026-10-24） |
| FindAll + 補資料 | mna.mnd.gov.tw（軍備局局長布達） | 在 | 能（具名人物） |
| C | taiwannews.com.tw（雷虎總經理） | 在 | 能（具名人物） |

**8/9 原文確實在網頁上；但「原文在」不等於「有用」：9 筆裡 3 筆是選單文字或很弱的證據。** S3 研究引擎要擋掉這種摘錄（太短、像選單、和實體名稱無關的不算來源）。

### 範例裡有、試做沒找到的
- 每個做法都沒找到：**國家發展基金**、**一級電信業者**（中華電信等）、**桃園零件供應商聚落**（範例本來就是泛稱）、**國防採購說明會**（泛稱）。
- Task（pro、ultra、C）：國防部有找到，但**沒有單獨列軍備局**（FindAll 有，還找到 48,750 架採購的來源）。
- FindAll：**沒找到 NCC**（有產生候選但到 match_limit 就停了）和**立法院外交及國防委員會**（只找到立法院本身）；ultra 兩個都有。
- 範例的 Kestrel、Harbor Lane 是虛構的，不算。

### 網絡分頁（投資人、律師、活動）
- **投資人**：FindAll 最多（10 個：Taiwania Capital、CID Group、ITIC、Warwick VC、Taiwan Cooperative VC、Taya Venture、NTU Ventures、Pegatron、Wistron、Taishan Invest）；ultra 6 個，幾乎都來自同一篇創未來 A 輪新聞。
- **律師**：FindAll 8–10 家（Lee and Li、Tsar & Tsai、Baker McKenzie Taipei、Lin & Partners、Wei & Yang…），但有幾家證據很弱；ultra 3 家（Lee and Li、Tsar & Tsai、Eiger），每家都附相關業務頁。
- **活動**：**ultra 最好**：TADTE 2027（2027-09-23–25）、Secutech 2027、智慧城市展 2027、TAIROS 2027，都是未來而且有日期。FindAll 的 8 個裡 4 個已經過期、1 個重複、2 個是會議聚合網站。

## 看到的問題（S3 要處理）
1. **一次 Task 回傳整張地圖時，列表項目常常沒有自己的引用**：pro 只有 42% 的實體有自己的摘錄，其餘只有模型自己填的 `source_url`，沒有摘錄（不符合產品規則）。ultra 好很多（89%），但 4 個政府機關、2 個具名人物仍沒有引用。→ 每個實體要各自補資料，才能保證每個節點都有 Basis。
2. **Parallel 警告 schema 太複雜**（27 個屬性，建議 20 以內）。C 的第一步只要名字、中文名、類別、為什麼相關、網址就好，其他欄位交給補資料那一步。
3. **人名會過期**：ultra 說工研院院長是 Edwin Liu（引 2025-02 新聞），補資料那一步說是 Pei-Zen Chang（張培仁）。要存查證日期，超過 90 天重查（intent §7 已寫）。
4. **FindAll 的怪處**：大查詢沒用、要分類查詢；加 enrichment 會讓已完成的 run 重新排隊，又多配對超過 match_limit（出現國家公園、台北市政府這類雜訊），而且 enrichment 只做了 match_limit 個，**跳過了部分原本的配對**（產業發展署、AIDC、Tron Future 都沒補到）。FindAll 是 beta，文件說 enrichment 只能建立之後再加。
5. **有些來源不是可以點的網頁**：例如 `https://tracxn.com`（只有首頁網址，摘錄是資料庫欄位）。S3 要把這種標成「未驗證」。
6. **有些台灣政府網站從國外連不到**（caa.gov.tw 這次就連不到）。Vercel 函式在國外跑，App 端不要自己重抓，直接存 Parallel 給的摘錄和查證日期。
7. **中國規則**：這次沒有出現中國的機構或個人；S3 還是要在寫入前過濾。

## 三個選項

| 選項 | 每份 dossier | 時間 | 好處 | 壞處 |
|---|---|---|---|---|
| A：只用 Task ultra | ~$0.30 | ~8 分 | 最便宜、最簡單、活動最好 | 約 1 成實體沒有自己的來源；人名很少；律師和投資人少 |
| B：FindAll（4–5 類）+ 補資料 + ultra 補活動 | ~$4–5 | ~10–12 分 | 實體最多、投資人和律師最多、每個都有來源 | 貴 3 倍以上；雜訊和重複要自己清；FindAll beta 的 enrichment 行為不穩；漏了 NCC 和國防委員會 |
| **C：ultra 找名單 + 每個實體 Task core 補資料（建議）** | **~$1.25–1.50** | **~12 分** | 每個實體、每個人名都有自己的來源；名單品質高（對到範例 10/16，和其他做法一樣，但 NCC、國防委員會這些 FindAll 漏掉的都有）；程式簡單（只用 Task API） | 實體數受 ultra 一次能列多少限制（這次 38，設計稿要 48）；律師和投資人比 B 少 |

### 為什麼建議 C
- 產品規則最硬的一條是「每個利害關係人都要追到來源」；C 是唯一在名單品質和來源覆蓋都達標、又便宜的做法。
- US$1.50 一份，目前帳戶的錢可以跑 9 份左右；B 只能跑 3 份。
- 只用 Task API 一種非同步流程（建立 → 輪詢或 webhook），S3 比較好做。補資料可以用 Task Group 一次送出（這次是 38 個 run 分別建立，3 分鐘內全部完成，沒有失敗）。

### 每份 dossier 的上限（建議寫進 spec）
- Parallel 費用上限 **US$2 / dossier**（ultra 1 次 + core 最多 60 次 = $1.80）。
- 研究時間上限 **20 分鐘**（ultra p90 10 分鐘 + 補資料）；超過就先給已完成的部分，其餘標「研究中」。
- 需要更多投資人或律師時才加 FindAll，每類 match_limit ≤ 10。

## 還沒驗證的
- C 是在同一次 ultra 名單上補資料；沒有測「把第一步 schema 改小、要求 40–50 個實體」之後 ultra 會列幾個。S3 第一個測試就測這個。
- 只跑了一個案例，各一次；結果會有變動。
- 實際帳單數字要到 Parallel 網站確認。
