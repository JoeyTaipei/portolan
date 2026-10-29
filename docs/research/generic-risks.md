# 什麼會讓 Atlas 看起來很普通（2026-10-29）

## 1. 視覺：設計稿本身就是 AI 預設風
設計稿用米色底（#F3EEE4）+ 赤陶橘（#A8441F）+ 襯線標題（Newsreader）+ Inter。這正是 2026 年被點名的「有品味的 AI 預設」：米色 + 赤陶 + 襯線，和紫色漸層、shadcn 灰卡片、置中 hero + 三張圓角卡片並列為最常見的 AI 臉。原因是模型在沒有明確方向時會挑訓練資料裡最常見的選擇。解法不是換顏色，而是先決定一個從題材本身長出來的方向，再照它做。
- 動作：Spec 之後做 3–5 個設計方向（見 workflow 第 3 步），選一個寫進 `design/direction.md`，之後所有畫面照它做。

## 2. 產品：看起來像「ChatGPT 包一層」
- 報告本身不是護城河（「Atlas 建 App 流程指南」已經講過）。只有摘要和分數的畫面，評審會想「我自己問 ChatGPT 就好」。
- 要讓人一眼看出別人沒有的東西：
  - **每個說法都點得到來源**：網址、摘錄、查證日期。不是頁尾一串連結。
  - **具體到可以行動**：人名或單位、為什麼現在、下一步、在哪見面。範例 08 會前簡報夠具體（5.1 GHz 偵測缺口、48,750 架採購案），首頁和地圖要做到同樣程度。
  - **會後回報真的改變分數**：成果資料是護城河，MVP 就要看得到「這個分數因為你上週的會議變了」。
- 別做：聊天框當主畫面、沒有來源的分數、只有部會名稱的利害關係人清單。

## 3. 數字看起來像假的
「94% confidence」「72/100 entry readiness」如果點下去沒有算法和來源，懂行的人會覺得是編的。
- 每個分數旁邊都能點開：怎麼算（`docs/scoring.md`）+ 用到哪幾個來源。
- 樣本小就直說（「3 個來源」），不要四捨五入成漂亮的百分比。

## 4. 示範流程的破綻
- 設計稿留著 `[CLIENT]`、`[DATE]`、`[EXPERT NAME]`。demo 和範例 dossier 要換成真實（或明說虛構）的內容。
- 研究跑幾分鐘時只有轉圈圈，看起來像壞掉。進度畫面要一條一條顯示找到的來源和利害關係人。
- 空狀態、錯誤狀態沒設計，第一次用的人就卡住。

## 5. 3D 地圖變成花招
地圖要回答「我先找誰」：預設高亮 3 個建議先接觸的節點，點了就有下一步。Power Matrix 是決策工具，比旋轉更重要；手機上轉不動的時候要能用清單看。

## 檢查清單（每個切片 /verify-ui 時跑）
- [ ] 顏色、字體、版面照 `design/direction.md`，沒有掉回 shadcn 預設或米色 + 赤陶
- [ ] 沒有 `[CLIENT]` 這類佔位字、lorem、「Sample data」以外的假資料
- [ ] 每個分數和說法點得到來源
- [ ] 每個利害關係人都有具體的下一步
- [ ] 載入中、空資料、錯誤三種狀態都有設計過，不是預設樣式

## 來源
- [Why AI Design Looks Generic (2026) — superdesign.dev](https://superdesign.dev/blog/why-ai-design-looks-generic)
- [avoid-ai-design（包含米色 + 赤陶的「有品味」預設）](https://github.com/funboy322/avoid-ai-design)
- [AI Slop Design fix guide — vibecodekit.dev](https://vibecodekit.dev/ai-slop-design)
- [AI Slop Fonts and Gradients — 925studios](https://www.925studios.co/blog/ai-slop-design-tells)
- [AI wrapper defensibility 2026 — buildmvpfast](https://www.buildmvpfast.com/blog/ai-wrapper-startup-defensible-business-2026)
- [S&P Global geopolitical risk / market entry](https://www.spglobal.com/market-intelligence/en/solutions/geopolitical-risk-analysis)：大型資料商也做「市場進入 + 政府利害關係人」，所以 Atlas 要贏在具體、可行動、成果資料
