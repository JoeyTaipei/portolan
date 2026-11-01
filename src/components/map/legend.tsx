import type { Mark } from "./model";
import { MarkIcon } from "./node-mark";
import { s } from "./marks";

// MAP-8: same marks as the map, plus the team layer's teammate and warm-tie marks (S7).
const MARKS: Mark[] = ["supportive", "neutral", "resistant", "unknown", "event"];

export function Legend() {
  return (
    <ul aria-label="Legend" className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[12.5px] text-ink2">
      {MARKS.map((m) => (
        <li key={m} className="flex items-center gap-1.5">
          <MarkIcon mark={m} withText />
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <path className={s.route} d="M-8 0H8" />
        </svg>
        Contact first
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-9 -5 18 10" width="18" height="10" aria-hidden="true" className="overflow-visible">
          <ellipse rx="4" ry="2.2" cx="-4" className={s.d1} />
          <ellipse rx="4" ry="2.2" cx="4" className={s.d3} />
        </svg>
        Deeper = more influence
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <circle r="6" fill="var(--panel)" stroke="var(--act)" strokeWidth="2" />
        </svg>
        Your team
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="-8 -8 16 16" width="15" height="15" aria-hidden="true" className="overflow-visible">
          <path d="M-8 0H8" stroke="var(--act)" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        Warm tie
      </li>
    </ul>
  );
}
