import {
  EXPORT_CHECK,
  NO_FIRST_BUYER,
  REQUIREMENT_LABEL,
} from "@/components/brief/model";
import { MarkIcon } from "@/components/map/node-mark";
import { STANCE_LABEL, type SourceRef } from "@/components/score/explain";
import { icdText } from "@/components/score/icd-scale";
import { Stamp } from "@/components/score/stamp";
import { getT } from "@/lib/i18n/server";
import { MapExhibit } from "./map-exhibit";
import type { ReportVM } from "./model";
import "./report.css";

// 05 One-page A4 report (REP-1…11). Every sentence carries its source labels; the foot lists
// the table's sources with grade and verified date. Shared by /d/[id]/report and /s/[shareId].

function dedupeRefs(refs: SourceRef[]): SourceRef[] {
  return refs.filter((r, i) => refs.findIndex((x) => x.id === r.id) === i);
}

function Cite({ refs }: { refs: SourceRef[] }) {
  if (refs.length === 0) return null;
  return (
    <span className="rp-cite"> [{refs.map((r) => r.label).join(", ")}]</span>
  );
}

export async function A4Report({ r, shareUrl }: { r: ReportVM; shareUrl: string }) {
  const t = await getT();
  const route = r.exhibit.route
    .map((id) => r.exhibit.nodes.find((n) => n.id === id)?.short)
    .filter((n): n is string => !!n);
  const names = t.locale === "zh-TW" ? route.join("、") : route.length === 1 ? route[0] : `${route.slice(0, -1).join(", ")} and ${route.at(-1)}`;
  const takeaway =
    route.length > 0 ? t("Contact {name} first.", { name: names }) : t("No stakeholder is ready to contact first yet.");

  return (
    <article
      className="rp-sheet"
      aria-label={t("One-page market entry brief")}
      data-testid="a4-sheet"
    >
      <header className="rp-head">
        <div className="rp-cart">
          <div className="k">
            <span>{t("Market entry brief · Confidential")}</span>
            {r.isSample && <span className="sample">{t("Sample data")}</span>}
          </div>
          <h1>{r.name}</h1>
          {r.preparedFor && (
            <p>
              {t("Prepared for")} <b>{r.preparedFor.company}</b>,{" "}
              {r.preparedFor.product}, {t.dt(r.preparedFor.date)}
            </p>
          )}
        </div>
        <div className="rp-brand">
          <span className="wm">Portolan</span>
          <div>
            <span className="vk">{t("Entry verdict")}</span>
            <b
              className={`rp-verdict ${r.verdict.kind}`}
              data-testid="a4-verdict"
            >
              {t.k(r.verdict.label)}
            </b>
            <span>
              {t("Data confidence {value}; {note|t}.", { value: t.x(r.confidence.value ?? ""), note: t.x(r.confidence.note) })}
            </span>
          </div>
        </div>
      </header>

      <div className="rp-row">
        <section>
          {r.judgment && (
            <section className="rp-bottom" aria-label={t("Bottom line")}>
              <p>
                <b>{t("Bottom line:")}</b> {r.judgment.text}{" "}
                <span className="t">
                  {t("{icd|t}, {level|t} confidence.", { icd: t.k(icdText(r.judgment.icd)), level: t.locale === "zh-TW" ? t.k(r.judgment.confidence) : r.judgment.confidence.toLowerCase() })}
                </span>
                <Cite refs={r.judgment.refs} />
              </p>
              {r.verdict.lead && (
                <>
                  <p className="rp-vlead">{t.k(r.verdict.lead)}</p>
                  <ul className="rp-vreasons">
                    {r.verdict.reasons.map((x) => (
                      <li key={x.text}>
                        {t.k(x.text)}
                        <Cite refs={x.refs} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
          <p className="rp-lab">{t("Executive summary")}</p>
          <p className="rp-summary">
            {r.summary.length === 0
              ? t("Not enough sourced facts for this section.")
              : r.summary.map((s, i) => (
                  <span key={i}>
                    {s.text}
                    <Cite refs={s.refs} />{" "}
                  </span>
                ))}
          </p>
          <div className="rp-kj">
            {r.metrics.map((m) => (
              <div key={m.key} className={m.key === "window" ? "w" : undefined}>
                {m.value ? <b>{t.x(m.value)}</b> : <b className="none">{t.x(m.note)}</b>}
                <span>
                  {t.k(m.label)}
                  {m.value
                    ? t.locale === "zh-TW"
                      ? `，${t.x(m.note)}`
                      : `, ${m.note.charAt(0).toLowerCase()}${m.note.slice(1)}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
        <MapExhibit exhibit={r.exhibit} takeaway={takeaway} />
      </div>

      <section>
        <p className="rp-lab">{t("Top {n} stakeholders by influence", { n: r.top.length })}</p>
        <table className="rp-table">
          <thead>
            <tr>
              <th>{t("Stakeholder")}</th>
              <th>{t("Stance")}</th>
              <th>{t("Influence")}</th>
              <th className="nx">{t("Next move")}</th>
              <th>{t("Sources")}</th>
            </tr>
          </thead>
          <tbody>
            {r.top.map((row) => (
              <tr key={row.id}>
                <td className="nm">
                  {row.first && (
                    <span
                      className="k"
                      aria-label={
                        t.locale === "zh-TW"
                          ? t("Contact {n}", { n: row.first })
                          : `Contact ${row.first}${row.first === 1 ? "st" : row.first === 2 ? "nd" : "rd"}`
                      }
                    >
                      {row.first}
                    </span>
                  )}
                  {row.name}
                </td>
                <td className="st">
                  <MarkIcon mark={row.mark} />
                  {t.k(STANCE_LABEL[row.mark])}
                </td>
                <td className="in">{t.x(row.influence)}</td>
                <td className={row.nextVerified ? undefined : "un"}>{t.k(row.next)}</td>
                <td className="src">
                  {row.refs.map((s) => (
                    <span
                      key={s.id}
                      className="mr-1 inline-block"
                      title={s.title}
                    >
                      {s.label}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="rp-cols">
        <section>
          {r.hasRoutes ? (
            <>
              <p className="rp-lab">{t("Most likely first buyer")}</p>
              {r.firstBuyer ? (
                <p className="rp-path" data-testid="a4-first-buyer">
                  <b>{r.firstBuyer.who}</b>, {t.k(r.firstBuyer.how)}. {t("Why:")}{" "}
                  {t.x(r.firstBuyer.why)}.
                  <Cite refs={r.firstBuyer.refs} />
                </p>
              ) : (
                <p className="rp-path">{t.k(NO_FIRST_BUYER)}.</p>
              )}
            </>
          ) : (
            <>
              <p className="rp-lab">{t("Recommended entry path")}</p>
              {r.path.length === 0 ? (
                <p className="rp-path">
                  {t("Not enough sourced facts for this section.")}
                </p>
              ) : (
                <p className="rp-path">
                  {r.path.map((p, i) => (
                    <span key={p.stakeholderId}>
                      {i > 0 && " → "}
                      <b>{p.who}</b>
                    </span>
                  ))}
                  <Cite refs={dedupeRefs(r.path.flatMap((p) => p.why.refs))} />
                  <span className="sub">
                    {t("In this order; the reasons for each step are in the strategy brief.")}
                  </span>
                </p>
              )}
            </>
          )}
          <p className="rp-lab">{t("7-day plan")}</p>
          <ol className="rp-wps">
            {r.plan.map((p, i) => (
              <li key={p.days}>
                <span className="wp">{i + 1}</span>
                <span>
                  <b>{t.k(p.days)}.</b> {t.k(p.text)}
                  <Cite refs={p.refs} />
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <p className="rp-lab">{t("Partner candidates")}</p>
          {r.partners.length === 0 ? (
            <p className="rp-list">
              {t("No Taiwanese firm with sourced evidence yet.")}
            </p>
          ) : (
            <ul
              className="rp-list"
              aria-label={t("Partner candidates")}
              data-testid="a4-partners"
            >
              {r.partners.map((p, i) => (
                <li key={p.id}>
                  <b>
                    {i + 1}. {p.short}
                  </b>
                  {t(p.sources === 1 ? ", {n} source" : ", {n} sources", { n: p.sources })}
                  {p.buyers > 0 && t(p.buyers === 1 ? ", tied to {n} buyer" : ", tied to {n} buyers", { n: p.buyers })}
                  {p.flags.length > 0 && (t.locale === "zh-TW" ? `；${p.flags.map(t.k).join("、")}` : `; ${p.flags.join(", ")}`)}
                  <Cite refs={p.refs} />
                </li>
              ))}
            </ul>
          )}
          {r.requirements.length > 0 ? (
            <>
              <p className="rp-lab" style={{ marginTop: 11 }}>
                {t("Entry requirements")}
              </p>
              <ul className="rp-list rp-req" aria-label={t("Entry requirements")}>
                {r.requirements.map((x) => (
                  <li key={x.topic}>
                    <b>{t.k(x.label)}.</b> {x.text}
                    <Cite refs={x.refs} />
                  </li>
                ))}
                {r.exportCheck && (
                  <li className="chk">
                    <b>{t.k(REQUIREMENT_LABEL.export_control)}.</b>{" "}
                    <i>{t.k(EXPORT_CHECK)}</i>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="rp-lab" style={{ marginTop: 11 }}>
                {t("Key risks")}
              </p>
              {r.risks.length === 0 ? (
                <p className="rp-list">
                  {t("Not enough sourced facts for this section.")}
                </p>
              ) : (
                <ul className="rp-list rp-haz">
                  {r.risks.map((s, i) => (
                    <li key={i}>
                      {s.text}
                      <Cite refs={s.refs} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <p className="rp-gaps" data-testid="a4-gaps">
        <b>{t("Not verified:")}</b>{" "}
        {r.gaps.items.length === 0
          ? t("every item on this page has a source.")
          : `${r.gaps.items.map(t.x).join(" · ")}${r.gaps.more ? t(", and {n} more in the strategy brief", { n: r.gaps.more }) : ""}${t(".")}`}
      </p>

      <footer className="rp-srcs">
        <ol aria-label={t("Sources in the table")}>
          {r.sources.map((s) => (
            <li key={s.id} title={s.title}>
              [{s.label}]{" "}
              <Stamp reliability={s.reliability} credibility={s.credibility} />
              {s.verifiedAt
                ? t("checked {date}", { date: t.date(s.verifiedAt, { utc: true }) })
                : t("date unverified")}{" "}
              · {s.title}
            </li>
          ))}
        </ol>
        <div className="rp-foot">
          <span>
            {t("Full list of {n} cited sources:", { n: r.citedIds.length })}{" "}
            <b>{shareUrl}/sources</b>
          </span>
          {r.isSample && (
            <span>{t("Sample data · every claim links to a cited source")}</span>
          )}
        </div>
      </footer>
    </article>
  );
}
