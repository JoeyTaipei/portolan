import Link from "next/link";

// Minimal home until S1 builds the Dossiers screen.
export default function Home() {
  return (
    <main className="frame flex flex-col justify-center gap-4 px-6 py-16">
      <p className="m-0 text-[13px] font-semibold text-ink2">Market entry intelligence</p>
      <h1 className="m-0 text-[40px] font-bold uppercase leading-none tracking-[.02em]">Portolan</h1>
      <p className="m-0 max-w-[34ch] text-ink2">
        Sourced stakeholder maps and briefs for entering a new market.
      </p>
      <Link className="btn btn-main self-start" href="/d/sample">
        Open the sample dossier
      </Link>
    </main>
  );
}
