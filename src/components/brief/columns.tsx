"use client";

import type { ReactNode } from "react";
import { useFillHeight } from "@/components/map/fill-height";

// Brief layout (spec §6): 280 | 1fr | 380, ≥1600 300 | 1fr | 440. From 1024px each column
// scrolls on its own and the page doesn't; on phones it is one column in reading order.
const col = "lg:min-h-0 lg:overflow-y-auto";

export function BriefColumns({ left, middle, right }: { left: ReactNode; middle: ReactNode; right: ReactNode }) {
  const ref = useFillHeight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="flex flex-col gap-6 px-4 pt-[18px] pb-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_380px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[300px_minmax(0,1fr)_440px]"
    >
      <div className={`${col} flex flex-col gap-4 lg:border-r lg:border-rule-strong lg:px-5 lg:py-[18px] min-[1600px]:px-6`}>{left}</div>
      <div className={`${col} lg:px-8 lg:py-[22px] min-[1600px]:px-12`}>{middle}</div>
      <div className={`${col} flex flex-col gap-3 lg:border-l lg:border-rule-strong lg:bg-panel2 lg:px-5 lg:py-[18px] min-[1600px]:px-6`}>{right}</div>
    </div>
  );
}
