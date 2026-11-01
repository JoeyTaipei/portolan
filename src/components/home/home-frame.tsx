"use client";

import type { ReactNode } from "react";
import { useFillHeight } from "@/components/map/fill-height";

// Home three columns: 300 | 1fr | 340 (≥1600: 320 | 1fr | 400), each column scrolls on its own.
export function HomeFrame({ children }: { children: ReactNode }) {
  const ref = useFillHeight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="flex flex-col gap-[22px] px-[18px] pt-[22px] pb-6 lg:grid lg:h-[calc(100dvh-118px)] lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:gap-0 lg:p-0 min-[1600px]:grid-cols-[320px_minmax(0,1fr)_400px]"
    >
      {children}
    </div>
  );
}
