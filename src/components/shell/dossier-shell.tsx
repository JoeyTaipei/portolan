import type { ReactNode } from "react";
import { BottomTabs } from "./bottom-tabs";
import { SampleBar } from "./sample-bar";
import { TopBar } from "./top-bar";

// Frame (chart tick border) + top bar + sample bar + content + phone tabs.
export function DossierShell({
  dossierId,
  isSample,
  children,
}: {
  dossierId: string | null;
  isSample: boolean;
  children: ReactNode;
}) {
  return (
    <div className="frame flex flex-col">
      <TopBar dossierId={dossierId} isSample={isSample} />
      {isSample && <SampleBar />}
      <main className="flex-1 pb-[84px] lg:pb-0">{children}</main>
      <BottomTabs dossierId={dossierId} />
    </div>
  );
}
