// 碳基科技 (Carbon-Based Technology, UAVER) — the client of the four MKT-3 sample markets.
// Sources about the client and the Taiwan side, shared by the markets. Every excerpt is copied
// verbatim from the page on 2026-11-05 (non-adjacent paragraphs joined with " … ").
import type { RawSource } from "./build";

export const CBT_COMPANY = "碳基科技 Carbon-Based Technology (UAVER), Taichung";
export const CBT_PRODUCT = "Carbon-fibre fixed-wing and delta-wing drones, drone airframes and uncrewed surface vessels";
export const CHECKED = "2026-11-05";
export const AT = "2026-11-05T02:00:00Z";

const ONE = "No other independent source in this sample covers this yet.";
const MANY = "Other independent sources in this sample also cover this topic.";

export const CLIENT_ZH: Record<string, string> = {
  [CBT_COMPANY]: "碳基科技（UAVER），台中",
  [CBT_PRODUCT]: "碳纖維定翼與三角翼無人機、無人機機體及無人艇",
};

/** Shared sources, by handle. Each market lists the ones it cites. */
export const SHARED: Record<string, RawSource> = {
  "cbt-cna-profile": {
    key: "cbt-cna-profile",
    url: "https://www.cna.com.tw/news/afe/202605170056.aspx",
    title: "民主信賴產業啟航／19年老牌軍工廠轉型　碳基谷底翻身再靠無人機起飛[影]",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "陳文宏透露，近半年已有多組海外客戶前來參訪，並開始小量試製合作，客源來自日本、印度、東南亞等，單一國家的潛在訂單量都上看千台。 … 「島嶼國家的物流、離島補給、海巡監控，其實都很需要無人載具」，陳文宏說，印尼、菲律賓等市場，未來都可能成為無人艇的重要應用場域，也會是繼天空之外，下一個藍海市場。 … 不過，軍工產業不同於消費電子，從接觸、飛測、修改到量產，週期通常長達半年到一年，陳文宏推估，「明年會是營收大爆發的一年，碳基營運將重新起飛。」 … 目前碳基主力外銷產品，包括導控距離超過90公里的三角翼無人機，以及彈射式小型攻擊型無人機。 … 目前碳基台中廠約700坪至800坪，以現有配置，一架消耗型無人機從製造到完成約需3天，陳文宏坦言，現有產能已難以應付未來需求。 … 「現在很多客戶第一件事，就是先問能不能做到非紅供應鏈、供應自主比例多少」 … 她透露，3年前，台灣自製無人機成本比中國貴上5倍，這幾年已努力縮小至1.5倍到2倍之間。 … 更別說取得美國Green UAS與NDAA認證，可能就要花費數百萬元。 … 這種策略也延伸到無人艇，碳基開發的Marlin J6、Marlin S6則與傑海達機器人及美國廠商共同合製。",
  },
  "cbt-cna-hub": {
    key: "cbt-cna-hub",
    url: "https://www.cna.com.tw/news/afe/202605170028.aspx",
    title: "在鳳梨田中起飛　台灣無人機民主之翼航向全球",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "碳基科技執行長游沛文進一步表示，對碳基產品詢問度最高的客戶來自日本、越南與印度等國。 … 數十年前，雷虎科技以遙控飛機起家，在這一波無人載具新興產業浪潮中成功轉型，如今已通過美國藍色無人機（Blue UAS）產品認證。美國國防部2020年推出藍色無人機計畫，旨在認證符合聯邦資安標準的無人機，獲得認證的無人機將列入「藍色清單（Blue UAS List）」，並享有美國政府採購優先權，評鑑機制採年度滾動調整。 … 吳政忠進一步指出，美國國際無人系統協會（AUVSI）計畫在台灣設立Green UAS認證機制，這將是AUVSI在海外唯一的認證據點，未來台灣廠商不用遠赴海外，無人機產品在台灣就可以申請Green UAS認證。 … 經濟部今年4月30日在行政院院會報告表示，台灣無人機產業2025年產值已達129億元，較2024年成長超過2.5倍，其中外銷產值達29.5億元，整機外銷產值成長21倍。 … 有不少國外客戶都希望我們協助他們在自己的國家落地生產。」碳基科技董事長陳文宏說。",
  },
  "cbt-ctee-partners": {
    key: "cbt-ctee-partners",
    url: "https://www.ctee.com.tw/news/20260724700192-439901",
    title: "碳基爭無人機訂單 拓全球非紅供應鏈 - 日報 - 工商時報",
    publisher: "Commercial Times (工商時報)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "F",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "無人機業者碳基科技積極與國外非紅供應鏈建立合作夥伴關係，目前已與日本、美國、歐洲及東南亞等業者推動技術整合、共同開發，及產品外銷，逐步建立全球非紅供應鏈合作網絡。 … 碳基執行長游沛文指出，未來全球無人機產業，將朝向跨國供應鏈分工與在地製造發展，製造商的核心競爭力，不再只是機體性能，而是快速整合技術、供應鏈，及應用場景的能力。",
  },
  "cbt-ctee-revenue": {
    key: "cbt-ctee-revenue",
    url: "https://www.ctee.com.tw/news/20260711700610-431202",
    title: "碳基科技6月營收年增逾800％ - 商情 - 工商時報",
    publisher: "Commercial Times (工商時報)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "F",
    credibility: 3,
    credibilityReason: ONE,
    verifiedAt: CHECKED,
    excerpt:
      "碳基科技（7719）甫公告2026年6月營收達新台幣3,856.7萬元，年增803.84%。 … 碳基科技表示，銳鳶相關標案金額約新台幣1.5億元，目前正依專案進度逐步交貨，並依完工比例法分階段認列營收。 … 外銷業務目前雖以少量訂單為始，但接單數量持續增加，客戶涵蓋不同國家、多元應用市場，顯示公司產品逐步獲得國際客戶認可，也為未來海外市場發展奠定基礎。",
  },
  "cbt-uaver": {
    key: "cbt-uaver",
    url: "https://www.uaver.com/article_d.php?id=437&lang=en&tb=1",
    title: "Company profile | Carbon-Based Technology Inc.",
    publisher: "Carbon-Based Technology Inc.",
    sourceType: "company_site",
    excerptLang: "en",
    reliability: "C",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "Carbon-Based Technology (CBT) is a manufacturer specializing in carbon fiber composite materials for unmanned vehicles. … Since its establishment in 2007, CBT has played a key role in the development and production of composite fuselages for military UAVs developed by NCSIST, including the Teng Yun, Rui Yuan I, Jian Xiang, Rui Yuan II, Xiang Shun, and Zhong Xiang I.",
  },
  "cbt-mirror-vantage": {
    key: "cbt-mirror-vantage",
    url: "https://www.mirrormedia.mg/story/20230927ind005",
    title: "【貴族材料新革命1】連美商都看重的軍工實力　碳基暗中助美生產戰機 - 鏡週刊 Mirror Media",
    publisher: "Mirror Media (鏡週刊)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "F",
    credibility: 3,
    credibilityReason: ONE,
    verifiedAt: CHECKED,
    excerpt:
      "2023/10/04 21:58 … 憑藉與中科院合作練功多年的厚實基礎，碳基成功吸引外國廠商注意。「碳基已與美商Vantage Robotics展開試製合作，生產美軍現役機種Vesper。」碳基副總李康嗣興奮表示，雖不能多透露細節，但碳基希望藉此成為Vantage Robotics全球供應鏈的一員，進軍海外市場。",
  },
  "cbt-apoz": {
    key: "cbt-apoz",
    url: "https://www.newswire.com/news/an-uav-manufacturer-from-taiwan-in-coming-to-apoz",
    title: "An UAV Manufacturer from Taiwan in Coming to APOZ",
    publisher: "Newswire (ASC Global press release, Aug 12, 2025)",
    sourceType: "other",
    excerptLang: "en",
    reliability: "F",
    credibility: 3,
    credibilityReason: ONE,
    verifiedAt: CHECKED,
    excerpt:
      "HOUSTON, TX, August 12, 2025 (Newswire.com) … ASC Global Inc. is a wholly-owned subsidiary of Token Communities (OTCID/Stock Symbol:TKCM) has reached an agreement with a Taiwanese UAV / Drone company, UAVER to establish an assembly plant at APOZ ( Asia Pacific Opportunity Zone ) in Texas. … Dr. Eric Fang, Co-founder of the APOZ project and COO of the company further added, UAVER ( Carbon-Based Technology Inc. located in Taichung, Taiwan, founded in 2007 ) is a pioneer in the Taiwan UAV industry, the company utilizes advanced carbon-fiber composite materials to manufacture various types of unmanned aerial vehicles ( UAVs ). … Ms. Tina Pei Wise, Director of Coordination commented, UAVER is a public-listed company in Taiwan, with ISO 9001 and ISO 9100 aerospace quality certifications and NDAA compliance.",
  },
  "tw-cna-mofa": {
    key: "tw-cna-mofa",
    url: "https://www.cna.com.tw/news/afe/202605170032.aspx",
    title: "籌設國際學院暨對接市場　無人機外交書寫台灣價值",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "美國聯邦通訊委員會（FCC）2025年底起嚴格審核，將中國無人機供應鏈產品排除美國市場，各國「去中國化」之非紅供應鏈產品需求湧現，為台灣無人機業者帶來商機。 … 外交部掌握地緣政治局勢以及現代戰爭樣貌改變，配合總統宣示的「五大信賴產業」，積極推動「無人機外交」，2025年10月成立「無人機外交小組」，作為國際需求端以及台灣供給端之間的平台，盤點對象國家對商用無人機需求，以及對象國家是否為友善國家。 … 台灣輸出軍民兩用無人機，也計晝援贈友邦無人機，在智慧農業、海巡監控、防救災等領域提供協助。 … 「無人機外交小組」不僅是平台，今年5月更率領台灣業者在美國底特律參加「XPONENTIAL 2026」。江振瑋說，參展可增進全球供應鏈的商機媒合，也有助於台灣建立關鍵的戰略優勢，要讓台灣成為「無人機民主供應鏈亞洲中心」。 … 圖為外交部無人機外交小組執行長江振瑋（前右）與美國無人機產業協會執行長暨會長羅賓斯（前左），共同就無人機產業合作簽署意向書。",
  },
  "tw-cna-moea": {
    key: "tw-cna-moea",
    url: "https://www.cna.com.tw/news/afe/202605170040.aspx",
    title: "對內扶植對外合作　經部建構台灣無人機非紅供應產業鏈",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "442億元預算主要分為4大面向進行，包括場域建置192億元、技術研發141億元、政府採購102億元，以及認證與資安體系7億元，期能建構完整產業生態系。 … 在與美國合作部分，龔明鑫提到，在今年1月前往美國參與第6屆「台美經濟繁榮夥伴對話」（EPPD）會議期間，工研院已與美國無人機產業協會（AUVSI）簽署Green UAS授權評鑑及服務協議，未來產品可在台完成認證並取得國際認可，縮短進入市場的時間。至於美國國防體系Blue UAS的認證，則將在今年循序推動。 … 在短時間內吸引超過260家廠商參與「台灣卓越無人機海外商機聯盟」（TEDIBOA），成員涵蓋零組件、光電與系統整合等領域，顯示產業逐步成形。",
  },
  "tw-cna-itri": {
    key: "tw-cna-itri",
    url: "https://www.cna.com.tw/news/afe/202605170041.aspx",
    title: "美國無人機Green UAS研擬在台設立認證中心",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "（中央社記者張建中新竹17日電）工業技術研究院今年將成為Green UAS計畫美國之外唯一認證據點，董事長吳政忠說，關鍵原因是台灣晶片和製造業實力堅強，並是可信賴的民主供應鏈一員。在有Green UAS認證，台灣可以前進美國市場，並有助未來開拓歐洲市場。 … 吳政忠指出，工研院協助美國無人機產業協會（AUVSI）進行評估，首先就是檢視資金來源是不是非紅，以及資安有沒有控制好。AUVSI是全球規模最大的無人機產業協會，會員來自全球60多個國家，主要提供平台促進會員技術交流合作。工研院今年1月底與AUVSI在華府簽署Green UAS授權評鑑及服務協議契約，專職網路安全測試和技術評估，擴大在台灣的滲透測試支援，由授權資安人員實際嘗試入侵系統，識別資安漏洞。",
  },
  "tw-cna-tediboa-tti": {
    key: "tw-cna-tediboa-tti",
    url: "https://www.cna.com.tw/news/afe/202603170041.aspx",
    title: "無人機聯盟攜手德州農工運輸所　推台美供應鏈合作",
    publisher: "Central News Agency (中央社)",
    sourceType: "news",
    excerptLang: "zh-TW",
    reliability: "B",
    credibility: 3,
    credibilityReason: ONE,
    verifiedAt: CHECKED,
    excerpt:
      "無人機聯盟（TEDIBOA）偕同主席雷虎科技董事長陳冠如（左），在經濟部產業發展署組長張尚鈞（中）見證下，與美國德州農工運輸研究所（TTI）所長溫佛瑞（Gregory D. Winfree，右）簽署產業合作備忘錄。 … （中央社記者江明晏台北17日電）台灣卓越無人機海外商機聯盟（TEDIBOA）今天宣布，與美國德州農工運輸研究所（TTI）簽署產業合作備忘錄（MOU），雙方將推動台美無人機非紅供應鏈合作；無人機聯盟也將在24日至26日前往德國杜賽道夫參與海陸空無人載具及自駕系統產業鏈展。 … 雙方將運用各自優勢，推動台美無人機非紅供應鏈合作，並在無人機相關研究、技術交流、教育訓練及自主飛行測試等領域深化合作。",
  },
  "tw-ft-exports": {
    key: "tw-ft-exports",
    url: "https://focustaiwan.tw/business/202605210009",
    title: "Taiwan targets 100,000 monthly drone output, export growth - Focus Taiwan",
    publisher: "Focus Taiwan (CNA)",
    sourceType: "news",
    excerptLang: "en",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "Currently, exports account for just over 20 percent, led by the Czech Republic, Poland and the United States, he said, indicating that in the first four months of this year, the outbound shipment of drones reached US$147 million. … During the event, he said Taiwan also signed memorandums of understanding with the Michigan Drone Association and the North Dakota Trade Office, focusing on autonomous flight, urban air mobility and shared test facilities to help Taiwanese firms access more complete testing and certification resources.",
  },
  "tw-ft-hsiao": {
    key: "tw-ft-hsiao",
    url: "https://focustaiwan.tw/politics/202608260003",
    title: "Taiwan eyeing global drone role via partnerships: Vice President Hsiao - Focus Taiwan",
    publisher: "Focus Taiwan (CNA)",
    sourceType: "news",
    excerptLang: "en",
    reliability: "B",
    credibility: 2,
    credibilityReason: MANY,
    verifiedAt: CHECKED,
    excerpt:
      "Given the apparent urgency to develop the sector, Taiwan has been encouraging drone manufacturers to obtain U.S.-administered cybersecurity certifications. Earlier this month, the Ministry of Economic Affairs' Industrial Development Administration led 12 manufacturers to Washington, D.C., to learn about the Blue UAS certification criteria established by the U.S. Defense Innovation Unit and market demand. … Meanwhile, technological partnerships and original equipment manufacturing (OEM) arrangements have emerged as forms of international cooperation in drone production, Hsiao said. … Of the total, 75.6 percent by value was shipped to the Czech Republic (US$137.17 million) and Poland (US$45.31 million), and the drones were likely eventually destined for Ukraine, according to defense analysts.",
  },
};

export const pick = (...keys: string[]): RawSource[] =>
  keys.map((k) => {
    const s = SHARED[k];
    if (!s) throw new Error(`cbt: unknown shared source "${k}"`);
    return s;
  });
