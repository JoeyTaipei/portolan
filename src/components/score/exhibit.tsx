import type { ReactNode } from "react";

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
  finding: string;
  howToRead: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`exhibit ${className}`}>
      <p className="ex-t">
        <span>Exhibit {n}</span>
        {finding}
      </p>
      <div className={`relative min-h-0 ${bodyClassName}`}>{children}</div>
      <figcaption className="ex-src">{howToRead}</figcaption>
    </figure>
  );
}
