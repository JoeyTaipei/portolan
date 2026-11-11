import type { Metadata } from "next";
import { ReportView } from "@/components/cbt/report-view";
import "@/components/cbt/cbt.css";

// MKT-3: the 碳基 six-dimension expansion report. Static; prints to PDF from the browser.
export const metadata: Metadata = {
  title: "碳基科技 海外市場進入報告 · Portolan",
  robots: { index: false, follow: false },
};

export default function CbtReportPage() {
  return <ReportView />;
}
