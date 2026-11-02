import { Both } from "@/lib/i18n/client";
import Link from "next/link";

/** "Join the waitlist" line at the foot of the Docs tab and the share page; never printed. */
export function WaitlistLink({ from, className = "" }: { from: "docs" | "share"; className?: string }) {
  return (
    <p className={`m-0 border-t border-rule pt-4 text-[15px] text-ink2 print:hidden ${className}`}>
      <Both k="Want Portolan for your own market?" />{" "}
      <Link href={`/waitlist?from=${from}`} className="font-semibold">
        <Both k="Join the waitlist" />
      </Link>
    </p>
  );
}
