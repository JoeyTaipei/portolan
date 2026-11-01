import type { ReactNode } from "react";

// Numbered paragraphs (Estimate `.paras`): so a meeting can ask "what's the source for point 2?".
export function Paras({ items, label }: { items: { key: string; body: ReactNode }[]; label?: string }) {
  return (
    <ol className="paras" aria-label={label}>
      {items.map((it) => (
        <li key={it.key}>
          <div>{it.body}</div>
        </li>
      ))}
    </ol>
  );
}
