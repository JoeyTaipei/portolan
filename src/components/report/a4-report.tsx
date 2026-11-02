import { EXPORT_CHECK, fmtDay, REQUIREMENT_LABEL } from "@/components/brief/model";
import { MarkIcon } from "@/components/map/node-mark";
import { STANCE_LABEL, type SourceRef } from "@/components/score/explain";
import { IcdScale, icdText } from "@/components/score/icd-scale";
import { Stamp } from "@/components/score/stamp";
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
  return <span className="rp-cite"> [{refs.map((r) => r.label).join(", ")}]</span>;
}

export function A4Report({ r, shareUrl }: { r: ReportVM; shareUrl: string }) {
  const route = r.exhibit.route
    .map((id) => r.exhibit.nodes.find((n) => n.id === id)?.short)
    .filter((n): n is string => !!n);
  const takeaway =
    route.length > 0 ? `Contact ${route.length === 1 ? route[0] : `${route.slice(0, -1).join(", ")} and ${route.at(-1)}`} first.` : "No stakeholder is ready to contact first yet.";

  return (
    <article className="rp-sheet" aria-label="One-page market entry brief" data-testid="a4-sheet">
      <header className="rp-head">
        <div className="rp-cart">
          <div className="k">
            <span>Market entry brief · Confidential</span>
            {r.isSample && <span className="sample">Sample data</span>}
          </div>
          <h1>{r.name}</h1>
          {r.preparedFor && (
            <p>
              Prepared for <b>{r.preparedFor.company}</b>, {r.preparedFor.product}, {r.preparedFor.date}
            </p>
          )}
        </div>
        <div className="rp-brand">
          <span className="wm">Portolan</span>
          <div>
            <b>{r.confidence.value}</b>
            <span>
              Data confidence. {r.stakeholderCount} stakeholders mapped; {r.confidence.note}.
            </span>
          </div>
        </div>
      </header>

      <div className="rp-row">
        <section>
          {r.judgment && (
            <section className="rp-bottom" aria-label="Bottom line">
              <p>
                <b>Bottom line:</b> {r.judgment.text} <span className="t">{icdText(r.judgment.icd)}, {r.judgment.confidence.toLowerCase()} confidence.</span>
                <Cite refs={r.judgment.refs} />
              </p>
              <IcdScale term={r.judgment.icd} />
            </section>
          )}
          <p className="rp-lab">Executive summary</p>
          <p className="rp-summary">
            {r.summary.length === 0
              ? "Not enough sourced facts for this section."
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
                {m.value ? <b>{m.value}</b> : <b className="none">{m.note}</b>}
                <span>
                  {m.label}
                  {m.value ? `, ${m.note.charAt(0).toLowerCase()}${m.note.slice(1)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
        <MapExhibit exhibit={r.exhibit} takeaway={takeaway} />
      </div>

      <section>
        <p className="rp-lab">Top {r.top.length} stakeholders by influence</p>
        <table className="rp-table">
          <thead>
            <tr>
              <th>Stakeholder</th>
              <th>Stance</th>
              <th>Influence</th>
              <th className="nx">Next move</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {r.top.map((t) => (
              <tr key={t.id}>
                <td className="nm">
                  {t.first && <span className="k" aria-label={`Contact ${t.first}${t.first === 1 ? "st" : t.first === 2 ? "nd" : "rd"}`}>{t.first}</span>}
                  {t.name}
                </td>
                <td className="st">
                  <MarkIcon mark={t.mark} />
                  {STANCE_LABEL[t.mark]}
                </td>
                <td className="in">{t.influence}</td>
                <td className={t.nextVerified ? undefined : "un"}>{t.next}</td>
                <td className="src">
                  {t.refs.map((s) => (
                    <span key={s.id} className="mr-1 inline-block" title={s.title}>
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
          <p className="rp-lab">Recommended entry path</p>
          {r.path.length === 0 ? (
            <p className="rp-path">Not enough sourced facts for this section.</p>
          ) : (
            <p className="rp-path">
              {r.path.map((p, i) => (
                <span key={p.stakeholderId}>
                  {i > 0 && " → "}
                  <b>{p.who}</b>
                </span>
              ))}
              <Cite refs={dedupeRefs(r.path.flatMap((p) => p.why.refs))} />
              <span className="sub">In this order; the reasons for each step are in the strategy brief.</span>
            </p>
          )}
          <p className="rp-lab">7-day plan</p>
          <ol className="rp-wps">
            {r.plan.map((p, i) => (
              <li key={p.days}>
                <span className="wp">{i + 1}</span>
                <span>
                  <b>{p.days}.</b> {p.text}
                  <Cite refs={p.refs} />
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <p className="rp-lab">Where to meet them</p>
          {r.meet.length === 0 ? (
            <p className="rp-list">No sourced event with a date yet.</p>
          ) : (
            <ul className="rp-list">
              {r.meet.map((m) => (
                <li key={m.title}>
                  <b>{m.title}</b>, {fmtDay(m.date)}.
                  {m.mapped > 0 && ` ${m.mapped} mapped stakeholder${m.mapped === 1 ? "" : "s"} expected.`}
                </li>
              ))}
            </ul>
          )}
          {r.requirements.length > 0 ? (
            <>
              <p className="rp-lab" style={{ marginTop: 11 }}>
                Entry requirements
              </p>
              <ul className="rp-list rp-req" aria-label="Entry requirements">
                {r.requirements.map((x) => (
                  <li key={x.topic}>
                    <b>{x.label}.</b> {x.text}
                    <Cite refs={x.refs} />
                  </li>
                ))}
                {r.exportCheck && (
                  <li className="chk">
                    <b>{REQUIREMENT_LABEL.export_control}.</b> <i>{EXPORT_CHECK}</i>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="rp-lab" style={{ marginTop: 11 }}>
                Key risks
              </p>
              {r.risks.length === 0 ? (
                <p className="rp-list">Not enough sourced facts for this section.</p>
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

      <footer className="rp-srcs">
        <ol aria-label="Sources in the table">
          {r.sources.map((s) => (
            <li key={s.id} title={s.title}>
              [{s.label}] <Stamp reliability={s.reliability} credibility={s.credibility} />
              {s.verifiedAt ? `checked ${fmtDay(s.verifiedAt)}` : "date unverified"} · {s.title}
            </li>
          ))}
        </ol>
        <div className="rp-foot">
          <span>
            Full list of {r.citedIds.length} cited sources: <b>{shareUrl}/sources</b>
          </span>
          {r.isSample && <span>Sample data · every claim links to a cited source</span>}
        </div>
      </footer>
    </article>
  );
}
