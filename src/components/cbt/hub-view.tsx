import Link from "next/link";
import { Cites } from "./cite";
import { CLIENT_SUMMARY, LEVEL_ZH, MARKET_VIEWS, US_VIEW, ymd } from "./model";

// 碳基 hub (MKT-3): who the client is, where each of the four markets stands, and links into
// each market (map, brief, one-page A4, tracker) and the six-dimension report.

export function HubView() {
  return (
    <div className="cbt-desk">
      <header className="cbt-bar">
        <Link href="/" className="cbt-brand">
          Portolan
        </Link>
        <span className="cbt-crumb">碳基科技 · 海外市場</span>
        <span className="sample">Sample data</span>
        <span className="acts">
          <Link href="/cbt/report" className="btn btn-main btn-s">
            六大面向報告
          </Link>
        </span>
      </header>

      <main className="cbt-sheet">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div>
            <p className="cbt-kicker">Client · 碳基科技 Carbon-Based Technology (UAVER) · 興櫃 7719 · 台中</p>
            <h1 className="cbt-h1">碳基要去哪裡拿第一筆海外合作</h1>
            <p className="cbt-lede">四個市場、一張地圖一個市場：誰是關鍵、先找誰、要花多少、怎麼走到第一份合約。每一句都附來源，點方框編號可看原文。</p>
          </div>
          <aside className="mt-6 border-t-2 border-ink pt-3 lg:mt-0">
            <h2 className="m-0 mb-2 text-[15px] font-extrabold">公司現況</h2>
            <ul className="cbt-list">
              {CLIENT_SUMMARY.slice(0, 4).map((x) => (
                <li key={x.text} style={{ fontSize: 14 }}>
                  {x.text}
                  <Cites refs={US_VIEW.cite(x)} />
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section className="cbt-sec" aria-labelledby="mkts-h">
          <div className="cbt-sec-h">
            <span className="no">4</span>
            <h2 id="mkts-h">市場</h2>
            <span className="en">Markets</span>
          </div>
          <div className="cbt-docket">
            {MARKET_VIEWS.map((v) => (
              <article key={v.d.id} className="cbt-row" aria-labelledby={`${v.d.id}-h`}>
                <div>
                  <h3 id={`${v.d.id}-h`}>{v.r.label}</h3>
                  <div className="sub">{v.r.region}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className="cbt-verdict" data-kind={v.verdict.kind}>
                      {v.verdict.label}
                    </span>
                  </div>
                </div>
                <dl className="cbt-kv">
                  <dt>第一道門</dt>
                  <dd>
                    <span className="cbt-hl">{v.r.firstDoor.text}</span>
                    <Cites refs={v.cite(v.r.firstDoor)} />
                  </dd>
                  <dt>主要障礙</dt>
                  <dd>
                    {v.r.barrier.text}
                    <Cites refs={v.cite(v.r.barrier)} />
                  </dd>
                  <dt>先聯絡</dt>
                  <dd>
                    {v.people
                      .filter((p) => p.contactFirst)
                      .map((p) => p.name)
                      .join("、") || "—"}
                  </dd>
                  <dt>展會</dt>
                  <dd>{v.event ? `${v.event.title}（${ymd(v.event.date)}）` : "未驗證"}</dd>
                  <dt>數據</dt>
                  <dd>
                    進入準備度 {v.readiness ? `${v.readiness.score}／100` : "—"} · 資料可信度 {LEVEL_ZH[v.confidence]} · {v.sourceCount} 個來源
                  </dd>
                </dl>
                <div className="acts">
                  <Link href={v.href} className="btn btn-main btn-s">
                    開啟市場
                  </Link>
                  <Link href={`${v.href}/map`} className="btn btn-ghost btn-s">
                    地圖
                  </Link>
                  <Link href={`${v.href}/report`} className="btn btn-ghost btn-s">
                    一頁 A4
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="cbt-note">
          範例資料（Sample data）：Portolan 團隊在 2026-11-05 依公開網頁人工整理，沒有呼叫付費研究 API。在市場裡做的變更只存在你的瀏覽器。找不到來源的項目標「未驗證」。
        </p>
      </main>
    </div>
  );
}
