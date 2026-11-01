import { Nis } from "./nis";

// SHELL-2 "Dossier not found" (spec §6). Same copy whether the id never existed or is malformed.
export function NotFoundState() {
  return (
    <Nis
      kind="empty"
      headingLevel={1}
      title="Dossier not found"
      desc="This link doesn't open a dossier. Check the link, or open the sample."
      actions={[
        { label: "Open the sample dossier", href: "/d/sample" },
        { label: "Go to Dossiers", href: "/" },
      ]}
    />
  );
}
