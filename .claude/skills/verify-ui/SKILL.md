---
name: verify-ui
description: 在瀏覽器走一遍目前分支的畫面，和 design/ 的設計稿比對並修正。只在我輸入 /verify-ui 時使用。
disable-model-invocation: true
---
1. 讀 CLAUDE.md、docs/spec.md，和 docs/plan.md 裡這個切片的驗收條件。
2. 跑 npm test 和 npm run build，失敗就先修好。
3. 在背景執行 npm run dev（在 worktree 裡用 PORT=3001 npm run dev）。
4. 用手邊的瀏覽器工具（桌面版的內建瀏覽器，或 Playwright MCP）打開這個切片的每個路由：
   - 390×844 截圖，和 design/screens/ 同編號的圖比對；顏色、間距、字級的細節讀 design/mockup/src/ 同名的 template
   - 1280 寬再截一張，確認桌面版面合理
5. 走一遍 spec 的核心流程，列出：跑版、顏色／字體／間距和 design/direction.md 不同、錯誤訊息、和 spec 不一致的地方。
   再跑 docs/research/generic-risks.md 最後的檢查清單：AI 預設風、佔位字、沒有來源的分數、沒有下一步的利害關係人。
6. 觸發每頁的載入中、空資料、錯誤狀態（慢網路、斷網、不存在的 dossier id），確認都有處理。
7. 逐項修正，修完再走一遍確認。
8. 核心流程穩定後，寫成 tests/e2e/ 裡的 Playwright 測試。
9. 只用範例資料和假 Email，不輸入真實資料或金鑰。除非這個切片就是研究引擎，否則不要真的呼叫 Parallel 或 Claude API。
10. 回報：修了什麼、還要我親自看的頁面。
