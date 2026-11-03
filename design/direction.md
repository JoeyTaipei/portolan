# Portolan 設計方向：Estimate（11/3 選定，取代 Admiralty chart）

> 已定案（Joey 11/3：版面和配色都用 Estimate，3D 地圖和 Power matrix 比較好）。每個 UI 切片都照這份做。範例畫面在 `design/directions/estimate/`（01 首頁、02 地圖、05 A4 報告），電腦版和手機版都看得到。

## 一句話
情報簡報本：灰色桌面上放一張白紙，黑墨加一支螢光筆。可信度本身就是視覺：ICD 203 可能性用語和機率尺、Admiralty 來源等級、編號段落、Exhibit 圖框，私人聯絡人的名字用塗黑條遮住。

## 螢幕寬度（電腦優先）
- **主要寬度 1440px 和 1920px**：所有版面先在這兩個寬度設計和驗收。
- **最小寬度 1280px**：三欄版面在 1280 仍然完整，不能有橫向捲動。
- **手機 390px**：只要能讀、點得到（觸控目標 44px），單欄，能看 dossier 和 A4 分享連結。
- 斷點：`≥1024px` 三欄；`≥1600px` 兩側欄加寬；`<1024px` 單欄。

## 字體
- **Public Sans**（美國政府用字，400/600/800/900 + 斜體）：內文和標題。
- **Courier Prime**（400/700）：只用在有打字機感的地方，包括等級章、來源編號、引用、頂端橫幅、機率尺刻度、Exhibit 標號和草稿文字。
- **Noto Sans TC**：繁中字，接在 Public Sans 後面當備用字體（`font-family: var(--font-public-sans), var(--font-noto-tc), sans-serif`）。
- 用 `next/font/google` 載入，取代 IBM Plex Sans Condensed。除了上面三個，不加其他字體。

| 用途 | 字體 / 大小 / 字重 |
|---|---|
| 品牌字 | Public Sans 40px / 900，字距 −.025em |
| dossier 標題 | Public Sans 30px（≥1440 時 40px）/ 900，字距 −.02em |
| 區塊標題 | Public Sans 13–15px / 800 |
| Key judgment、Exhibit 標號 | Courier Prime 12.5px / 700 |
| 內文 | Public Sans 15px / 400，行高 1.5；段落最寬 68ch |
| 引用、來源 | Courier Prime 11.5–12.5px，`--ink2` |
| 等級章 | Courier Prime 12px / 700 |

## 配色 token
所有顏色都是 CSS 變數，畫面程式不直接寫色碼。

| Token | 值 | 用途 |
|---|---|---|
| --desk | #E2E5E8 | 頁面底色（桌面） |
| --paper | #FFFFFF | 紙、卡片、次要按鈕的底 |
| --ink / --ink2 | #1A1C20 / #565B62 | 文字、線、主要按鈕、塗黑條 |
| --ink3 | #8E949B | 停用、提示文字（只用在 ≥14px 的字） |
| --rule | #C8CCD1 | 細線 |
| --faint | #F2F3F5 | 分頁底、草稿區 |
| --hi | #FFE14A | 螢光筆：先聯絡、關鍵句、目前分頁、焦點外框、機率尺亮的那段 |
| --hi2 | #FFF3A8 | 次要按鈕 hover、選取列 |
| --hi-edge | #F5D21F | 機率尺斜紋的深色線 |

**只有一個強調色。** 不用紅、綠、藍。錯誤狀態用黑框加文字說明，不用紅色。

## 圓角
2px（按鈕、等級章、欄位）。8px 只用在分頁「活頁夾標籤」的下緣。其他一律直角。

## 地圖（3D 影響力地圖 + Power matrix）
- SVG 偽 3D，照 `estimate/02-map.html` 的 `project()` 和拖曳做法：可以旋轉、傾斜、有透視，← → 鍵也能轉。不用 three.js。
- 3D 地圖和 Power matrix 用同一組節點，切換時有動畫在兩種排法之間移動（`S.mix` 從 0 到 1）。
  - Power matrix 的橫軸是 support −100 到 +100，縱軸是 influence，四個象限的標籤是 Blockers、Champions、Monitor、Allies to grow。
- 地圖放在 **Exhibit 圖框**裡：
  - 上方寫「Exhibit N」和一句結論，例如：Three contacts open the procurement route; the prime contractor is the hinge.
  - 下方寫怎麼讀這張圖和來源，例如：Size shows influence; fill shows stance. Source: Portolan analysis of 126 sources, sample data.
- 先聯絡的三個用黃色圓底標出、依序編號。團隊人脈用黑色虛線；尚未接受邀請的成員用虛線外框。
- 背景只用細格線和 `--paper`，不畫海、陸地或漸層。

## 立場編碼（不靠顏色，黑白印也看得懂）
- **實心黑 = 支持**
- **空心 = 中立**
- **斜線網底 = 反對**：SVG pattern `#hatch`，45° 細線
- **空心菱形 = 事件**

節點大小代表影響力。圖例和每個清單列都用同一個小記號（`small(st)`），旁邊寫立場文字。

## 版面
- **電腦**：5 個分頁（Dossiers、Map、Tracker、Network、Docs）做成右側直立的活頁夾標籤，寬 46px、`writing-mode: vertical-rl`；目前那頁左邊有 4px 黃條。頂端是黑色橫幅，Sample data 用黃底標籤。
- **首頁**三欄：
  - 1280–1599px：`290px | 1fr | 300px`
  - ≥1600px：`320px | 1fr | 380px`
  - 左欄：刊頭、目錄、dossier 清單。
  - 中欄：一張「紙」，由上到下是 memo 欄位、標題、三格指標、Key judgment 加機率尺、編號段落。
  - 右欄：來源註記。
- **地圖頁**三欄，高度撐滿視窗、三欄各自捲動：
  - 1280–1599px：`290px | 1fr | 370px`
  - ≥1600px：`320px | 1fr | 440px`
  - 左欄：3D / Power matrix 切換、團隊人脈開關、分類、Find a stakeholder、先聯絡的三個。
  - 中欄：Exhibit 地圖。
  - 右欄：詳情和全部清單。
  - 1920 寬時，多出來的空間給中間的地圖，不拉長文字行。
- **手機 390px**：單欄，照 `design/screens/` 的資訊順序；5 個分頁固定在底部，目前那頁上緣有 3px 黃條。
- **間距**：4px 基準。電腦紙內留白 30/34px（≥1600px 時 40px）。手機左右留白 16px。觸控目標至少 44px，按鈕 46px。
- **紙張效果**：只用細線偏移做出堆疊感（`box-shadow: 0 1px 0 var(--rule), 0 3px 0 -1px var(--paper), 0 4px 0 -1px var(--rule)`），不用模糊陰影。

## A4 報告
- 794×1123，`@page{size:A4;margin:0}`，照 `estimate/05-report.html`。
- 由上到下：
  1. 標題和 Key judgments（附機率尺）
  2. 地圖 Exhibit（固定角度）
  3. 表格：Stakeholder / Stance / Influence / Next move / Sources
  4. 進入路徑和 7 天計畫
  5. 來源清單（等級章 + 查證日期）和分享連結
- 列印時拿掉桌面底色和紙張陰影。

## 可信度元件
- **等級章**（`.grade`）：Admiralty A–F / 1–6，Courier Prime 12px 粗體，1.5px 黑框。每個來源、提醒和表格的來源欄都要有。
- **ICD 機率尺**（`.ruler`）：七段，寬度 5/15/25/10/25/15/4，從 almost no chance 到 almost certain。只亮一段，用黃色斜紋。旁邊一定寫出用語和區間，例如 likely (55–80%)；信心度另外寫一句。不用「很可能」這類沒有定義的字。
- **塗黑條**（`.redact`）：團隊人脈的聯絡人姓名一律顯示成 4.6em 的實心黑條，加 `role="img"` 和 `aria-label="name withheld"`。
- **編號段落**（`.paras`）：判斷和理由用 1. 2. 3. 編號，方便開會時引用。
- **Exhibit 圖框**（`.exhibit`）：見上面「地圖」。
- **重點標記**：關鍵句用 `<mark>` 螢光筆效果，每段最多一句。

## 其他元件
- **按鈕**：
  - 主要按鈕：黑底白字，hover 時底部出現 4px 黃條。
  - 次要按鈕：白底黑框，hover 時變淡黃。
  - 按下後要有回饋，例如 Added to tracker、Copied、轉圈的重新整理。
- **焦點**：3px 黑框加 6px 黃色外暈。
- **固定的動作列**：詳情裡的 View evidence 和 Add to tracker 用 `position:sticky; bottom:0`，捲動時一直看得到。
- **Find a stakeholder**：combobox + listbox，用 ⌘K、Ctrl K 或 / 開啟。上下鍵選、Enter 選取、Esc 清除。沒有結果時給一個具體的建議。
- **聚焦計數**：選取後提示「名稱：顯示 N 個直接關係，按 Esc 或再點一次恢復全部」。
- **載入中、空資料、錯誤**：圖示 + 標題 + 一句原因 + 一兩個動作，全部用黑白。
  - 載入中：一條條列出找到的來源，加上進度條（黃色）。
  - 空資料：給「清除篩選」。
  - 錯誤：用黑框，說明資料沒有遺失，並給「重試」。
- **手機詳情面板**：未決定。可以用底部面板，也可以照設計稿放在地圖下方。電腦版詳情一律在右欄。

## 該做 / 不該做
- 做：黃色只用在「要你行動」的東西。
- 做：用細線、粗線、網底分層。
- 做：每個數字和日期旁邊都有來源編號和等級章。
- 不要：加第二個強調色。
- 不要：在黃底上放灰字；黃底一律配 `--ink`。
- 不要：用全大寫寫內文；不要用 Courier Prime 寫長段落。
- 不要：用圓角卡片加灰色陰影（shadcn 預設樣子）。

## 文字
- 介面用白話：「Contact these three first, in order」「Open stakeholder map」「Add to tracker」。情報用語（Key judgment、Exhibit、等級）只當標籤，不放在按鈕上。
- 不用 [CLIENT] 這類佔位字。查不到就寫 date unverified 或 Unverified。
- 用範例資料的頁面，每頁都要標 Sample data。

## 原始碼
直接參考 `design/directions/estimate/01-home.html`、`02-map.html`、`05-report.html`，裡面有 CSS token、地圖程式（`project()`、拖曳、matrix 切換）和 A4 列印樣式。
