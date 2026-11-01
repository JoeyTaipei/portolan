# Portolan 設計方向：Admiralty chart（11/1 選定）

> 已定案（Joey：「CHOOOSE Admiralty chart」）。每個 UI 切片都照這份做。結構來自 Sounding 方向，配色是 Admiralty chart，可信度元件借自 Estimate。範例畫面在 `design/directions/color-admiralty/`（01 首頁、02 地圖、05 A4 報告）。

## 一句話
真正的海圖：白色水面、赭黃陸地，藍色深度帶表示影響力（越深越有影響力），洋紅標路線和提醒（和真的海圖一樣），紅色表示反對。螢幕和列印用同一組顏色。每個判斷都附 Admiralty 來源等級和 ICD 機率用語，讓專家一眼看出可信度。

## 螢幕寬度（電腦優先）
- **主要寬度 1440px 和 1920px**：所有版面先在這兩個寬度設計和驗收。
- **最小寬度 1280px**：三欄版面在 1280 仍然完整，不能有橫向捲動。
- **手機 390px**：只要求看得懂、點得到（觸控目標 44px），內容順序照 `design/screens/`，不另做精修。
- 斷點：`≥1024px` 三欄版面；`≥1600px` 兩側欄加寬（見「版面」）；`<1024px` 單欄。

## 字體
只用 **IBM Plex Sans Condensed** 一個家族（400/500/600/700 + 斜體）。數字用斜體，像海圖上的水深數字。不加第二個字體；數字靠 `font-variant-numeric: tabular-nums` 對齊，只套用在數字上。

| 用途 | 大小 / 字重 |
|---|---|
| 品牌字（首頁） | 電腦 40px（手機 50px）/ 700 / 全大寫，字距 .02em |
| 頁標題（dossier 名） | 28–31px（1920 寬可到 36px）/ 800 |
| 區塊標題 | 15–16px / 700 |
| 內文 | 15px / 400，行高 1.45；段落最寬 68ch |
| 標籤、圖例 | 12–13px / 500–600 |
| 數字（指標） | 24–34px / 600 / 斜體 / tabular-nums |

## 配色 token
所有顏色都是 CSS 變數，畫面程式不直接寫色碼。完整清單在 `color-admiralty/01-home.html` 開頭的 `:root`。

| Token | 值 | 用途 |
|---|---|---|
| --bg / --stage | #FCFDFB | 海圖白（水面） |
| --panel / --panel2 | #FFFFFF / #EEF5FA | 卡片、hover |
| --ink / --ink2 | #14233A / #53627A | 文字 |
| --rule / --rule-strong | #D3E0EA / #14233A | 線（強線用墨色，像海圖的細黑線） |
| --land | #EAD58A | 陸地（赭黃），只出現在海圖裡 |
| --water1 / --water2 | #DCEBF5 / #B5D3EA | 海岸淺水帶 |
| --depth1 / 2 / 3 | #D6E8F5 / #8DBDE2 / #2F6FAE | 影響力低／中／高（節點下方的水深圓點、Power matrix 橫帶） |
| --rhumb | #4F7396 | 羅盤線、羅盤 |
| --sup（深綠） | #0F6E5A | 支持 |
| --res（紅） | #B23B2E | 反對 |
| --neu | #14233A 空心 | 中立 |
| --evt | #14233A | 事件 |
| --act / --route / --notice（洋紅） | #C2187A | 先聯絡路線、提醒、下一步 |
| --notice-text / --notice-bg | 見 `:root` | 白底上的提醒文字（不用黃字配白底） |
| --hot | #14233A | 選取的節點和連線 |
| --stamp | #1D4E89 | 等級章 |
| --icd-on | #5E9FD3 | ICD 尺亮的那段 |
| --redact | #14233A | 塗黑條 |

## 圓角
2px（章）、4px（篩選）、6px（按鈕、欄位）、8px（卡片、地圖框）。

## 地圖樣式
- SVG 偽 3D，照 `02-map.html` 的 `project()` 做：旋轉、傾斜 0.38、透視 `f = 2.8/(2.8+z)`，可以拖曳；← → 鍵也能旋轉。不用 three.js。
- 海圖元素：
  - 海圖格線框：頁面上緣有黑白刻度條，電腦版四邊都有。
  - 羅盤和羅盤線，用 `--rhumb`。
  - 海岸淺水帶，赭黃陸地。
  - 節點正下方的海床上有水深圓點：越藍、越大 = 影響力越高。
- 3D 地圖和 Power matrix 可以切換；matrix 的背景是三條深度橫帶，最深的在上面。
- 先聯絡的三個用洋紅虛線連起來（`--route`）。團隊人脈用虛線，暖路徑會被強調。

## 立場編碼（不能只靠顏色）
用海圖浮標的形狀：
- **三角錐 = 支持**
- **方塊 = 反對**
- **空心圓 = 中立**
- **菱形 = 事件**

影響力有兩種編碼：節點大小，加上水深圓點。每個清單列和圖例都用同一個小記號，旁邊寫出立場文字。

## 該做 / 不該做
- 做：洋紅只用在三件事：先聯絡路線、提醒、下一步。羅盤線用藍灰，不用洋紅。
- 做：海圖白當底。赭黃只用在海圖的陸地，不拿來當卡片或按鈕的底色，避免變成米色 + 暖色的 AI 預設風。
- 做：深度藍只表示影響力。支持用深綠，避免藍色節點融進藍色水深。
- 不要：把藍色元素放在藍色深度帶上。
- 不要：把紅色用在反對以外的地方。錯誤訊息例外，因為錯誤也算「擋路」。
- 不要：用陰影或漸層分層，改用細線和色塊。唯一的例外是手機底部面板的陰影。

## 版面
- **電腦首頁**三欄：
  - 1280–1599px：`300px | 1fr | 340px`
  - ≥1600px：`320px | 1fr | 400px`
  - 左欄：品牌、導覽、dossier 清單和新增表單。
  - 中欄：全台海圖，只放有地址的利害關係人。
  - 右欄：dossier 卡片、重點判斷、提醒。
- **電腦地圖頁**三欄：
  - 1280–1599px：`290px | 1fr | 380px`
  - ≥1600px：`320px | 1fr | 440px`
  - 左欄：切換、篩選、Find a stakeholder、先聯絡的三個、團隊。
  - 中欄：地圖撐滿高度。
  - 右欄：詳情和全部清單。
  - 三欄各自捲動，頁面本身不捲。1920 寬時，多出來的空間給中間的地圖，不要拉長文字行。
- **上方一列**：品牌、5 個分頁（Dossiers、Map、Tracker、Network、Docs）、Sample data。
- **手機 390px**：單欄，照 `design/screens/` 的順序，5 個分頁固定在底部。
  - 首頁：品牌列 → 標題 → 6 格導覽 → dossier 卡片（含北台灣小海圖）→ 重點判斷 → 提醒 → 選 dossier。
  - 地圖頁：標題 → 3D/Matrix 切換 → 團隊人脈開關 → 地圖 → 旋轉控制和圖例 → 分類 → 詳情 → 先聯絡的三個 → 全部清單。
- **間距**：4px 基準。電腦欄內留白 18–24px（≥1600px 時 24–32px）。手機左右留白 16–18px。觸控目標至少 44px。
- **A4 報告**：794×1123，`@page{size:A4;margin:0}`，內距 42/46/32px，外面一圈 6px 刻度框，裡面一條 1px 框線。
  - 由上到下：標題框加品牌和可信度框 → 摘要和三個指標（含 ICD 尺），旁邊是固定角度的地圖 Exhibit → 前 5 名表格（來源編號 + 等級章）→ 進入路徑、7 天計畫或見面地點、風險 → 來源清單（等級章 + 查證日期）和分享連結。

## 可信度元件（借自 Estimate）
- **等級章**（`.stamp`）：Admiralty 等級 A1–F6，雙框、轉 −3°、粗體 11.5px，顏色 `--stamp`。每個來源、提醒和表格的來源欄都要有。
- **ICD 機率尺**（`.icd`）：七段，寬度 5/15/25/10/25/15/4，從 almost no chance 到 almost certain。只亮一段，顏色 `--icd-on`。旁邊一定寫出用語和區間，例如 likely (55–80%)；信心度另外寫一句。可能性不用「很可能」這類沒有定義的字。
- **塗黑條**（`.ins-redact`）：團隊人脈裡的聯絡人姓名一律顯示成實心條，顏色 `--redact`，加上 `role="img"` 和 `aria-label="name withheld"`。
- **編號段落**：重點判斷和理由用 1. 2. 3. 編號，方便開會時引用（例：「第 2 點的來源是？」）。範例頁還沒有，第一個切片照 Estimate 的 `.paras` 做：26px 的編號欄加內文。
- **Exhibit 圖框**：每張地圖或圖表的上方寫「Exhibit N」和一句結論；下方寫怎麼讀這張圖，以及來源（例：Source: Portolan analysis of 126 sources, sample data）。範例頁還沒有，第一個切片照 `design/directions/estimate/02-map.html` 的 `.exhibit` 做，換成 Admiralty 的 token。

## 其他元件
- **先聯絡**：用 `--route` 虛線連起 P.REC 的三個；詳情面板的「Recommended action」左邊有 4px 的 `--act` 色條。
- **按鈕**：主要按鈕用 `--btn-bg`。`--act` 只給和「下一步」相關的那一個動作。按下後要有回饋，例如「Added to tracker」、「Copied」、轉圈的重新整理。

## 10/31 加入的元件（向知名產品借的做法）
- **手機詳情面板：未決定。** 兩個選項，都在 `02-map.html` 可以用 Details layout 切換，或加 `?layout=sheet|below` 預覽：
  - (a) Apple Maps 式底部面板：固定在分頁列上方，有三個高度：收合 168px、一半、全高 80dvh。點節點自動升到一半，把手可以拖。
  - (b) 照設計稿，詳情放在地圖下方。
  - 電腦版不受影響，詳情一律在右欄。
- **固定的動作列**（Felt 面板）：詳情裡的「View evidence」和「Add to tracker」用 `position:sticky; bottom:0`，捲動時一直看得到。
- **Find a stakeholder**（Linear ⌘K）：combobox + listbox，用 ⌘K、Ctrl K 或 / 開啟。上下鍵選、Enter 選取、Esc 清除。沒有結果時給一個具體的建議。
- **聚焦計數**（Kumu focus）：選取後提示「名稱：顯示 N 個直接關係，按 Esc 或再點一次恢復全部」。
- **Non-ideal state**（Blueprint）：`.nis` = 圖示 + 標題 + 一句原因 + 一兩個動作。
  - 載入中：一條條列出找到的來源，加上進度條。
  - 空資料：給「清除篩選」。
  - 錯誤：說明資料沒有遺失，並給「重試」。首頁的錯誤狀態 = 達到每日研究上限。
  - 預覽：任何頁面網址加 `?state=loading|empty|error`。

## 文字
- 介面用白話：「Contact these three first, in order」「Open stakeholder map」「Add to tracker」。航海用語只出現在視覺上，不放在按鈕上。
- 不用全大寫標籤（品牌字除外），不用 [CLIENT] 這類佔位字。查不到就寫 date unverified 或 Unverified。
- 用範例資料的頁面，每頁都要標 Sample data。

## 原始碼
直接參考 `design/directions/color-admiralty/01-home.html`、`02-map.html`、`05-report.html`，裡面有 CSS token 和地圖程式。編號段落和 Exhibit 圖框參考 `design/directions/estimate/`。
