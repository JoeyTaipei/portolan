# Portolan 設計方向：Estimate（10/31 選定）

> 已定案。每個 UI 切片都照這份做。範例畫面在 `design/directions/estimate/`（01 首頁、02 地圖、05 A4 報告）。

## 一句話
情報簡報本：灰色桌面上的白紙、黑墨，加一支螢光筆。ICD 203 可能性用語和機率尺、Admiralty 來源等級、編號段落，私人聯絡人的名字用塗黑條。可信度就是視覺本身。

## 字體
**Public Sans**（美國政府用字，400/600/800/900 + 斜體）當內文和標題；**Courier Prime**（400/700）只用在打字機感的地方：等級、來源編號、引用、橫幅、機率尺刻度、草稿文字。不用第三個字體。

| 用途 | 字體 / 大小 / 字重 |
|---|---|
| 品牌字（首頁） | Public Sans 40px / 900，字距 −.025em |
| dossier 標題 | Public Sans 30px（電腦 40px）/ 900，字距 −.02em |
| 區塊標題 | Public Sans 13px / 800 |
| Key judgment 標籤 | Courier Prime 12.5px / 700 |
| 內文 | Public Sans 15px / 400，行高 1.5 |
| 引用、來源 | Courier Prime 11.5–12.5px，`--ink2` |
| 等級章 | Courier Prime 12px / 700 |

## 配色 token
所有顏色都是 CSS 變數，畫面程式不直接寫色碼。

| Token | 值 | 用途 |
|---|---|---|
| --desk | #E2E5E8 | 頁面底（桌面） |
| --paper | #FFFFFF | 紙、卡片、按鈕次要底 |
| --ink / --ink2 | #1A1C20 / #565B62 | 文字、線、主要按鈕、塗黑條 |
| --rule | #C8CCD1 | 細線 |
| --faint | #F2F3F5 | 分頁底、草稿區 |
| --hi | #FFE14A | 螢光筆：先聯絡、目前分頁、焦點外框、機率尺亮的那段 |
| --hi2 | #FFF3A8 | 次要按鈕 hover |

## 圓角
2px（按鈕、等級章、欄位）；8px 只用在分頁的「活頁夾標籤」下緣。其他一律直角。

## 立場編碼（不靠顏色，全部黑白可辨）
- **實心 = 支持**
- **空心 = 中立**
- **斜線網底 = 反對**（SVG pattern `#hatch`，45° 細線）
- **空心菱形 = 事件**

節點大小 = 影響力。圖例和每個清單列都要有同一個小記號（`small(st)`），旁邊寫立場文字。

## 該做 / 不該做
- 做：螢光黃只用在「要你行動」的東西：先聯絡的三個、重點判斷裡的關鍵句（`<mark>`）、目前分頁、焦點外框、機率尺。
- 做：用細線、粗線、網底分層；紙張堆疊的效果只用細線偏移，不用模糊陰影。
- 做：數字和日期旁邊都有來源編號和等級章。
- 不要：加第二個強調色。紅、綠、藍都不用；錯誤狀態用黑框加文字說明。
- 不要：在黃色上放灰字（對比不夠）；黃底一律配 `--ink`。
- 不要：全大寫內文；Courier Prime 不拿來寫長段落。

## 版面
- **手機 390px**（照 `design/screens/` 的順序）：
  - 頂端黑色橫幅（Sample data 用黃底標籤）。
  - 首頁依序：刊頭 → 目錄 → 主文（memo 欄位、標題、三格指標、Key judgment 加機率尺、編號段落、來源註記）→ dossier 清單。
  - 地圖頁依序：標題 → 3D 地圖 / Power matrix 切換 → 團隊人脈開關 → Exhibit 圖框 → 旋轉控制和圖例 → 分類 → 詳情 → 先聯絡的三個 → 全部清單。
  - 底部固定 5 個分頁，做成活頁夾標籤，目前那頁上緣有 3px 黃條。
- **電腦 1280px**：5 個分頁變成右側直立的活頁夾標籤（寬 46px，`writing-mode: vertical-rl`）。
  - 首頁三欄 `290px | 1fr | 300px`，最寬 1220px：左欄刊頭、目錄、dossier 清單；中欄一張「紙」；右欄來源註記。
  - 地圖三欄 `290px | 1fr | 370px`，高度撐滿視窗：左欄切換和篩選；中欄 Exhibit 地圖；右欄詳情和清單。三欄各自捲動。
- **間距**：4px 基準。手機左右留白 16px，電腦紙內留白 30/34px。觸控目標至少 44px（按鈕 46px）。
- **A4 報告**：794×1123，`@page{size:A4;margin:0}`。
  - 順序：標題和 Key judgments（機率尺）→ 地圖 Exhibit → 表格（Stakeholder / Stance / Influence / Next move / Sources）→ 進入路徑和計畫 → 來源清單（等級 + 查證日期）。
  - 列印時拿掉桌面底色和紙張陰影。

## 元件
- **等級章**（`.grade`）：Admiralty A–F / 1–6，Courier Prime 12px 粗體，1.5px 黑框。每個來源、提醒、表格來源欄都要有。
- **ICD 機率尺**（`.ruler`）：七段寬度 5/15/25/10/25/15/4，從 almost no chance 到 almost certain；只亮一段，用黃色斜紋。旁邊一定寫用語和區間（例：likely (55–80%)），信心度另寫一句。
- **塗黑條**（`.redact`）：團隊人脈的聯絡人姓名一律顯示成 4.6em 的實心黑條，`aria-label="name withheld"`。
- **Exhibit 圖框**：圖上方寫「Exhibit N」加一句結論，圖下方寫怎麼讀和來源（例：Source: Portolan analysis of 126 sources, sample data）。
- **編號段落**（`.paras`）：判斷和理由用 1. 2. 3. 編號，方便會議中引用。
- **按鈕**：主要是黑底白字，hover 時底部出現 4px 黃條；次要是白底黑框，hover 時淡黃。按下有回饋（例：Added to tracker、Copied、轉圈的重新整理）。
- **焦點**：3px 黑框加 6px 黃色外暈。

## 還沒做到 Estimate 上的元件（第一個 UI 切片時補上，做法見 `design/directions/color-admiralty/direction.md` 的「10/31 加入的元件」）
- 手機地圖的詳情：用底部面板（Apple Maps 式）還是照設計稿放在地圖下方，尚未決定。
- 固定的動作列：View evidence、Add to tracker。
- Find a stakeholder：⌘K 或 /。
- 聚焦計數提示。
- 載入中、空資料、錯誤三種狀態：圖示 + 標題 + 一句原因 + 一兩個動作。這裡改用黑白：錯誤用黑框，不用紅色。

## 文字
- 介面用白話：「Contact these three first, in order」「Open stakeholder map」「Add to tracker」。情報用語（Key judgment、Exhibit、等級）只當標籤，按鈕不用。
- 可能性一律用 ICD 七個用語之一加區間；不寫「很可能」這類沒定義的字。
- 不用 [CLIENT] 這類佔位字；查不到就寫 date unverified 或 Unverified。
- 範例資料每頁都要標 Sample data。

## 原始碼
可以直接參考 `design/directions/estimate/01-home.html`、`02-map.html`、`05-report.html`，裡面有 CSS token 和地圖程式（`project()`、拖曳、matrix 切換）。
