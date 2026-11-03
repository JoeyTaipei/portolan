import { Both } from "@/lib/i18n/client";
import { Nis } from "./nis";

// SHELL-2 "Market not found" (spec §6). Same copy whether the id never existed or is malformed.
export function NotFoundState() {
  return (
    <Nis
      kind="empty"
      headingLevel={1}
      title={<Both k="Market not found" />}
      desc={<Both k="This link doesn't open a market. Check the link, or open the sample." />}
      actions={[
        { label: <Both k="Open the sample market" />, href: "/d/sample" },
        { label: <Both k="Go to Markets" />, href: "/" },
      ]}
    />
  );
}
