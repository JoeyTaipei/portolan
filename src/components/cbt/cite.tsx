import type { CiteRef } from "./model";

/** [S3][S7]: each source number opens that market's source list at the cited source. */
export function Cites({ refs }: { refs: CiteRef[] }) {
  if (refs.length === 0) return <span className="cbt-unv">未驗證</span>;
  return (
    <span className="cbt-cites">
      {refs.map((r) => (
        <a key={r.label} href={r.href} title={r.title} className="cbt-cite">
          {r.label}
        </a>
      ))}
    </span>
  );
}
