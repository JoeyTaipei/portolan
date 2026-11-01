# 創辦人回答（2026-10-30）

來源：創辦人在 Google 文件填的 20 題問卷（docs/founder-questions.md）。以下是原文，沒有改寫。寫進 design/intent.md 的方式和還不清楚的地方記在最後。

```text
Questions for the founder — Portolan
We're launching on 3 Nov (noon, Perth time). Please answer the ★ questions by 31 Oct; the rest can wait until 2 Nov.
Every question has a suggested answer. If it's fine as it is, just write "OK".
Already confirmed, so not asked again: the one-page report is very valuable to customers.


A. Customers
1. ★ Who is the first customer? Our guess: the founder or business-development lead at a US or European drone / counter-drone startup that wants to sell to Taiwan but has no one there yet. Is that right? If not, who is it?
I'm planning to reach out to more startups. We can start from this use case, but any type of startup could be in our use case.
Answer:
2. ★ Name 3–5 real people who fit. For each: name, company, role, how you know them, and whether they've agreed to try Portolan.
Answer: working on it.
3. ★ For the person who needs this most: what gets them promoted, what gets them fired, and what about Taiwan keeps them up at night? Ideally in words you've heard them say.
Answer:
It could be that the market is too hard to enter due to the language barrier.
4. How do they break into Taiwan today (AmCham, TAITRA, a consultant, cold emails)? What does it cost them in money and time, and what do they lose when it goes wrong (a tender, months, a deal)?
Answer: 
Through the chamber or people they know. Deals, time, market niche. 
5. Could any of them try a real dossier before 3 Nov, so we can mention it in the YC application?
Answer: 
Yes.
B. For the YC application
6. ★ What's the strongest sign that someone really wants this? Not "they said it's interesting", but someone who has paid, asked when they can use it, or would be upset if it went away.
Answer: paid or agreed to pay 
7. Why are you the right person to build this? What experience gives you an inside view of Taiwan, defense, or entering new markets?
Answer: my role - I did market entry reviews, received international affairs training and now at global uav academy meeting suppliers and learning the industry.
8. Do you agree with each of these? Write agree / disagree / not sure next to each one.
• "US and European drone startups going to Taiwan" is enough customers to start with.
Agree
• Experts will stay with us because reviewing documents gives them steady income.
Agree
• Customers will spend 30 seconds after each meeting telling us how it went.
Agree
Answer:
C. What the app shows
9. ★ Should the app cover only Taiwan for now, with the other countries shown as "coming soon"? Suggested: yes, Taiwan only.
Answer: yes
10. ★ The four headline scores. Do these meanings match what you want the customer to learn? Fix any that are wrong.
• Entry readiness: how open the Taiwan market is to you right now
• Opposition: how much of the influential power in this market is against you
• Window to act: how many days until the next deadline that matters (a budget vote, a tender closing)
• Confidence: High / Medium / Low with the number of sources, not a percentage like "94%"
High
Answer:
11. ★ The demo dossier (what YC partners will see) uses real Taiwan government agencies, but their positions and scores are invented. Which do you prefer?
• (a) Real agencies, but only facts that come with a source, no named individuals, and positions marked "illustrative"
• (b) Keep it as it is, labelled "Sample data"
• (c) Make everything fictional, agency names included
Suggested: (a).
Answer:
12. Are these mockup figures real, and do you have sources for them: "48,750 drones procured", "5.1 GHz detection gap", "US$7B+ drone budget over 6 years"? If not, we'll take them out.
Answer: they are not real.
13. ★ Do you have any real examples of a meeting briefing, risk report or monthly watch-list update (with client details removed)? Please send them. If not, we'll draft the formats from the mockup for you to approve.
Answer: I do. 
D. Experts
14. ★ Who are the first 2–3 experts who'll review documents before they go to customers? For each: name, background (lawyer, former official, analyst), whether they've agreed and signed an NDA, and what we pay them per document.
Answer: I'll ask.
15. ★ The app promises expert review "within 24 hours". Can they really do that, including weekends and across time zones? If not, what can we promise?
Answer: no. within 4 weeks is better.
16. ★ Until the experts are signed up, who reviews documents? If it's you, the document will say "Reviewed by [your name]" instead of "Expert reviewed". OK?
Answer: yes you're right.
E. Money
17. ★ What's the total budget for November, and the most we should spend per dossier? Suggested: about US$15 per dossier, at most 2 dossiers per person per day, and 30 a day in total.
Answer: $4000+ per dossier 
* if it's limited data 
18. ★ During the pilot, are meeting briefings (planned at US$300–800) and risk reports (US$1.5k–5k) free, discounted, or full price? What pricing should go in the YC application? 
Answer: full price with discount
F. Legal and name
19. ★ The "who on our team already knows someone there" feature stores other people's contact details, so a lawyer should look at it first, including European privacy law (GDPR). Do you have a lawyer, and can they review it before 3 Nov? If not, suggested: show the feature in the demo only, and turn it on for customers after the lawyer signs off.
Answer: I don't but I can ask - I have contacts.
20. ★ Do you already own a web address for Portolan (e.g. portolan.ai)? Which email address should customer emails come from? Has anyone checked that nobody else uses "Portolan" as a company or brand name?
Answer: No. 


For everything else (logo, China, other industries, how long research takes, how many stakeholders per dossier), we'll use our suggested answers unless you tell us otherwise.
100 would be good.
```

## 寫進 intent.md 的決定
- 使用者：先從美國／歐洲無人機和國防新創開始，但任何要進台灣的新創都能用。痛點是語言障礙；現在靠商會或熟人，失敗時損失交易、時間和市場利基。
- 市場：只有台灣，其他國家顯示 coming soon、不能選；China 不出現。
- 四個指標的意思照問卷第 10 題（回答「High」，當作同意）。
- 設計稿的「48,750 架」「5.1 GHz」「70 億美元」：創辦人說不是真的。**2026-11-01 更正**：查證後 48,750 架是真的（軍備局 2025 年 7 月計畫）；70 億美元不準（提案 NT$2,100 億卡住，通過的是 NT$634 億）；5.1 GHz 找不到來源。見下面「後續」。
- 範例 dossier：沒回答，先用建議（a）；2026-11-01 改成下面「後續」的做法。
- 專家簽約前由創辦人審稿，文件寫「Reviewed by 姓名」，不寫 Expert reviewed。
- 定價：顯示原價，試辦客戶打折。
- 團隊人脈：律師還沒找，先只在範例 dossier 開放。
- 每天上限：沒回答，用建議（每個 Email 2 份、全站 30 份）。

## 還不清楚（要再問創辦人）
1. 專家審稿「within 4 weeks」：是 4 週，還是 4 天／4 個工作天？4 週會讓會前簡報趕不上會議。
2. 「$4000+ per dossier」：看起來是賣給客戶的價格，不是我們每份研究的花費上限。11 月總預算也沒回答。
3. 「100 would be good」：是指每份 dossier 100 個利害關係人嗎？設計稿是 48 個，100 個會更久更貴。
4. 試辦打幾折？
5. 第 10 題的「High」是同意四個指標的意思，還是別的？
6. 還在等：3–5 個真實使用者名字、2–3 位專家、真的文件範例、律師、網域和名稱查核。

## 後續（2026-11-01，Joey 轉述創辦人的回答和 grill 討論）
- YC 申請內容全部是真的；只有簽約或付費的試辦算使用者。
- demo 用真實的機構和公司、正確的資料，不編任何東西。沒有來源的標「未驗證」，沒有表態的支持度是 Unknown。
- 數字更正：48,750 架可以用（附來源）；預算寫「提案 NT$2,100 億、通過 NT$634 億」；5.1 GHz 不用，除非創辦人有來源。
- 第一批使用者：創辦人認識的新創創辦人，聯絡 5–10 人；上線前第一批 dossier 由團隊手動交付（跑研究前先報費用）。
- 評分和簡報方法：見 `0002-scoring-and-brief.md`。
- 還沒回答：架構問題、商業模式（Free 送 dossier 和「$4000+ / 份」衝突），以及 `docs/founder-questions.md` 的追問。
