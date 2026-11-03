import type { Mark } from "./model";
import { MarkIcon } from "./node-mark";
import { s } from "./marks";
import { Both, useT } from "@/lib/i18n/client";

// MAP-8: same marks as the map, plus the team layer's teammate and warm-tie marks (S7).
const MARKS: Mark[] = ["supportive", "neutral", "resistant", "unknown", "event"];

export function Legend() {
  const t = useT();
  return (
    <ul aria-label={t("Legend")} className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 font-sans text-[12.5px] text-ink2">
      {MARKS.map((m) => (
        <li key={m} className="flex items-center gap-1.5">
          <MarkIcon mark={m} withText />
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <circle className={s.hl} r="7" />
        </svg>
        <Both k="Contact first" />
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-12 -7 24 14" width="22" height="13" aria-hidden="true" className="overflow-visible">
          <circle cx="-7" r="3" className={s.neu} />
          <circle cx="5" r="6" className={s.neu} />
        </svg>
        <Both k="Size = influence" />
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <circle r="6" style={{ fill: "var(--paper)", stroke: "var(--ink)" }} strokeWidth="2" />
        </svg>
        <Both k="Your team" />
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <path d="M-8 0H8" style={{ stroke: "var(--ink)" }} strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        <Both k="Warm tie" />
      </li>
    </ul>
  );
}
