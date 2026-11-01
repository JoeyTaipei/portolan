import Link from "next/link";
import { Stamp } from "@/components/score/stamp";
import { fmtDay, type WatchItem } from "./model";

// DOC-13 watch list (90–180 days): future events research found (automatic) and the next
// monthly update date (manual, from the latest watch-list document).
export function WatchList({ dossierId, items, nextUpdate }: { dossierId: string; items: WatchItem[]; nextUpdate: string | null }) {
  return (
    <section aria-labelledby="watch-h" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="watch-h" className="m-0 text-[15px] font-bold">
          90–180 day watch
        </h2>
        <span className="text-[12.5px] text-ink2">{nextUpdate ? <>Next update <span className="num">{fmtDay(nextUpdate)}</span></> : "Monthly update on request"}</span>
      </div>
      {items.length === 0 ? (
        <p className="m-0 text-[13.5px] leading-[1.45] text-ink2">No sourced events in the next 180 days yet. Research adds them here as it finds dated, sourced events.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((e) => (
            <li key={e.id} className="border-t border-rule py-2.5 first:border-t-rule-strong">
              <p className="m-0 text-[14px] font-semibold leading-snug">{e.title}</p>
              <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink2">
                <span className="num">{e.date ? fmtDay(e.date) : "Date unverified"}</span>
                {e.refs[0] && (
                  <>
                    <Stamp reliability={e.refs[0].reliability} credibility={e.refs[0].credibility} />
                    <Link href={`/d/${dossierId}/sources?id=${encodeURIComponent(e.refs[0].id)}`} className="font-semibold text-ink no-underline hover:underline">
                      [{e.refs[0].label}]
                    </Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
