"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { listDossiers, rememberDossier } from "@/lib/browser-dossiers";
import { checkDossiers } from "./check-dossiers";

/** On /d/[id]: remember this dossier (id + name only) in this browser. The sample is skipped. */
export function RememberVisit({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    rememberDossier(id, name);
  }, [id, name]);
  return null;
}

/** On /: open the most recently opened dossier if it still loads; otherwise stay on the sample. */
export function OpenLastDossier() {
  const router = useRouter();
  useEffect(() => {
    const last = listDossiers()[0];
    if (!last) return;
    let live = true;
    checkDossiers([last.id])
      .then((r) => {
        if (live && r.ok && r.data.length > 0) router.replace(`/d/${r.data[0].id}`);
      })
      .catch(() => {
        // stay on the sample
      });
    return () => {
      live = false;
    };
  }, [router]);
  return null;
}
