import { Nis } from "@/components/shell/nis";
import { SharedFrame } from "@/components/report/shared-frame";

// Invalid share link → 404, without saying whether a report ever existed (spec §9).
export default function SharedNotFound() {
  return (
    <SharedFrame isSample={false}>
      <Nis
        kind="empty"
        headingLevel={1}
        title="Report not found"
        desc="This link doesn't open a shared report. Check the link with the person who sent it."
        actions={[{ label: "Open the sample market", href: "/d/sample" }]}
      />
    </SharedFrame>
  );
}
