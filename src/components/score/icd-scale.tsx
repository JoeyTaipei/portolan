import type { IcdTerm } from "@/lib/types";

// ICD 203 probability scale: seven segments, one lit, always with the term and its range.
export const ICD: Record<IcdTerm, { label: string; range: string; index: number }> = {
  almost_no_chance: { label: "almost no chance", range: "1–5%", index: 0 },
  very_unlikely: { label: "very unlikely", range: "5–20%", index: 1 },
  unlikely: { label: "unlikely", range: "20–45%", index: 2 },
  roughly_even: { label: "roughly even chance", range: "45–55%", index: 3 },
  likely: { label: "likely", range: "55–80%", index: 4 },
  very_likely: { label: "very likely", range: "80–95%", index: 5 },
  almost_certain: { label: "almost certain", range: "95–99%", index: 6 },
};

export function icdText(term: IcdTerm): string {
  const t = ICD[term];
  return `${t.label.charAt(0).toUpperCase()}${t.label.slice(1)} (${t.range})`;
}

export function IcdScale({ term }: { term: IcdTerm }) {
  const on = ICD[term].index;
  return (
    <div>
      <div className="icd" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={i === on ? "on" : undefined} />
        ))}
      </div>
      <div className="icd-k" aria-hidden="true">
        <span>remote</span>
        <span>even</span>
        <span>certain</span>
      </div>
    </div>
  );
}
