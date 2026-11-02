// 繁中 for the sample's research-written sentences (SHELL-4, I18N-8). Sample data.
//
// Translated by hand by the team, not by a model call. Keys are the exact English sentences in
// sample-dossier.ts; the market page, the strategy brief, the A4 and the share link show these
// in 繁中 mode. Organisation names come from each stakeholder's own sourced Chinese name
// (nameZh), never a new spelling; numbers and dates match the English (checked by
// i18n.test.ts). Source excerpts, titles and URLs are never translated here. Real dossiers
// have no entry, so their Claude-written sentences stay in English.
import { sampleDossier } from "./sample-dossier";

/** Full name and short name → the stakeholder's sourced Chinese name. */
const NAMES: Record<string, string> = Object.fromEntries(
  sampleDossier.stakeholders.flatMap((s) =>
    s.nameZh
      ? [
          [s.name, s.nameZh],
          [s.short, s.nameZh],
        ]
      : [],
  ),
);

const SENTENCES: Record<string, string> = {
  // the market and the client (written by the team for the sample)
  "Taiwan counter-UAS entry": "台灣反無人機市場進入",
  "US counter-UAS startup (sample client)": "美國反無人機新創公司（範例客戶）",
  "Counter-UAS sensor kit (RF and radar detection, datalink)": "反無人機感測套件（射頻與雷達偵測、資料鏈）",

  // key judgments (bottom line first)
  "A first government pilot will likely need a Taiwanese integrator, because the NPA tender bars foreign bidders.":
    "第一個政府試點可能需要一家台灣整合商，因為內政部警政署的標案不允許外國廠商投標。",
  "The Army's ground-force counter-drone programme is likely the most open military channel for an imported sensor.":
    "中華民國陸軍的地面部隊反無人機計畫，可能是進口感測器最開放的軍方管道。",
  "Defence drone money will very likely keep favouring Taiwan-made systems: the Cabinet proposed a NT$210 billion special budget for domestic drones, and the act passed on 27 August 2026 tells MND to prioritise Taiwan-made unmanned vehicles.":
    "國防無人機經費非常可能繼續偏向台灣製造的系統：行政院提出新台幣 2,100 億元的國產無人機特別預算，而 2026年8月27日通過的法案要求國防部優先採用台灣製造的無人載具。",

  // executive summary
  "Taiwan's police and military are both buying counter-drone systems in 2026.": "台灣的警政和軍方在 2026 年都在採購反無人機系統。",
  "Foreign firms cannot bid on the police tender, so partner with a Taiwanese integrator and let NCSIST test the kit.":
    "外國廠商不能投標警政標案，所以要和台灣整合商合作，並讓國家中山科學研究院測試套件。",
  "The Army's ground-force system is the best opening, because it will be bought mainly from abroad.":
    "陸軍的地面部隊系統是最好的切入點，因為它主要會向國外採購。",

  // position rationale
  "Taiwan is buying counter-drone systems now: the National Police Agency's tender covers 50 sets with active radar and passive detection.":
    "台灣現在就在採購反無人機系統：內政部警政署的標案涵蓋 50 套具備主動雷達與被動偵測的系統。",
  "Foreign firms cannot bid on that tender, so the route in is a Taiwanese integrator.": "外國廠商不能投標該標案，所以進入的管道是台灣整合商。",
  "NCSIST grades every bidder's equipment in the second stage, which makes it the technical gate.":
    "國家中山科學研究院在第二階段為每家投標廠商的設備評分，因此它是技術關卡。",
  "The Army says its new ground-force counter-drone system will be bought mainly from abroad.":
    "中華民國陸軍表示，新的地面部隊反無人機系統主要會向國外採購。",
  "The Armaments Bureau's plan covers 48,750 drones in 2026 and 2027, which shows the scale of military demand.":
    "國防部軍備局的計畫涵蓋 2026 和 2027 年共 48,750 架無人機，顯示軍方需求的規模。",

  // recommended executive path
  "MND is the authority for military drone procurement and says it will integrate expertise from other countries.":
    "國防部主管軍用無人機採購，並表示會整合其他國家的專業。",
  "The Armaments Bureau approves programmes and specifications, and says foreign technology may fill gaps Taiwan lacks.":
    "國防部軍備局核定計畫與規格，並表示外國技術可以補足台灣欠缺的部分。",
  "The Army's ground-force counter-drone system will be bought mainly from abroad.": "陸軍的地面部隊反無人機系統主要會向國外採購。",
  "NCSIST grades bidders' equipment and already integrates foreign counter-UAV technology.":
    "國家中山科學研究院為投標廠商的設備評分，並已在整合外國的反無人機技術。",

  // how to reduce opposition
  "Enter the NPA tender as a component supplier to one of the 16 qualified domestic firms rather than as a bidder.":
    "不要直接投標，而是以元件供應商的身分，透過 16 家合格國內廠商之一參與內政部警政署標案。",

  // 7-day plan
  "Check which RF components need NCC import approval before shipping a demo kit": "寄出展示套件前，先確認哪些射頻元件需要國家通訊傳播委員會的進口審驗",
  "Map the kit to MND's published radar and RF sensor layer": "把套件對應到國防部公布的雷達與射頻感測層",
  "Through a Taiwanese prime, ask MND for a counter-UAS sensor requirements meeting": "透過台灣主承包商，請國防部召開反無人機感測器需求會議",
  "Ask the Armaments Bureau for upcoming sensor specifications and standards": "向國防部軍備局詢問即將公布的感測器規格與標準",
  "Offer the Army's ground-force programme an RF and radar detection layer": "為陸軍的地面部隊計畫提供射頻與雷達偵測層",
  "Ask an integrator to request NCSIST's second-stage grading criteria": "請整合商向國家中山科學研究院索取第二階段的評分標準",
  "Ask AIDC whether its NPA tender bid needs a sensor partner": "詢問漢翔航空工業股份有限公司，它投標內政部警政署標案是否需要感測器夥伴",

  // entry requirements
  "Only domestic firms can bid on the police counter-drone tender; foreign firms cannot.": "只有國內廠商能投標警政反無人機標案；外國廠商不行。",
  "Drone module parts must be made in Taiwan with no Chinese parts; foreign technology may fill gaps.":
    "無人機模組零件必須在台灣製造，且不得使用中國零件；外國技術可以補足缺口。",
  "Police tender bidders pass a security review, then NCSIST tests.": "警政標案的投標廠商先通過安全審查，再由國家中山科學研究院測試。",
  "Controlled RF devices need NCC approval before import.": "管制射頻器材進口前需要國家通訊傳播委員會核准。",
  "US firms can sell through Foreign Military Sales or direct commercial sales to Taiwanese buyers.": "美國公司可以透過軍售（FMS）或直接商售（DCS）賣給台灣買方。",

  // procurement routes
  "The Armaments Bureau buys drones built in Taiwan; foreign technology may fill gaps.": "國防部軍備局採購台灣製造的無人機；外國技術可以補足缺口。",
  "The police tender is open to domestic firms only; foreign firms cannot bid.": "警政標案只開放國內廠商；外國廠商不能投標。",
  "The Coast Guard awarded NCSIST a counter-drone jamming equipment contract.": "海洋委員會海巡署把一份反無人機干擾設備合約決標給國家中山科學研究院。",
  "US firms can sell through Foreign Military Sales, handled by the US Department of Defense.": "美國公司可以透過由美國國防部辦理的軍售（FMS）銷售。",
  "Direct commercial sales go straight to Taiwanese entities.": "直接商售（DCS）是直接賣給台灣的單位。",

  // key risks
  "The drone act passed in August tells MND to prioritise Taiwan-made unmanned vehicles.": "8 月通過的無人機法案要求國防部優先採用台灣製造的無人載具。",
  "A domestic counter-drone contract failed acceptance tests, so new systems face strict testing.": "一份國內反無人機合約沒有通過驗收測試，所以新系統會面臨嚴格測試。",
  "RF devices need NCC approval before import, which can delay a demo.": "射頻器材進口前需要國家通訊傳播委員會核准，可能延誤展示。",

  // needs from you
  "Needs from you: the kit's certifications": "需要你提供：套件的認證",
  "Needs from you: your price range": "需要你提供：你的價格區間",
  "Needs from you: any existing Taiwan partners": "需要你提供：你在台灣已有的夥伴",

  // next steps (facts with field "action"), on the market page, the map and the A4 table
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

/** The A4 shows each 7-day box as "<action> (<who>)"; build those from the pieces above. */
function planLines(): Record<string, string> {
  const out: Record<string, string> = {};
  const plan = sampleDossier.briefs.at(-1)?.plan;
  for (const a of plan ? [...plan.prep, ...plan.contact, ...plan.event, ...plan.followUp] : []) {
    const s = sampleDossier.stakeholders.find((x) => x.id === a.stakeholderId);
    const zh = SENTENCES[a.text];
    if (!s || !zh) continue;
    for (const who of [s.short, s.name]) out[`${a.text} (${who})`] = `${zh}（${s.nameZh ?? who}）`;
  }
  return out;
}

export const SAMPLE_NAMES_ZH = NAMES;
export const SAMPLE_ZH: Record<string, string> = { ...SENTENCES, ...planLines() };
