import { Nis } from "./nis";

// SHELL-2 "Market not found" (spec §6). Same copy whether the id never existed or is malformed.
export function NotFoundState() {
  return (
    <Nis
      kind="empty"
      headingLevel={1}
      title="Market not found"
      desc="This link doesn't open a market. Check the link, or open the sample."
      actions={[
        { label: "Open the sample market", href: "/d/sample" },
        { label: "Go to Markets", href: "/" },
      ]}
    />
  );
}
