import type { Metadata } from "next";
import { HubView } from "@/components/cbt/hub-view";
import "@/components/cbt/cbt.css";

// MKT-3: the 碳基 demo hub. Static: built from the four sample fixtures, no database, no paid API.
export const metadata: Metadata = {
  title: "碳基科技 · Portolan",
  robots: { index: false, follow: false },
};

export default function CbtPage() {
  return <HubView />;
}
