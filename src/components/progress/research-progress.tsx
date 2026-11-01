// CONTRACT STUB (plan P-10). Engine lane owns this from S4 on (RES-1 progress screen and the
// refresh "Needs your check" list). Until then both render a .nis placeholder.
import { Nis } from "@/components/shell/nis";

export function ResearchProgress({ dossierId }: { dossierId: string }) {
  void dossierId;
  return (
    <Nis
      kind="empty"
      title="Research isn't running"
      desc="Live research isn't switched on yet. Open the sample dossier to see a finished one."
      actions={[{ label: "Open the sample dossier", href: "/d/sample" }]}
    />
  );
}

export function MatchCheckList({ dossierId }: { dossierId: string }) {
  void dossierId;
  return null;
}
