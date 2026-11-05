import Link from "next/link";
import { Cites } from "./cite";
import { CLIENT_SUMMARY, LEVEL_ZH, MARKET_VIEWS, US_VIEW, ymd, type MarketView } from "./model";
import { PrintButton } from "./print-button";

// 碳基 expansion report (MKT-3): the six dimensions of portolan_report_v3 (opportunity,
// stakeholders, access, budget, procurement path, 30/60/90 plan) across the four sample markets.
// 繁中 only; every line cites its market's sources or says 未驗證. No evaluation section.

const DIMENSIONS = [
  { no: "1", id: "opportunity", title: "市場機會", en: "Market Opportunity", intro: "目標市場的實際需求、現有切入點和碳基已經有的進度。" },
  { no: "2", id: "stakeholders", title: "關鍵利害關係人", en: "Stakeholder Mapping", intro: "依影響力和支持度排序；標★的是評分程式算出的「先聯絡」。分數可在各市場的地圖頁點開看算法和來源。" },
  { no: "3", id: "access", title: "接觸策略", en: "Access Strategy", intro: "怎麼接觸這些人：夥伴、認證、官方窗口和展會。" },
  { no: "4", id: "budget", title: "預算估算", en: "Budget Estimation", intro: "只列有來源的金額；其餘標「未驗證／需客戶提供」，不加總、不估算。" },
  { no: "5", id: "procurement", title: "採購路徑", en: "Procurement Pathway", intro: "從第一次接觸、資格取得、測試到合約的可能程序。" },
  { no: "6", id: "plan", title: "30／60／90 天行動計畫", en: "Execution Plan", intro: "每一步都指向地圖上的利害關係人或展會，可加入各市場的追蹤器。" },
] as const;

function Market({ v, children }: { v: MarketView; children: React.ReactNode }) {
  return (
    <section className="cbt-mkt" aria-label={v.r.label}>
      <div className="cbt-mkt-h">
        <h3>{v.r.label}</h3>
        <span className="cbt-verdict" data-kind={v.verdict.kind}>
          {v.verdict.label}
        </span>
        <Link href={v.href}>開啟市場 →</Link>
      </div>
      {children}
    </section>
  );
}

function Section({ i, children }: { i: number; children: React.ReactNode }) {
  const d = DIMENSIONS[i];
  return (
    <section id={d.id} className="cbt-sec page" aria-labelledby={`${d.id}-h`}>
      <div className="cbt-sec-h">
        <span className="no">§{d.no}</span>
        <h2 id={`${d.id}-h`}>{d.title}</h2>
        <span className="en">{d.en}</span>
      </div>
      <p className="cbt-sec-intro">{d.intro}</p>
      <div className="cbt-grid">{children}</div>
    </section>
  );
}

export function ReportView() {
  return (
    <div className="cbt-desk">
      <header className="cbt-bar">
        <Link href="/" className="cbt-brand">
          Portolan
        </Link>
        <span className="cbt-crumb">
          <Link href="/cbt">碳基科技</Link> / 海外市場進入報告
        </span>
        <span className="sample">Sample data</span>
        <span className="acts">
          <Link href="/cbt" className="btn btn-ghost btn-s">
            回到碳基總覽
          </Link>
          <PrintButton />
        </span>
      </header>

      <main className="cbt-sheet">
        <p className="cbt-kicker">Market entry report · 碳基科技 Carbon-Based Technology (UAVER)</p>
        <h1 className="cbt-h1">從台中到四個海外市場：先接觸誰、怎麼接觸、花多少、怎麼走到第一份合約</h1>
        <p className="cbt-lede">
          美國、日本、歐洲（以波蘭為代表）、東南亞（以菲律賓為代表）。每一句都附上公開來源，可點方框裡的來源編號看原文摘錄；找不到來源的地方標「未驗證」，不推測、不編造。
        </p>
        <div className="cbt-meta">
          <span>資料查核日：2026-11-05</span>
          <span>來源：公開網頁、政府文件與新聞，人工整理</span>
          <span className="sample">範例資料 Sample data</span>
        </div>

        <nav aria-label="本報告目錄" className="cbt-noprint" style={{ marginTop: 18 }}>
          <ol className="cbt-meta" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li>
              <a href="#summary">摘要</a>
            </li>
            {DIMENSIONS.map((d) => (
              <li key={d.id}>
                <a href={`#${d.id}`}>
                  §{d.no} {d.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#sources">來源</a>
            </li>
          </ol>
        </nav>

        <section id="summary" className="cbt-sec" aria-labelledby="summary-h">
          <div className="cbt-sec-h">
            <span className="no">§0</span>
            <h2 id="summary-h">摘要</h2>
            <span className="en">Executive Summary</span>
          </div>
          <ul className="cbt-list" style={{ marginBottom: 22 }}>
            {CLIENT_SUMMARY.map((x) => (
              <li key={x.text}>
                {x.text}
                <Cites refs={US_VIEW.cite(x)} />
              </li>
            ))}
          </ul>
          <div className="cbt-tablewrap">
            <table className="cbt-table">
              <thead>
                <tr>
                  <th scope="col">市場</th>
                  <th scope="col">進入判斷</th>
                  <th scope="col">進入準備度</th>
                  <th scope="col">資料可信度</th>
                  <th scope="col">第一道門</th>
                  <th scope="col">主要障礙</th>
                  <th scope="col">第一個展會</th>
                </tr>
              </thead>
              <tbody>
                {MARKET_VIEWS.map((v) => (
                  <tr key={v.d.id}>
                    <td>
                      <Link href={v.href}>
                        <strong>{v.r.label}</strong>
                      </Link>
                      <div className="cbt-crumb">{v.r.region}</div>
                    </td>
                    <td>
                      <span className="cbt-verdict" data-kind={v.verdict.kind}>
                        {v.verdict.label}
                      </span>
                    </td>
                    <td className="num">{v.readiness ? `${v.readiness.score}／100` : "—"}</td>
                    <td className="num">{LEVEL_ZH[v.confidence]}</td>
                    <td>
                      <span className="cbt-hl">{v.r.firstDoor.text}</span>
                      <Cites refs={v.cite(v.r.firstDoor)} />
                    </td>
                    <td>
                      {v.r.barrier.text}
                      <Cites refs={v.cite(v.r.barrier)} />
                    </td>
                    <td>{v.event ? `${v.event.title}（${ymd(v.event.date)}）` : "未驗證"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cbt-note">
            進入判斷、進入準備度和資料可信度由 Portolan 的評分程式依各市場的來源計算（與每個 dossier 相同的算法）；資料可信度「低」代表多數利害關係人只有單一來源，建議會前再補查。
          </p>
        </section>

        <Section i={0}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <ul className="cbt-list">
                {v.r.opportunity.map((x) => (
                  <li key={x.text}>
                    {x.text}
                    <Cites refs={v.cite(x)} />
                  </li>
                ))}
              </ul>
            </Market>
          ))}
        </Section>

        <Section i={1}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <div className="cbt-tablewrap">
                <table className="cbt-table">
                  <thead>
                    <tr>
                      <th scope="col">對象</th>
                      <th scope="col">影響力</th>
                      <th scope="col">下一步</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.people.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.contactFirst && <span aria-label="先聯絡">★ </span>}
                          <strong>{p.name}</strong>
                          <div className="cbt-crumb">{p.category}</div>
                        </td>
                        <td className="num">
                          <Link href={`${v.href}/map`} title="在地圖上看算法和來源">
                            {p.influence ?? "—"}
                          </Link>
                        </td>
                        <td>
                          {p.next}
                          {p.why && <div className="cbt-crumb">{p.why}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Market>
          ))}
        </Section>

        <Section i={2}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <ul className="cbt-list">
                {v.r.access.map((x) => (
                  <li key={x.text}>
                    <span className="cbt-tag">{x.route}</span>
                    {x.text}
                    <Cites refs={v.cite(x)} />
                  </li>
                ))}
              </ul>
            </Market>
          ))}
        </Section>

        <Section i={3}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <table className="cbt-table">
                <thead>
                  <tr>
                    <th scope="col">項目</th>
                    <th scope="col">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {v.r.budget.map((b) => (
                    <tr key={b.item}>
                      <td>{b.item}</td>
                      <td className="num">
                        {b.amount ? (
                          <>
                            {b.amount}
                            <Cites refs={v.cite({ text: b.item, keys: b.keys })} />
                          </>
                        ) : (
                          <span className="cbt-unv">未驗證／需客戶提供</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Market>
          ))}
        </Section>

        <Section i={4}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <ol className="cbt-list">
                {v.r.procurement.map((x, i) => (
                  <li key={x.text}>
                    <span className="cbt-tag">{i + 1}</span>
                    {x.text}
                    <Cites refs={v.cite(x)} />
                  </li>
                ))}
                {v.r.gaps.map((g) => (
                  <li key={g}>
                    <span className="cbt-unv">未驗證</span> {g}
                  </li>
                ))}
              </ol>
            </Market>
          ))}
        </Section>

        <Section i={5}>
          {MARKET_VIEWS.map((v) => (
            <Market key={v.d.id} v={v}>
              <div className="cbt-plan">
                {(["d30", "d60", "d90"] as const).map((k, i) => (
                  <div key={k}>
                    <div className="day">{["0–30 天", "31–60 天", "61–90 天"][i]}</div>
                    {v.r.plan[k].map((s) => (
                      <p key={s.text}>
                        {s.text}
                        <Cites refs={v.cite(s)} />
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </Market>
          ))}
        </Section>

        <section id="sources" className="cbt-sec page" aria-labelledby="sources-h">
          <div className="cbt-sec-h">
            <span className="no">§S</span>
            <h2 id="sources-h">來源</h2>
            <span className="en">Sources</span>
          </div>
          <p className="cbt-sec-intro">每個市場自己的來源編號；完整清單（含摘錄和可信度等級）在各市場的「來源」頁。</p>
          <div className="cbt-grid">
            {MARKET_VIEWS.map((v) => (
              <Market key={v.d.id} v={v}>
                <ul className="cbt-sources">
                  {v.usedSources.map((s) => (
                    <li key={s.id}>
                      <span className="lab">{s.label}</span>
                      <span>
                        {s.title}
                        {s.publisher ? ` · ${s.publisher}` : ""} · 查核 {s.verifiedAt}
                        <br />
                        {s.url && <a href={s.url}>{s.url}</a>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Market>
            ))}
          </div>
          <p className="cbt-note">
            本報告是公開資料的研究整理，不是法律或投資建議。範例資料（Sample data）：由 Portolan 團隊依公開來源人工整理，沒有呼叫付費研究
            API；重要決策前請再向專業顧問確認。
          </p>
        </section>
      </main>
    </div>
  );
}
