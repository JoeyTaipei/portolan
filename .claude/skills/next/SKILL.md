---
name: next
description: 照 docs/workflow.html 帶我做下一步：查目前進度，只給一個步驟。我輸入 /next 或說「下一步」時使用。
---
1. 讀 docs/workflow.html 的步驟（ol.steps 裡每個 checkbox 和它的文字、指令、說明）。已經有 `checked` 的算做完。
2. 對還沒勾的步驟，先自己查能查的狀態，不要問我：工具和登入（brew、node、gh auth、vercel、claude plugin list、claude mcp list）、
   `.env.local` 每個變數有沒有值（只說有沒有，絕不印出值）、檔案在不在（docs/spec.md、docs/plan.md、design/direction.md、docs/decisions/）、
   git 分支和 PR 狀態。查到已經完成的，在 workflow.html 那個 input 加上 `checked`。
3. 照頁面順序找第一個還沒做、前面需要的步驟都做完的步驟。標「你」或「創辦人」的步驟要人做；標 Claude 的步驟問我要不要現在由你做。
4. 只回這一步，格式：
   - **第 N 步：標題**（你／創辦人／Claude，大約幾分鐘）
   - 在哪裡做（哪個 App、網站或 session）
   - 要做什麼：最多 5 個短步驟；要貼的指令或提示放在程式碼區塊
   - 做完的樣子：我怎麼知道做好了
   - 可以同時做的另一件事（只在真的不互相卡住時寫，最多一件）
5. 我說「好了」或再輸入 /next 時，先確認上一步真的完成（能查就查），勾起來，再給下一步。卡住就幫我解決那一步，不要跳過。
6. 不叫我把金鑰或密碼貼進對話；要貼金鑰時叫我自己打開 .env.local。
