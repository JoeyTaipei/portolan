// The 碳基 expansion report (spec MKT-3, plan S22): six dimensions × four markets, in 繁中.
// Every item cites source handles from that market's fixture (checked by cbt.test.ts: handles
// exist, and every number in the text is in a cited excerpt). A budget line with no sourced
// amount is shown as 「未驗證／需客戶提供」; nothing is totalled.
import type { MarketSpec } from "./build";
import { JP_SPEC } from "./jp";
import { PH_SPEC } from "./ph";
import { PL_SPEC } from "./pl";
import { US_SPEC } from "./us";

export interface Cited {
  text: string;
  keys: string[];
}

export interface BudgetLine {
  item: string;
  /** Copied from the source; null = not sourced (needs the client's own quote). */
  amount: string | null;
  keys: string[];
}

export interface PlanStep extends Cited {
  stakeholderId: string;
}

export interface MarketReport {
  spec: MarketSpec;
  /** 繁中 market name for headings. */
  label: string;
  region: string;
  /** One line for the comparison table. */
  firstDoor: Cited;
  barrier: Cited;
  opportunity: Cited[];
  access: (Cited & { route: string })[];
  budget: BudgetLine[];
  procurement: Cited[];
  /** Known gaps, shown as Unverified (no source by definition). */
  gaps: string[];
  plan: { d30: PlanStep[]; d60: PlanStep[]; d90: PlanStep[] };
}

const c = (text: string, ...keys: string[]): Cited => ({ text, keys });
const step = (stakeholderId: string, text: string, ...keys: string[]): PlanStep => ({ stakeholderId, text, keys });

/** Client-level lines; their handles live in the US market's sources. */
export const CLIENT_SUMMARY: Cited[] = [
  c("碳基成立於 2007 年，專精無人載具碳纖維複材，長期為中科院軍用無人機製作機體。", "cbt-uaver"),
  c("碳基 2026 年 6 月營收新台幣 3,856.7 萬元，年增 803.84%，主要來自銳鳶專案交付。", "cbt-ctee-revenue"),
  c("外銷目前以少量訂單為始，但接單數量持續增加，客戶涵蓋不同國家。", "cbt-ctee-revenue"),
  c("碳基已與日本、美國、歐洲及東南亞業者推動技術整合、共同開發與產品外銷。", "cbt-ctee-partners"),
  c("主力外銷產品是導控距離超過 90 公里的三角翼無人機，以及彈射式小型攻擊型無人機。", "cbt-cna-profile"),
  c("客戶第一個問題通常是能否做到非紅供應鏈；台灣自製無人機成本已從中國的 5 倍縮小到 1.5 倍到 2 倍。", "cbt-cna-profile"),
];

export const CBT_REPORT: MarketReport[] = [
  {
    spec: US_SPEC,
    label: "美國",
    region: "北美",
    firstDoor: c("工研院 Green UAS 評鑑 ＋ 德州 APOZ 組裝廠", "tw-cna-itri", "cbt-apoz"),
    barrier: c("FCC 受管制清單：新的外國製無人機拿不到授權，不能進口銷售", "us-hk-fcc"),
    opportunity: [
      c("美國和捷克、波蘭並列台灣無人機外銷前三大市場。", "tw-ft-exports"),
      c("碳基已與美商 Vantage Robotics 展開美軍現役機種 Vesper 的試製合作（2023/10/04 報導）。", "cbt-mirror-vantage"),
      c("ASC Global 已同意在德州 APOZ 為 UAVER 設立組裝廠（August 12, 2025 新聞稿）。", "cbt-apoz"),
      c("工研院今年 1 月底與 AUVSI 簽約，成為 Green UAS 在美國以外唯一認證據點，台灣廠商可在台申請認證。", "tw-cna-itri", "cbt-cna-hub"),
    ],
    access: [
      { route: "在美組裝", ...c("透過 ASC Global 在德州 APOZ 的組裝廠協議，取得在美組裝據點。", "cbt-apoz") },
      { route: "美國夥伴代工", ...c("把 Vantage Robotics 的 Vesper 試製延伸為供應合約，成為其全球供應鏈一員。", "cbt-mirror-vantage") },
      { route: "認證", ...c("先在台灣透過工研院做 Green UAS 評鑑，再跟著產業發展署了解 Blue UAS 標準。", "tw-cna-itri", "tw-ft-hsiao") },
      { route: "官方訪團", ...c("跟著外交部無人機外交小組參展 XPONENTIAL 2027（17 to 20 May 2027，Miami Beach）。", "tw-cna-mofa", "us-fe-xpo27") },
    ],
    budget: [
      { item: "Green UAS 與 NDAA 認證（台灣業者估計）", amount: "可能數百萬元", keys: ["cbt-cna-profile"] },
      { item: "FCC 受管制清單與設備授權的美國法律評估", amount: null, keys: [] },
      { item: "德州 APOZ 組裝廠投資與營運", amount: null, keys: [] },
      { item: "XPONENTIAL 2027 攤位與差旅", amount: null, keys: [] },
    ],
    procurement: [
      c("先確認 FCC 受管制清單：新的外國製無人機拿不到 FCC 授權，也就不能進口或在美銷售。", "us-hk-fcc"),
      c("取得資格：Green UAS（工研院在台評鑑）→ Blue UAS（列入清單享美國政府採購優先權）。", "tw-cna-itri", "cbt-cna-hub"),
      c("找美國夥伴或在美組裝：Vantage Robotics 試製、德州 APOZ 組裝廠。", "cbt-mirror-vantage", "cbt-apoz"),
      c("軍工案從接觸、飛測、修改到量產，通常要半年到一年。", "cbt-cna-profile"),
    ],
    gaps: ["德州 APOZ 組裝廠是否已動工：只找到 2025 年的新聞稿，沒有後續消息。", "碳基符合 NDAA 的說法來自新聞稿中的公司自述，尚未獨立查證。"],
    plan: {
      d30: [step("us-fcc", "請美國律師確認 FCC 受管制清單如何適用 UAVER 機型。", "us-hk-fcc"), step("us-itri", "請工研院做 Green UAS 資安預評鑑。", "tw-cna-itri")],
      d60: [step("us-ascg", "和 ASC Global 確認德州組裝廠時程；詢問 Vantage Robotics 試製能否轉成供應合約。", "cbt-apoz", "cbt-mirror-vantage"), step("us-tw-ida", "請產業發展署讓碳基加入下一次赴華府的 Blue UAS 訪團。", "tw-ft-hsiao")],
      d90: [step("us-tw-mofa", "請外交部無人機外交小組讓碳基加入 XPONENTIAL 2027 台灣館。", "tw-cna-mofa", "us-fe-xpo27"), step("us-tti", "依 TEDIBOA 與德州農工運輸研究所的備忘錄，安排德州自主飛行測試。", "tw-cna-tediboa-tti")],
    },
  },
  {
    spec: JP_SPEC,
    label: "日本",
    region: "東北亞",
    firstDoor: c("新樂飛（7A Drones）的日本合作 ＋ JDC 意向書", "cbt-cna-profile", "jp-udn-loi"),
    barrier: c("國防合作仍受日方諸多限制，先做民用與零組件", "jp-cna-juida"),
    opportunity: [
      c("日本防衛省 FY2026 編列約 ¥100.1 billion 建置 SHIELD，以大量低價無人機、無人艇與無人潛航器打造不對稱防衛。", "jp-mod-fy26"),
      c("經產省目標在 2030 年底前生產 8萬架日本製無人機，並與理念相近國家合作馬達、電池、通訊模組與飛控。", "jp-cna-nikkei"),
      c("碳基執行長表示，對碳基產品詢問度最高的客戶來自日本、越南與印度。", "cbt-cna-hub"),
      c("雙邊貿易仍小：DSET 估計台灣去年只出口 45 架無人機到日本。", "jp-cna-nikkei"),
    ],
    access: [
      { route: "台灣夥伴", ...c("新樂飛（7A Drones）已和碳基共同開發銷售，並與日本 AlterSky、Autonomy HD 簽約。", "cbt-cna-profile", "jp-cna-nikkei") },
      { route: "產業聯盟", ...c("透過 JDC（已與外交部無人機國際學院簽意向書）和 JUIDA 媒合日本廠商。", "jp-udn-loi", "jp-cna-nikkei") },
      { route: "展會", ...c("Japan Drone 2027（2027年6月2日〜4日，幕張メッセ），攤位一次截止 2027年1月29日。", "jp-bc-jd27") },
      { route: "國會", ...c("日本台灣友好議員聯盟已成立台日防衛合作專案小組。", "jp-udn-furuya") },
    ],
    budget: [
      { item: "國土交通省第一種型式認證（新規申請，不含特定空域）", amount: "¥2,209,300", keys: ["jp-mlit-fees"] },
      { item: "同上（含特定空域）", amount: "¥2,731,800", keys: ["jp-mlit-fees"] },
      { item: "Japan Drone 2027 攤位與差旅", amount: null, keys: [] },
      { item: "日本代理或合作夥伴費用", amount: null, keys: [] },
    ],
    procurement: [
      c("民用與零組件先行：JUIDA 表示商用合作進展快，但國防用途合作仍面臨諸多限制。", "jp-cna-juida"),
      c("在日本飛行的機型需要國土交通省的型式認證。", "jp-mlit-fees"),
      c("透過日本廠商接觸 SHIELD 等防衛需求；台日合作傾向透過 NGO 與產業協會，而非政府對政府。", "jp-cna-nikkei", "jp-mod-fy26"),
      c("SHIELD 預計 FY2027 建置完成。", "jp-mod-fy26"),
    ],
    gaps: ["防衛裝備廳（ATLA）的外國供應商資格條件尚未查核。"],
    plan: {
      d30: [step("jp-7a", "請新樂飛（7A Drones）把碳基帶進它的日本合作案。", "cbt-cna-profile"), step("jp-mlit", "確認 UAVER 機型是否需要日本型式認證。", "jp-mlit-fees")],
      d60: [step("jp-tw-mofa", "請外交部無人機外交小組介紹碳基給 JDC 會員。", "jp-udn-loi"), step("jp-meti", "向參與經產省國產無人機計畫的日本廠商提供碳纖維機體。", "jp-cna-nikkei")],
      d90: [step("jp-drone27", "在 2027年1月29日 前預訂 Japan Drone 2027 攤位。", "jp-bc-jd27"), step("jp-tw-tediboa", "參加 TEDIBOA 與 JUIDA、JDC 的日本媒合。", "jp-cna-nikkei")],
    },
  },
  {
    spec: PL_SPEC,
    label: "歐洲（波蘭）",
    region: "中東歐",
    firstDoor: c("WB 集團供應鏈 ＋ 駐華沙台灣貿易投資服務中心", "pl-die-wb", "pl-ft-warsaw"),
    barrier: c("WB 集團主導；需求與烏克蘭戰事連動", "pl-die-wb", "tw-ft-hsiao"),
    opportunity: [
      c("2026 年前 7 個月，波蘭買了 US$45.31 million 台灣無人機，僅次於捷克。", "tw-ft-hsiao"),
      c("波蘭國防部長表示採購將聚焦無人機與反無人機系統，並呼籲業者全天候生產。", "pl-d24-minister"),
      c("軍備局 28 May 與 WB 集團簽下波蘭軍隊史上最大的同類採購，由歐盟 SAFE 機制出資。", "pl-die-wb"),
      c("台灣政府支持的無人機聯盟已和波蘭無人系統產業團體簽署非中供應鏈備忘錄。", "pl-ft-mou"),
    ],
    access: [
      { route: "主承包商供應鏈", ...c("WB 集團表示合約將擴大與國際夥伴的合作。", "pl-die-wb") },
      { route: "既有台波合作", ...c("波蘭 Farada 集團已和台灣無人機業者簽約。", "pl-ft-farada") },
      { route: "官方窗口", ...c("經濟部 2025 年底在華沙設立台灣貿易投資服務中心，協助法規、稅務與投資。", "pl-ft-warsaw") },
      { route: "展會", ...c("MSPO 2027（31 August to 3 September 2027，Kielce）。", "pl-fe-mspo27") },
    ],
    budget: [
      { item: "市場參考：波蘭國防部 2025 年訓練用無人機採購（非碳基成本）", amount: "約 PLN 200 million", keys: ["pl-d24-usc"] },
      { item: "MSPO 2027 攤位與差旅", amount: null, keys: [] },
      { item: "波蘭據點或代理", amount: null, keys: [] },
      { item: "歐盟出口與認證", amount: null, keys: [] },
    ],
    procurement: [
      c("軍備局代表國庫簽約；大型無人系統合約由 SAFE 出資。", "pl-die-wb"),
      c("外國廠商可直接得標：Shield AI 的 V-BAT（June 23, 2026）。", "pl-die-shield"),
      c("或成為 WB 集團等主承包商的供應鏈夥伴。", "pl-die-wb"),
      c("波蘭計畫開放個別部隊直接採購最小型無人機。", "pl-d24-usc"),
    ],
    gaps: ["和台灣簽備忘錄的波蘭產業團體名稱，只在付費的新聞全文中出現，尚未查核。"],
    plan: {
      d30: [step("pl-tw-center", "向駐華沙服務中心詢問波蘭法規、稅務與投資。", "pl-ft-warsaw")],
      d60: [step("pl-wb", "向 WB 集團提供碳纖維機體零件；詢問 Farada 集團的台灣合作內容。", "pl-die-wb", "pl-ft-farada")],
      d90: [step("pl-mspo27", "規劃 MSPO 2027 參展，並詢問 ITWL 無人系統中心如何參與測試。", "pl-fe-mspo27", "pl-d24-usc")],
    },
  },
  {
    spec: PH_SPEC,
    label: "東南亞（菲律賓）",
    region: "東南亞",
    firstDoor: c("ADAS 2027 商機媒合 ＋ 外交部無人機外交小組", "ph-fe-adas27", "tw-cna-mofa"),
    barrier: c("美澳出資系統已進場；外國供應商採購規則未驗證", "ph-baird-navy", "ph-baird-pcg"),
    opportunity: [
      c("碳基董事長點名印尼、菲律賓是未來無人艇的重要市場。", "cbt-cna-profile"),
      c("菲律賓海軍 June 22 接收美國提供的自主載具，總價 PHP754 million（US$12.3 million）。", "ph-baird-navy"),
      c("澳洲 July 21, 2026 為菲律賓海岸防衛隊追加 AU$10 million 無人機技術與操作訓練。", "ph-baird-pcg"),
      c("烏克蘭無人機公司也在尋求和菲律賓、日本及台灣合作。", "asia-udn-reuters"),
    ],
    access: [
      { route: "展會媒合", ...c("ADAS 2027（28 to 30 June 2027，SMXCITE, Pasay City）提供對菲律賓武裝部隊的商機媒合。", "ph-fe-adas27") },
      { route: "官方窗口", ...c("外交部無人機外交小組盤點對象國家需求，並媒合台灣供應商。", "tw-cna-mofa") },
      { route: "產品切入", ...c("以 Marlin 無人艇和長程三角翼無人機對準海域監控需求。", "cbt-cna-profile", "ph-baird-navy") },
    ],
    budget: [
      { item: "ADAS 2027 攤位與商機媒合", amount: null, keys: [] },
      { item: "Marlin 無人艇展示運輸與保險", amount: null, keys: [] },
      { item: "菲律賓代理或合作夥伴", amount: null, keys: [] },
    ],
    procurement: [
      c("目前美國和澳洲以出資方式提供無人系統給菲律賓部隊。", "ph-baird-navy", "ph-baird-pcg"),
      c("ADAS 商機媒合的對象是菲律賓武裝部隊、國家警察和安全機關。", "ph-fe-adas27"),
      c("軍工案從接觸、飛測、修改到量產，通常要半年到一年。", "cbt-cna-profile"),
    ],
    gaps: ["菲律賓對外國國防供應商的採購規則尚未查核，所以執照檢查標為未驗證。"],
    plan: {
      d30: [step("ph-navy", "準備 Marlin 無人艇海域監控展示。", "cbt-cna-profile"), step("ph-tw-mofa", "詢問外交部無人機外交小組是否在盤點菲律賓需求。", "tw-cna-mofa")],
      d60: [step("ph-pcg", "向海岸防衛隊提出長程定翼無人機方案。", "ph-baird-pcg")],
      d90: [step("ph-adas27", "預訂 ADAS 2027 攤位與商機媒合時段。", "ph-fe-adas27")],
    },
  },
];
