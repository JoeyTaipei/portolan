import { IcdScale, icdText } from "@/components/score/icd-scale";
import { Paras } from "@/components/score/paras";
import { Stamp } from "@/components/score/stamp";
import type { HomeModel } from "./model";

// Right column key judgments: up to 3 numbered, cited paragraphs from the brief, each with an
// ICD term + range and confidence stated separately.
export function KeyJudgments({ m }: { m: HomeModel }) {
  return (
    <section
      aria-labelledby="kj-h"
      className="flex flex-col gap-2 rounded-[var(--r-m)] border border-l-4 border-rule-strong border-l-[var(--act)] bg-panel px-3.5 py-3"
    >
      <h2 id="kj-h" className="m-0 text-[13px] font-bold text-ink2">
        Key judgments
      </h2>
      {m.judgments.length === 0 ? (
        <p className="m-0 text-[14px] leading-normal text-ink2">
          None yet. Key judgments come from the strategy brief, and only sourced ones are shown.
        </p>
      ) : (
        <Paras
          label="Key judgments"
          items={m.judgments.map((j, i) => ({
            key: String(i),
            body: (
              <>
                <p className="m-0 text-[15px] leading-[1.45]">
                  {j.text} <b>{icdText(j.icd)}</b>.
                </p>
                <IcdScale term={j.icd} />
                <p className="m-0 text-[12.5px] text-ink2">
                  {j.confidence} confidence. Sources{" "}
                  {j.sources.map((s) => (
                    <span key={s.id}>
                      {s.label}
                      <Stamp reliability={s.reliability} credibility={s.credibility} />
                    </span>
                  ))}
                </p>
              </>
            ),
          }))}
        />
      )}
    </section>
  );
}
