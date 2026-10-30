// Placeholder until slice S1 replaces it with the Dossiers screen (design/screens/01-dossiers.png).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-3 bg-[#F3EEE4] px-6 py-16 text-[#1C1B19]">
      <p className="font-mono text-xs tracking-widest text-[#6B655B]">MARKET ENTRY INTELLIGENCE</p>
      <h1 className="font-serif text-4xl font-semibold leading-tight">
        PORTOLAN <span className="font-normal italic text-[#A8441F]">{"// Cognitive Brief"}</span>
      </h1>
      <p className="max-w-sm font-serif text-lg italic text-[#4F4A42]">
        Turning unverified public data into evidence-backed, fully traceable stakeholder influence maps.
      </p>
    </main>
  );
}
