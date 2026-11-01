# Portolan 需求說明

Portolan（原名 Atlas）是網頁 App。這份是需求的唯一來源，整理自三份資料：
- 設計稿 `design/atlas-mockup.html`（8 個畫面；可讀原始碼在 `design/mockup/src/`，截圖在 `design/screens/`）
- 「Atlas 建 App 流程」指南的產品方向（https://claude.ai/artifact/ReqPdC76coRiG9rqFMwxph ）
- 研究 `docs/research/generic-risks.md`、`docs/research/chat-research-2026-10-29.md`

標 **【待補】** 的地方請創辦人用自己的話填完。設計稿上寫 ATLAS 的地方，App 裡一律改成 Portolan。

---

## 1. 為什麼做
要進入海外市場的新創和企業，要的不是報告，而是在新市場拿到**第一個客戶、合作夥伴或投資人**。使用者輸入公司、產品和目標市場，Portolan 把公開資料整理成**每一點都附來源**的利害關係人地圖、策略簡報和文件，幫他們見到對的人，並記錄每次見面的結果。

產品路線：

| MAP 地圖 | PLAN 策略 | MEET 見面 | TRACK 追蹤 |
|---|---|---|---|
| 3D 利害關係人地圖 | 策略簡報、文件、提醒 | 會前簡報、專家牽線、團隊人脈 | 從找到到合作的進度、會後回報 |

**護城河不是報告。** 一般 AI 已經能寫不錯的市場摘要。Portolan 的護城河是：
1. **成果資料**：客戶回報「哪條路真的有用」，會後回報更新利害關係人的立場分數，下一份簡報更準。
2. **在地專家網絡**：付費請在地專家（律師、前官員、分析師）審稿，同一批人之後負責牽線。

兩個飛輪：
- 會前簡報 → 會後問「談得怎樣？對方說了什麼？」→ 更新立場分數（別人沒有的資料）→ 下一份簡報更準
- 付費請專家審稿 → 專家有穩定收入、留下來 → 同一批專家負責牽線（Connect）

## 2. 給誰用、先做哪條走廊
- 目標使用者：先從要進台灣的美國／歐洲無人機和國防科技新創開始（創辦人或 BD 負責人），但任何要進台灣的新創都能用。最大的痛點是語言障礙讓市場很難進；現在靠商會或認識的人，失敗時損失交易、時間和市場利基（創辦人 2026-10-30，原文見 `docs/decisions/2026-10-30-founder-answers.md`）。
- 先只做一條走廊：**美國／歐洲無人機和國防科技新創 → 台灣**（設計稿範例：美國反無人機新創進台灣）。網絡要夠密才有用，下拉選單列五個國家看起來就像通用工具。
- 為什麼是現在：2025 年 9 月以來至少 13 份美台合作協議（WSJ 2026-10-13 電子報）。設計稿的「6 年超過 70 億美元無人機預算」不準：行政院 2026 年 6 月**提案** 5 年 NT$2,100 億（約 US$66.5 億），法案卡住；真的**通過**的是 2026 年度無人機預算 NT$634 億（約 US$20 億）。要用就照這個寫，附來源。
- 真正的對手：免費的 AmCham Taiwan、TAITRA、InvestTaiwan，加上每月 20–200 美元的 deep research，再加一個人脈好的顧問。Portolan 的定位是「把這些會議變成策略和紀錄」，不是取代他們。
- MVP 只做台灣市場；China 不出現在選單。之後做中國也只做機構層級，不建個人檔案。

## 3. 平台：網頁 App，不做手機 App
- Next.js 網頁，部署在 Vercel。電腦和手機的瀏覽器都要好用；不做 iOS／Android App，不上 App Store。
- 手機寬度（390px）的版面和資訊照 `design/screens/`。電腦寬度（1280px）用多欄版面：例如地圖和詳情並排、追蹤器和會後回報並排。電腦版面在第 3 步的設計方向一起定。
- YC demo 和第一批使用者主要在電腦上看；分享連結和 A4 報告常在手機上打開。

## 4. 核心流程
1. 首頁按「+ New dossier」，填公司、產品、目標市場、目標（例：12 個月內拿到第一個政府試辦案）、Email，按「Start research」。
2. 研究進度畫面：一條一條顯示找到的來源和利害關係人，不要只有轉圈圈。完成後寄連結到 Email。
3. 3D 地圖：轉動、點節點看詳情（立場、影響力、支持度、來源、建議動作）→「Add to tracker」。切到 Power Matrix 決定先找誰。
4. 策略簡報 → 匯出一頁 A4 PDF，或複製分享連結。
5. 網絡：存下要見的投資人、律師、活動，或加進計畫。
6. 文件：申請會前簡報、風險簡報、觀察清單更新。
7. 見完面隔天，在追蹤器填 30 秒的會後回報 → 支持度、階段、下一步都更新。
8. 團隊人脈：打開圖層，看「我們已經認識誰」，複製引薦草稿請同事幫忙。

## 5. 每個畫面和功能（設計稿上的每個功能都要有）

「做法」欄：**自動** = App 自己完成；**人工代辦** = 按鈕和紀錄是真的，背後由團隊用「模板 + AI」親手完成，做好後狀態會更新。

### 01 Dossiers（`/`）
| 功能 | 做法 |
|---|---|
| 品牌列：MARKET ENTRY INTELLIGENCE、方案標籤（設計稿寫 ATLAS PRO）、標語 | 自動。方案標籤只是顯示，不收費 |
| 01–06 格狀快速導覽（Dossiers、Map、Tracker、Network、Documents、Strategy Brief） | 自動 |
| 目前 dossier 卡片：VERIFIED DOSSIER、SAMPLE DATA 標籤、名稱、國家、「refreshed 2h ago」 | 自動 |
| 可信度：高／中／低加來源數（例：「High · 126 sources」），不用設計稿的「94%」；點開看算法和來源 | 自動 |
| 重新整理按鈕：重跑研究，時間變成「just now」 | 自動（算進每日研究次數上限） |
| 三個數字：利害關係人數、引用來源數、新提醒數 | 自動 |
| 「Open 3D stakeholder map」 | 自動 |
| 時效提醒（例：「14 天後委員會審查採購修正案，2 個支持者是共同提案人」） | 自動：研究時找到的時效事件。持續監控見 07 觀察清單 |
| SELECT DOSSIER：切換 dossier，每個顯示可信度 | 自動：列出這個瀏覽器開過的 dossier 和範例 |
| 「+ New dossier」／「Close」：展開表單 | 自動 |
| 表單：公司、產品或服務、目標市場下拉、目標、Email、「Start research」；選填：產品認證、價格區間、現有台灣夥伴、客戶自己的期限 | 自動。選填欄位沒填時，簡報寫「需要客戶提供：…」。只能選 Taiwan；United States、Japan、Singapore 顯示「coming soon」不能選；不列 China。產業不限 |
| 研究進度畫面（設計稿沒有，一定要加） | 自動 |

### 02 Map（`/d/[id]/map`）
| 功能 | 做法 |
|---|---|
| 標題列：dossier 名稱、「20 OF 48 STAKEHOLDERS SHOWN」、SAMPLE DATA | 自動 |
| 3D Influence Map ／ Power Matrix 切換 | 自動 |
| 3D 地圖：SVG 偽 3D（照 `02-map.template.html` 的 `project()`），自動旋轉、拖曳旋轉、左右旋轉按鈕、暫停／繼續旋轉 | 自動 |
| 節點：大小 = 影響力、顏色 = 立場（支持、中立、反對、Unknown 灰色空心）、事件用菱形；影響力 ≥ 78 預設顯示名稱 | 自動 |
| 點節點：高亮相連節點和連線，其他變淡；再點一次取消 | 自動 |
| Power Matrix：x 軸支持度 −100～+100、y 軸影響力；四象限 Blockers、Champions、Monitor、Allies to grow；Unknown 列在矩陣旁 | 自動（象限切法見 `docs/scoring.md` 第 5 節） |
| 分類篩選：All、Government、Industry、Capital、Legal、Events | 自動 |
| 圖例：Supportive、Neutral、Resistant、Event、Your team、Warm tie | 自動 |
| 詳情面板（INSIDER DOSSIER INSPECTOR）：類別、立場、全名、角色、影響力（等級 + 區間，例「High · 70–85」，「依 3 / 5 項計算」）、支持度 ±100 或 Unknown、引用來源數 | 自動 |
| 建議動作（RECOMMENDED ACTION）、「View evidence」（到來源）、「Add to tracker」 | 自動 |
| 預設高亮 3 個建議先接觸的節點；手機轉不動時可以用清單看 | 自動：固定規則選，不由 Claude 決定（`docs/scoring.md` 第 5 節） |
| 「Your team's connections」圖層開關（只在 3D 檢視） | 自動，見第 6 節 |
| 團隊成員節點在中央（白底橘框，未加入的用虛線框），虛線連到他們認識人的機構，線粗 = 關係強度 | 自動 |
| YOUR TEAM'S NETWORK 清單：每位成員、角色、狀態（幾條關係／INVITED）、「3 of 4 connected」 | 自動 |
| 「Upload LinkedIn export」、「Connect contacts」 | 自動：上傳 LinkedIn Connections.csv、Google 通訊錄匯出的 CSV／vCard，或手動輸入 |
| 點成員：看他的所有關係（機構、聯絡人、怎麼認識、強度 ●●○） | 自動 |
| 點機構：WHO KNOWS SOMEONE HERE（誰認識誰、怎麼認識、強度、LinkedIn 連結、「Ask Mei for intro」） | 自動 |
| 沒有直接關係：最佳暖路徑（你 → 同事 → 聯絡人 → 目標），地圖上標出，「Ask … to start the intro」 | 自動 |
| 完全沒有路徑：「Request a Portolan expert intro」→ 04 網絡 | 人工代辦 |
| 引薦草稿（DRAFT · YOUR TEAMMATE SENDS IT）、「Copy draft」、「Close」 | 自動：Claude 寫草稿，只能複製，Portolan 不代寄 |

### 03 Strategy Brief（`/d/[id]/brief`）
| 功能 | 做法 |
|---|---|
| 版本號（v3）、「RE-BRIEF」重寫簡報 | 自動。有新會後回報、改過利害關係人或來源超過 90 天就標「Out of date」；按 RE-BRIEF 先顯示預估費用，確認才重寫；舊版保留，新版開頭 2–4 行寫改了什麼 |
| 四個指標：Entry readiness /100、Opposition index（%）、Window to act（天）、Data confidence | 自動。算法照 `docs/scoring.md` 第 4 節；每個都能點開看算法和來源；分數用等級 + 區間，不用假精準的小數 |
| Position rationale 立場理由 | 自動（Claude，最多 120 字，每一句引用來源 id） |
| Recommended executive path 建議路徑 | 自動：3–5 步，順序照固定規則（`docs/scoring.md` 第 5 節），Claude 只寫理由；反對者另寫「怎麼降低反對」 |
| 7-day entry plan（Day 1–2 準備、3–4 聯絡前 3 個人、5 活動或會議、6–7 追蹤） | 自動：每個動作寫一個利害關係人和來源；沒有活動就寫「這週沒有找到活動」 |
| 顯示前的檢查 | 自動（程式）：每句都引用存在的來源 id、提到的人和機構都在地圖上、沒有佔位字、沒有中國的個人；沒通過的句子刪掉並記 log |
| Evidence dossier：來源標題、類型（政府公報、議事紀錄、新聞）、分數、逐字摘錄；「3 OF 126」可以展開全部 | 自動。摘錄一定是原文，台灣來源附中文原文 + 翻譯 |
| 「Export one-page A4 PDF」 | 自動 → 05 |

### 04 Network（`/d/[id]/network`）
| 功能 | 做法 |
|---|---|
| 分頁：Investors、Lawyers、Events | 自動 |
| 每頁的說明（不仲介投資、不收成功費；不給法律建議；活動依預計出席的利害關係人數排序） | 自動 |
| 卡片：類型、名稱、配對分數（% 或「9 ppl」）、條件、「Why:」理由、建議路徑 | 自動：研究產生，沒有來源的標「未驗證」 |
| 「Save lead」／「Saved」；活動是「Add to plan」／「Added to plan」 | 自動：存進追蹤器的 Found 階段 |
| 「Show on map」 | 自動 |
| 請 Portolan 引薦（從地圖「Request a Portolan expert intro」來） | 人工代辦：記下需求，團隊親自牽線，結果寫回追蹤器 |

### 05 一頁 A4 報告（`/d/[id]/report`，分享連結 `/s/[id]`）
| 功能 | 做法 |
|---|---|
| MARKET ENTRY BRIEF · CONFIDENTIAL、dossier 名稱、Prepared for 客戶公司 · 產品 · 日期 | 自動。不准出現 [CLIENT]、[DATE] 這類佔位字 |
| 可信度和來源數 | 自動 |
| Executive summary | 自動 |
| 三個指標：Entry readiness、Opposition index、Window to act | 自動 |
| 地圖縮圖（Government、Industry、Capital & Legal 三區，圖例「size = influence」） | 自動：固定角度的 SVG |
| Top 5 stakeholders 表格：立場、影響力、下一步、來源編號 | 自動 |
| Recommended entry path、7-day plan | 自動 |
| Where to meet them：活動、日期、會遇到幾個已標示的利害關係人 | 自動 |
| Key risks | 自動 |
| 來源清單和「完整來源在下方連結」 | 自動 |
| 分享連結（猜不到的隨機 id）、「Sample data · every claim links to a cited source」 | 自動 |
| A4 列印樣式，用瀏覽器另存 PDF | 自動，不做伺服器端 PDF |

### 06 Tracker（`/d/[id]/tracker`）
| 功能 | 做法 |
|---|---|
| 四階段計數：Found → Contacted → Met → Partner；點階段篩選，「Show all」取消 | 自動 |
| DEBRIEF DUE 卡片：「Meeting was yesterday」、要回報哪一場 | 自動：會議日期隔天出現 |
| 會後回報：Overall（Positive、Neutral、Negative）、有沒有下一步（Yes、Not yet）、對方說了什麼（只有你的團隊看得到）；沒選 Overall 不能送出 | 自動 |
| 「Save debrief」後顯示改了什麼：支持度「舊分數 → 新分數」、階段 Contacted → Met、新增的下一步和期限、簡報標「Out of date」 | 自動：會後回報算一個 A1 來源、權重最重，重算支持度（`docs/scoring.md` 3.1），不加固定分數 |
| 「匿名成果加進 Portolan playbook」 | 自動：只存，不給其他客戶看 |
| 「Undo」 | 自動 |
| NEXT STEPS 清單：名稱、下一步、期限、階段標籤、立場色點（事件用菱形） | 自動 |
| 「Prepare a briefing note for the next meeting」 | 自動 → 07 |

### 07 Documents（`/d/[id]/docs`）
| 功能 | 做法 |
|---|---|
| 標題 Advisory documents、AI-drafted, expert-reviewed、CONNECT 標籤 | 自動（方案標籤只是顯示） |
| 「+ Request a document」／「Close」 | 自動 |
| 文件類型：Briefing note（3 頁、一場會議）、Risk deck（4 頁、給決策層）、Watch-list update（1–2 頁、每月） | 自動 |
| 選哪一場會議或哪個利害關係人 | 自動：列出追蹤器裡的項目 |
| Expert review 開關，顯示不同的完成時間 | 自動。開：AI 草稿約 10 分鐘，專家審稿時間【待補：創辦人說 24 小時做不到，回答「4 週內」，待確認是不是 4 天】；關：只有 AI 草稿，提醒先查人名和日期 |
| 「Request …」→「Request received」和完成時間 | 自動記錄 |
| 會前簡報（Briefing note）AI 草稿 | 自動：Claude 照 08 的格式和模板，只用有來源的事實 |
| 專家審稿 | 人工代辦：簽了保密協議的專家查證後，團隊把狀態改成核准。專家簽約前由創辦人審，文件寫「Reviewed by 姓名」，不寫 EXPERT REVIEWED |
| 風險簡報、觀察清單更新 | 人工代辦：團隊用「模板 + AI」親手做好再上傳 |
| YOUR DOCUMENTS：每份文件的類型、頁數、狀態（EXPERT APPROVED、IN EXPERT REVIEW、READY · FREE、NEXT: 日期）、審稿人和查證日期 | 自動顯示；狀態由上面兩種做法更新 |
| 會前簡報：「Open」、「Add debrief」 | 自動 |
| 一頁報告：「Open PDF」、「Strategy brief」 | 自動 |
| 觀察清單（90–180 天）：要盯的事件列表、下次更新日期 | 研究時列出事件是自動；每月更新是人工代辦 |

### 08 Briefing note（`/d/[id]/docs/[docId]`）
- 3 頁會前簡報，第 1 頁有：標頭（STRATEGIC ADVISORY · CONFIDENTIAL）、EXPERT REVIEWED 標章、審稿人和查證日期、Prepared for、會議時間地點長度、「會後 24 小時內在 Portolan 回報」
- 四段：1 會議目的；2 對方的職權、結構、影響力；3 對方可能怎麼看客戶；4 電梯簡報和講法提醒
- 第 2–3 頁：talking points、suggested asks、risks & sensitivities
- 頁尾來源清單（附查證日期）和「not legal advice」
- 08 也是品質標準：自動產生的會前簡報要和它一樣具體，但每個數字都要有來源。設計稿的「48,750 架」是真的（軍備局 2025 年 7 月計畫：2026 年 11,270 架、2027 年 37,480 架，約 NT$500 億），用的話附來源；「5.1 GHz 偵測缺口」找不到來源，不能出現

### 每一頁都要有
- 底部分頁：Dossiers、Map、Tracker、Network、Docs
- 載入中、空資料、錯誤三種狀態都要設計過；按鈕有回饋
- `/d/sample` 永遠可以看範例 dossier（`src/fixtures/taiwan-uas.ts`），每一頁標「Sample data」；首頁有一個按鈕直接進去，不用填表或 Email（給 YC 合夥人和第一次來的人）

## 6. 團隊人脈：「我們已經認識誰？」
- 每位成員自己選擇加入；不能替別人上傳人脈。
- 來源只有三種：成員自己上傳的 LinkedIn 匯出檔（Connections.csv，做法見 https://www.linkedin.com/help/linkedin/answer/a566336 ）、成員自己匯出的 Google 通訊錄（https://support.google.com/contacts/answer/7199294 ）、手動輸入（「我認識 Y 的 X」，品質通常最好）。
- 不用 LinkedIn API，不爬 LinkedIn 網站（違反服務條款）。連到對方公開的 LinkedIn 個人頁可以，只是一個連結。
- 聯絡人只存：姓名、機構、職稱、怎麼認識、關係強度（1–3）、來源。除非成員自己填，不存電話和私人備註。
- 人脈只屬於那份 dossier 的團隊：不進共用的成果資料（playbook），不出現在其他客戶的畫面，不給 AI 用在其他客戶。
- 成員撤回同意時，他的人脈立刻從地圖刪掉。
- 機構比對（LinkedIn 公司欄位 → 利害關係人）用別名表（例如「中科院」「NCSIST」）；信心不夠時讓成員確認，不要自己猜。
- 暖路徑最多 2 跳（你 → 同事 → 聯絡人 → 目標）。
- 引薦訊息只產生草稿，由成員自己寄出；Portolan 不代寄、不自動發訊息。
- 上線前要請律師看（台灣個資法、日本 APPI、新加坡 PDPA、美國各州法、歐盟 GDPR；聯絡人是沒有註冊 Portolan 的第三方）。隱私說明要寫清楚這一段。
- 律師還沒找（創辦人會問認識的人）。律師同意前，團隊人脈只在範例 dossier 開放，真的 dossier 不能上傳或輸入人脈。

## 7. 文件
四種文件從同一份 dossier 資料產生：

| 文件 | 頁數 | 給誰 | 定價假設（待驗證） | MVP 做法 |
|---|---|---|---|---|
| 一頁市場進入報告 | 1 頁 A4 | 創辦人、BD | 免費或內含 | 自動 |
| 利害關係人會前簡報 | 3 頁 / 每場會議 | 出席會議的人 | US$300–800 / 份（試辦：原價加折扣） | AI 草稿自動，專家審稿人工代辦 |
| 市場與政策風險簡報 | 4 頁 | 決策層 | US$1.5k–5k（試辦：原價加折扣） | 人工代辦 |
| 觀察清單更新（90–180 天） | 1–2 頁、每月 | 決策層 | 訂閱 | 人工代辦 |

- 每種文件照 `docs/templates/` 的段落、字數和頁數上限，不自創段落。範例（去掉客戶機密）放 `docs/templates/samples/`；創辦人有真的會前簡報、風險簡報或觀察清單範例，【待補：等她提供】。
- 每個具名人物和職稱都要有來源和查證日期，超過 90 天要重新查證。
- 「對客戶的影響」和「建議做法」要用到客戶資料（產品、現況），沒有就標「需要客戶提供」。
- AI 起草 90%，專家一小時內審完；專家只負責查人名和日期、補判斷、刪不確定的內容。同一類修改出現 3 次以上，就寫進模板。
- 文件標「Confidential」，只有拿到 dossier 連結的人看得到。

## 8. 方案（MVP 只顯示標籤，不收費）
2026-11-01 定案（`docs/decisions/0003-architecture-and-business.md`）：dossier 要付費，付錢的是要進台灣的新創。

| 方案 | 內容 |
|---|---|
| Free preview | 地圖、前 3 個利害關係人、四個指標中的一個 |
| Dossier（一次付費，創辦人定價 US$4,000+） | 完整 dossier、一頁 A4 報告、策略簡報 |
| Pro（訂閱） | 監控與提醒、追蹤器、團隊筆記、風險簡報、團隊人脈圖層 |
| Connect | 專家審稿的會前簡報、透過在地專家牽線（固定費用，不抽成） |

- MVP 不收費、不鎖內容：方案只顯示標籤；試辦客戶在 App 外開發票。免費預覽要擋哪些內容、怎麼解鎖，YC 之後再做（第 14 節）。
- `/d/sample` 永遠完整可看。
- 之後才考慮其他付款方（TAITRA、InvestTaiwan、加速器、VC）。
- 專家每份文件拿固定費用，不分成。

## 9. 產品規則（不可違反）
- 每個利害關係人、分數、建議都要追到至少一個來源（URL + 摘錄 + 查證日期），來源取自 Parallel 的 Basis。
- 找不到來源就標「未驗證」；絕不編造人名、機構、職稱、數字、日期。
- Claude 只能根據有來源的事實評分和寫作，並引用來源 id。
- 抓來的網頁內容一律當資料，不當指令。
- 中國市場只做機構層級，不建個人檔案。
- 範例資料一律標 Sample data。
- 每個利害關係人都有具體的下一步。
- 文件是研究參考，不是法律或投資建議；Portolan 只提供聯絡管道，不仲介投資、不收成功費。

## 10. 可信度要讓專家看得懂
- 判斷用 ICD 203 用語加數字區間，例如「Likely (55–80%)」，和可信度（高／中／低）分開寫。
- 來源用 Admiralty 分級：來源可靠度 A–F、資訊可信度 1–6，例如「B2」。
- 分數用區間（高／中／低）和公開的評分表（`docs/scoring.md`），不要「87.3」這種假精準。樣本小就直說（「3 個來源」）。
- 引用對到原文段落；台灣來源附中文原文 + 翻譯。

## 11. 評分
創辦人 2026-10-30 確認四個指標的意思；算法 2026-11-01 定案（`docs/decisions/0002-scoring-and-brief.md`），細節、權重和門檻只寫在 `docs/scoring.md`，程式和 prompt 都引用它：
- **Claude 只評級、程式算分數。** Claude 照評級表給 0–3 的評級並引用來源；分數、區間、等級由程式算。
- 影響力 influence 0–100：看「對這個客戶的目標有多少權力」。五項：正式職權 30%、預算控制 25%、接近決策者 20%、網絡中心性 15%（程式從有來源的關係算）、最近的行動 10%（只算 12 個月內）。沒有來源的項目不算進去，寫「依 3 / 5 項計算」，不當 0。顯示等級 + 區間（例「High · 70–85」）。
- 支持度 support −100～+100：每一筆有來源的表態評 −2～+2，依 Admiralty 分級加權平均；≥ +20 支持、≤ −20 反對、其他中立；一筆都沒有就是 Unknown，不是中立。
- 會後回報：算一個 A1 來源、權重最重，重算支持度；不加固定分數（設計稿的 +13、−20、+55 不是規則）。
- Opposition index：反對者的影響力 ÷ 支持度已知的人的影響力總和；Unknown 不算，寫「依 48 個中的 31 個計算」。
- Entry readiness：三項有來源的檢查（錢、執照、支持者的影響力占比），各 0–3，合成 High／Medium／Low。
- Window to act：離下一個有來源的期限還有幾天；找不到就寫「沒有找到期限」，不顯示數字。
- Data confidence：高／中／低加來源數，不用百分比。
- 建議先接觸的 3 個人：影響力 ≥ 50、支持度已知且不是反對；有暖路徑的往前排；反對者不當第一個接觸的人。

## 12. 資料
- dossier、stakeholder、edge（關係）、source（URL + 摘錄 + 查證日期 + Admiralty 分級）
- brief（策略簡報版本）、lead（網絡卡片）、tracker_item（階段、下一步、期限、會議日期）、debrief、playbook_outcome（匿名）
- document_request、document（類型、狀態、審稿人、查證日期、檔案）、intro_request
- team_member、contact、tie（成員 → 聯絡人 → 機構、強度、怎麼認識、來源）、org_alias
- Supabase Postgres，只從伺服器連；每張表開 RLS，不給 anon 任何 policy；變更寫成 migration。
- 研究工作：在 Supabase 存進度；Parallel 每一步完成時呼叫我們的 webhook，存結果並開始下一步；進度頁每幾秒查一次，也順便補完 webhook 漏掉的步驟。不用 Vercel Workflow，也不用一個等 20 分鐘的函式。
- 來源掛在每一個事實上（職稱、支持度、影響力的每一項、期限、建議），不是只掛在利害關係人上；沒有來源的存成「未驗證」。
- Claude 只評級，程式照 `docs/scoring.md` 算分數。
- 範例和真的 dossier 用同一種資料格式；`/d/sample` 從程式裡的檔案讀，不從資料庫讀，資料庫掛了 demo 也能看。
- 會後回報存成自己的一筆紀錄，不改研究結果；支持度把它當來源重算。「Undo」就是刪掉那筆紀錄。

## 13. 誰能看到什麼
- 不做登入。每份 dossier 一個猜不到的網址（至少 128 bit），有網址的人才看得到；建立時寄到使用者的 Email。
- 「對方說了什麼」和團隊人脈只存在那份 dossier。
- 研究有每個 Email 和全站每天的次數上限，超過時友善提示。

## 14. 送出 YC 之後再做
真的收費和免費預覽的內容鎖、登入和團隊帳號、Google／Microsoft 通訊錄直接授權連線、專家審稿的網頁後台、持續的官方來源監控（Parallel Monitor）、付費、情報品質評測（evals）。

## 15. 還沒決定
- 【待補】每份 dossier 找幾個利害關係人：創辦人回答「100 would be good」，待確認是不是指這個（設計稿 48 個、126 個來源）。研究最久 15 分鐘（建議值），完成後寄 Email
- 【待補】每份 dossier 的研究花費上限和 11 月總預算（創辦人回答「$4000+ per dossier」，看起來是售價，待確認）
- 每個 Email 每天 2 份、全站每天 30 份（建議值，創辦人沒改）
- 試辦收費：顯示原價、試辦客戶打折【待補：打幾折】
- 【待補】誰當第一批審稿專家（至少 2–3 位，簽保密協議，每份固定費用）：創辦人去問
- 【待補】3–5 個真實的第一批使用者：創辦人在找；至少一位會在 11/3 前試一份真的 dossier
- 【待補】網域、寄信地址、Portolan 名稱查核：都還沒有
- 範例 dossier 和 YC demo：用真實的機構和公司、正確的資料，不編任何東西。每個事實都有來源；找不到來源的標「未驗證」，支持度找不到表態就是 Unknown。中國只到機構層級。仍標「Sample data」（創辦人 2026-11-01）
- YC 申請內容全部是真的：使用者、試辦、金額、市場數字。只有簽約或付費的試辦算使用者，其他算「conversations」（創辦人 2026-11-01）
- 第一批使用者：從創辦人認識的新創創辦人開始，聯絡 5–10 個人。App 11/3 上線前，第一批 dossier 由團隊手動做好交付（跑研究前先報費用、等確認），上線後搬進 App
- 架構和商業模式：用建議答案（Joey 2026-11-01），見第 8、12 節和 `docs/decisions/0003-architecture-and-business.md`
- 【待補】重新研究（refresh）時，新結果怎麼對上已經有追蹤項目和會後回報的利害關係人：寫 spec 時決定
