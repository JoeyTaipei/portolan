// 繁中 for the sample's home-page conclusions (SHELL-4, I18N-8). Sample data.
//
// Translated by hand by the team, not by a model call. Keys are the exact English sentences in
// sample-dossier.ts; the market page shows these in 繁中 mode. Organisation names use the
// stakeholder's own sourced Chinese name (nameZh); numbers and dates match the English
// (checked by i18n.test.ts). Source excerpts and titles are never translated here.
// Real dossiers have no entry, so their Claude-written sentences stay in English.

export const SAMPLE_ZH: Record<string, string> = {
  // the market name
  "Taiwan counter-UAS entry": "台灣反無人機市場進入",

  // brief.judgments (bottom line + key judgments)
  "A first government pilot will likely need a Taiwanese integrator, because the NPA tender bars foreign bidders.":
    "第一個政府試點可能需要一家台灣整合商，因為內政部警政署的標案不允許外國廠商投標。",
  "The Army's ground-force counter-drone programme is likely the most open military channel for an imported sensor.":
    "中華民國陸軍的地面部隊反無人機計畫，可能是進口感測器最開放的軍方管道。",
  "Defence drone money will very likely keep favouring Taiwan-made systems: the Cabinet proposed a NT$210 billion special budget for domestic drones, and the act passed on 27 August 2026 tells MND to prioritise Taiwan-made unmanned vehicles.":
    "國防無人機經費非常可能繼續偏向台灣製造的系統：行政院提出新台幣 2,100 億元的國產無人機特別預算，而 2026年8月27日通過的法案要求國防部優先採用台灣製造的無人載具。",

  // next steps (facts with field "action") shown under Next moves
  "Map the kit to MND's published counter-UAS sensor layer (radar and RF) and ask for a requirements meeting through a Taiwanese prime":
    "把套件對應到國防部公布的反無人機感測層（雷達與射頻），並透過台灣主承包商請求召開需求會議",
  "Through a Taiwan-based integrator, ask for upcoming counter-UAS sensor specifications and qualification standards":
    "透過台灣的整合商，詢問即將公布的反無人機感測器規格與資格標準",
  "Through a Taiwanese prime, offer the RF and radar detection layer for the externally bought ground-force system":
    "透過台灣主承包商，為外購的地面部隊系統提供射頻與雷達偵測層",
  "Ask NCSIST whether a complementary sensor can join the Coast Guard's shipborne counter-drone project":
    "詢問國家中山科學研究院，互補型感測器能否加入海洋委員會海巡署的艦載反無人機專案",
  "Offer the sensor kit to one of the 16 qualified domestic firms before the second-stage proof-of-concept tests":
    "在第二階段概念驗證測試前，向 16 家合格國內廠商之一提供這套感測套件",
};
