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
- 目標使用者：【待補】例：要進台灣國防／無人機市場的美國或歐洲深科技新創，創辦人或 BD 負責人。
- 先只做一條走廊：**美國／歐洲無人機和國防科技新創 → 台灣**（設計稿範例：美國反無人機新創進台灣）。網絡要夠密才有用，下拉選單列五個國家看起來就像通用工具。
- 為什麼是現在：台灣 2026 年 8 月起 6 年編列超過 70 億美元無人機預算；2025 年 9 月以來至少 13 份美台合作協議（WSJ 2026-10-13 電子報；用之前要對照行政院預算原文）。
- 真正的對手：免費的 AmCham Taiwan、TAITRA、InvestTaiwan，加上每月 20–200 美元的 deep research，再加一個人脈好的顧問。Portolan 的定位是「把這些會議變成策略和紀錄」，不是取代他們。
- 中國市場只做機構層級，不建個人檔案（設計稿下拉選單寫「China (limited coverage)」）。

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
| 可信度（設計稿 94% CONFIDENCE），點開看算法和來源 | 自動 |
| 重新整理按鈕：重跑研究，時間變成「just now」 | 自動（算進每日研究次數上限） |
| 三個數字：利害關係人數、引用來源數、新提醒數 | 自動 |
| 「Open 3D stakeholder map」 | 自動 |
| 時效提醒（例：「14 天後委員會審查採購修正案，2 個支持者是共同提案人」） | 自動：研究時找到的時效事件。持續監控見 07 觀察清單 |
| SELECT DOSSIER：切換 dossier，每個顯示可信度 | 自動：列出這個瀏覽器開過的 dossier 和範例 |
| 「+ New dossier」／「Close」：展開表單 | 自動 |
| 表單：公司、產品或服務、目標市場下拉（Taiwan、United States、Japan、Singapore、China (limited coverage)）、目標、Email、「Start research」 | 自動。MVP 走廊以台灣為主，其他市場標「coverage limited」 |
| 研究進度畫面（設計稿沒有，一定要加） | 自動 |

### 02 Map（`/d/[id]/map`）
| 功能 | 做法 |
|---|---|
| 標題列：dossier 名稱、「20 OF 48 STAKEHOLDERS SHOWN」、SAMPLE DATA | 自動 |
| 3D Influence Map ／ Power Matrix 切換 | 自動 |
| 3D 地圖：SVG 偽 3D（照 `02-map.template.html` 的 `project()`），自動旋轉、拖曳旋轉、左右旋轉按鈕、暫停／繼續旋轉 | 自動 |
| 節點：大小 = 影響力、顏色 = 立場（支持、中立、反對）、事件用菱形；影響力 ≥ 78 預設顯示名稱 | 自動 |
| 點節點：高亮相連節點和連線，其他變淡；再點一次取消 | 自動 |
| Power Matrix：x 軸支持度 −100～+100、y 軸影響力；四象限 Blockers、Champions、Monitor、Allies to grow | 自動 |
| 分類篩選：All、Government、Industry、Capital、Legal、Events | 自動 |
| 圖例：Supportive、Neutral、Resistant、Event、Your team、Warm tie | 自動 |
| 詳情面板（INSIDER DOSSIER INSPECTOR）：類別、立場、全名、角色、影響力 /100、支持度 ±100、引用來源數 | 自動 |
| 建議動作（RECOMMENDED ACTION）、「View evidence」（到來源）、「Add to tracker」 | 自動 |
| 預設高亮 3 個建議先接觸的節點；手機轉不動時可以用清單看 | 自動（研究的建議，見 generic-risks.md 第 5 段） |
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
| 版本號（v3）、「RE-BRIEF」重寫簡報 | 自動 |
| 四個指標：Entry readiness /100、Opposition index /100、Window to act（天）、Data confidence | 自動。每個都能點開看算法和來源；分數用區間，不用假精準的小數 |
| Position rationale 立場理由 | 自動（Claude，只用有來源的事實並引用來源 id） |
| Recommended executive path 建議路徑 | 自動 |
| 7-day entry plan（Day 1–2、3–4、5、6–7） | 自動 |
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
| 「Save debrief」後顯示改了什麼：支持度 +55 → 新分數、階段 Contacted → Met、新增的下一步和期限、下一份簡報會用到這些內容 | 自動 |
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
| Expert review 開關，顯示不同的完成時間 | 自動。開：AI 草稿約 10 分鐘，專家 24 小時內審完；關：只有 AI 草稿，提醒先查人名和日期 |
| 「Request …」→「Request received」和完成時間 | 自動記錄 |
| 會前簡報（Briefing note）AI 草稿 | 自動：Claude 照 08 的格式和模板，只用有來源的事實 |
| 專家審稿 | 人工代辦：團隊或簽了保密協議的專家查證後，在後台把狀態改成核准 |
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
- 08 也是品質標準：自動產生的會前簡報要和它一樣具體（例：5.1 GHz 偵測缺口、48,750 架採購案）

### 每一頁都要有
- 底部分頁：Dossiers、Map、Tracker、Network、Docs
- 載入中、空資料、錯誤三種狀態都要設計過；按鈕有回饋
- `/d/sample` 永遠可以看範例 dossier（`src/fixtures/taiwan-uas.ts`），每一頁標「Sample data」

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
- 上線前要請律師看（台灣個資法、日本 APPI、新加坡 PDPA、美國各州法；聯絡人是沒有註冊 Portolan 的第三方）。隱私說明要寫清楚這一段。

## 7. 文件
四種文件從同一份 dossier 資料產生：

| 文件 | 頁數 | 給誰 | 定價假設（待驗證） | MVP 做法 |
|---|---|---|---|---|
| 一頁市場進入報告 | 1 頁 A4 | 創辦人、BD | 免費或內含 | 自動 |
| 利害關係人會前簡報 | 3 頁 / 每場會議 | 出席會議的人 | US$300–800 / 份 | AI 草稿自動，專家審稿人工代辦 |
| 市場與政策風險簡報 | 4 頁 | 決策層 | US$1.5k–5k | 人工代辦 |
| 觀察清單更新（90–180 天） | 1–2 頁、每月 | 決策層 | 訂閱 | 人工代辦 |

- 每種文件照 `docs/templates/` 的段落、字數和頁數上限，不自創段落。範例（去掉客戶機密）放 `docs/templates/samples/`。
- 每個具名人物和職稱都要有來源和查證日期，超過 90 天要重新查證。
- 「對客戶的影響」和「建議做法」要用到客戶資料（產品、現況），沒有就標「需要客戶提供」。
- AI 起草 90%，專家一小時內審完；專家只負責查人名和日期、補判斷、刪不確定的內容。同一類修改出現 3 次以上，就寫進模板。
- 文件標「Confidential」，只有拿到 dossier 連結的人看得到。

## 8. 方案（MVP 只顯示標籤，不收費）
| 方案 | 內容 |
|---|---|
| Free | AI dossier、3D 地圖、一頁報告（帶 Portolan 品牌，被轉傳就是宣傳） |
| Pro（訂閱） | 監控與提醒、追蹤器、團隊筆記、風險簡報、團隊人脈圖層 |
| Connect | 專家審稿的會前簡報、透過在地專家牽線 |

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

## 11. 評分（草稿）
【待補】確認或修改：
- 影響力 influence 0–100：正式職權（法定採購角色）+ 預算控制 + 網絡中心性 + 接近決策者的程度 + 最近的相關行動。每一項都看得到來源和分級。
- 支持度 support −100～+100；立場由支持度切：≥ +20 支持、≤ −20 反對、其他中立。會後回報會改它（設計稿：Positive +13、Negative −20）。
- 可信度 confidence：獨立來源的數量和 Admiralty 分級。
- Entry readiness、Opposition index、Window to act、Data confidence 怎麼算：【待補】
- 公式只寫在 `docs/scoring.md`，程式和 prompt 都引用它。

## 12. 資料
- dossier、stakeholder、edge（關係）、source（URL + 摘錄 + 查證日期 + Admiralty 分級）
- brief（策略簡報版本）、lead（網絡卡片）、tracker_item（階段、下一步、期限、會議日期）、debrief、playbook_outcome（匿名）
- document_request、document（類型、狀態、審稿人、查證日期、檔案）、intro_request
- team_member、contact、tie（成員 → 聯絡人 → 機構、強度、怎麼認識、來源）、org_alias
- Supabase Postgres，只從伺服器連；每張表開 RLS，不給 anon 任何 policy；變更寫成 migration。

## 13. 誰能看到什麼
- 不做登入。每份 dossier 一個猜不到的網址（至少 128 bit），有網址的人才看得到；建立時寄到使用者的 Email。
- 「對方說了什麼」和團隊人脈只存在那份 dossier。
- 研究有每個 Email 和全站每天的次數上限，超過時友善提示。

## 14. 送出 YC 之後再做
登入和團隊帳號、Google／Microsoft 通訊錄直接授權連線、專家審稿的網頁後台、持續的官方來源監控（Parallel Monitor）、付費、情報品質評測（evals）。

## 15. 還沒決定
- 【待補】每份 dossier 找幾個利害關係人（設計稿：48 個、126 個來源），研究最久可以跑幾分鐘
- 【待補】每份 dossier 的成本上限（Parallel 試做後決定）
- 【待補】每個 Email 每天可以建幾份
- 【待補】會前簡報、風險簡報要不要收費、收多少
- 【待補】誰當第一批審稿專家（至少 2–3 位，簽保密協議，每份固定費用）
