"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useRef, useState } from "react";
import { withdrawMember } from "@/lib/team/withdraw";
import { NO_STORAGE, useTeam } from "./team-context";

// §10.7 "Withdraw my connections": after confirming, the member's contacts, ties and drafts are
// deleted at once and the map updates. On the sample that means this browser's copy.
export function WithdrawDialog({ memberId, name, onClose }: { memberId: string; name: string; onClose: () => void }) {
  const team = useTeam()!;
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  function confirm() {
    if (!team.save(withdrawMember(team.state, memberId, new Date()))) {
      setError(t.k(NO_STORAGE));
      return;
    }
    team.setMemberId(null);
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="wd-h"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--r-l)] border border-rule-strong bg-panel p-5 text-ink backdrop:bg-[rgba(20,35,58,.35)]"
    >
      <h2 id="wd-h" className="m-0 text-[18px] font-bold">
        {t("Withdraw {name}'s connections?", { name })}
      </h2>
      <p className="m-0 mt-2 text-[14px] leading-[1.5]">
        {t("Their contacts and ties are deleted from this dossier now, and the map updates at once. Intro drafts already copied elsewhere can't be recalled.")}
      </p>
      {error && (
        <p role="alert" className="m-0 mt-2 text-[13px] text-[var(--res-text)]">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-s" onClick={() => ref.current?.close()}>
          {t("Cancel")}
        </button>
        <button type="button" className="btn btn-main btn-s" onClick={confirm}>
          {t("Withdraw and delete")}
        </button>
      </div>
    </dialog>
  );
}
