import type { ReactNode } from "react";
import { Both } from "@/lib/i18n/client";

// Exhibit frame (direction.md): "Exhibit N" + one-line finding above, how to read it + source below.
export function Exhibit({
  n,
  finding,
  howToRead,
  className = "",
  bodyClassName = "",
  children,
}: {
  n: number;
  finding: ReactNode;
  howToRead: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`exhibit ${className}`}>
      <p className="ex-t">
        <span>
          <Both k="Exhibit {n}" vars={{ n }} />
        </span>
        {finding}
      </p>
      <div className={`relative min-h-0 ${bodyClassName}`}>{children}</div>
      <figcaption className="ex-src">{howToRead}</figcaption>
    </figure>
  );
}
