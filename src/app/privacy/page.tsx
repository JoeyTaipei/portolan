import Link from "next/link";

export const metadata = { title: "Privacy · Portolan" };

// Privacy notice (spec §10.8). S2 ships the structure with what is already true; S8 completes
// the wording before the URL goes to users.

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "what-we-store",
    title: "What we store",
    body: [
      "For each dossier: the company, product, goal and optional details you enter, your email address, the research results with their sources, and anything you add, such as tracker items, meeting debriefs and documents.",
    ],
  },
  {
    id: "processors",
    title: "Who processes your research",
    body: [
      "Your research inputs and the web pages fetched for them are sent to Parallel (web research) and Anthropic (analysis and writing) to produce the dossier. Fetched pages are treated as data, never as instructions.",
    ],
  },
  {
    id: "link",
    title: "Your dossier link is the only key",
    body: [
      "There is no login. Anyone with the dossier link can view and change that dossier, so keep it private. The share link opens only the one-page report and the sources it cites: not the tracker, debriefs, team contacts or documents.",
    ],
  },
  {
    id: "team-ties",
    title: "Team contacts",
    body: [
      "If teammates upload a LinkedIn or contacts export, only name, title, organisation and LinkedIn URL are read; email addresses and phone numbers are dropped. Only contacts that match an organisation on the map are kept, and they belong to that dossier alone.",
      "Each teammate confirms they may share their contacts (self-certified). Withdrawing deletes that teammate's contacts and ties from the dossier.",
    ],
  },
  {
    id: "deletion",
    title: "Deleting a dossier",
    body: ["To have a dossier deleted, email the team from the address you used to create it and include the dossier link."],
  },
  {
    id: "not-advice",
    title: "Research, not advice",
    body: ["Dossiers, reports and documents are research references. They are not legal or investment advice."],
  },
];

export default function PrivacyPage() {
  return (
    <div className="frame flex flex-col">
      <header className="flex items-center border-b border-rule-strong bg-[var(--bar)] px-[18px] py-3 lg:h-[58px] lg:px-6 lg:py-0">
        <Link href="/" className="text-[17px] font-bold uppercase tracking-[.12em] text-[var(--bar-ink)] no-underline">
          Portolan
        </Link>
      </header>
      <main className="flex-1 px-4 pt-8 pb-16 lg:grid lg:grid-cols-[240px_minmax(0,68ch)] lg:gap-12 lg:px-12 min-[1600px]:px-24">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-6 m-0 flex list-none flex-col gap-1.5 border-l border-rule-strong p-0 pl-3 text-[14px]">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-[68ch]">
          <h1 className="m-0 text-[31px] font-extrabold leading-[1.05]">Privacy</h1>
          <p className="mt-2 mb-6 text-[15px] text-ink2">What Portolan keeps, who processes it and how to have it removed.</p>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6 border-t border-rule py-4">
              <h2 id={`${s.id}-h`} className="m-0 mb-1.5 text-[17px] font-bold">
                {s.title}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="m-0 mb-2 text-[15px] leading-[1.55]">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
