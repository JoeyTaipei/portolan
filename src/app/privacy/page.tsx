import Link from "next/link";

export const metadata = { title: "Privacy · Portolan" };

// Privacy notice (spec §10.8), in plain English. Every sentence describes what the code does today.

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "what-we-store",
    title: "What we store",
    body: [
      "For each dossier: the company, product, goal and optional details you enter, your email address, the research results with their sources, and anything you add later, such as tracker items, meeting debriefs, lead and intro requests, and documents.",
      "Your email address is used to send you the dossier link and to count today's research requests. It is never shown on the share link or sent to our analytics.",
      "We count page views and three actions (dossier created, report exported, debrief saved) with PostHog. Dossier and share links are removed from those records before they leave your browser, and no email address is sent.",
      "When you save a debrief, an anonymised outcome (the type of stakeholder, the route and how the meeting went) is kept to improve advice for everyone. It contains no names, notes or quotes from the meeting.",
      "Changes you make to the sample dossier stay in your own browser and are never sent to us.",
    ],
  },
  {
    id: "processors",
    title: "Who processes your research",
    body: [
      "Your research inputs (company, product, goal and optional details) and the web pages fetched for them are sent to Parallel, for web research, and to Anthropic, for analysis and writing. They process this data to produce your dossier.",
      "Text from fetched pages is treated as data, never as instructions. Every stakeholder, score and recommendation points to the source it came from, or is marked Unverified.",
    ],
  },
  {
    id: "link",
    title: "Your dossier link is the only key",
    body: [
      "There is no login. Anyone with the dossier link can view and change that dossier, so keep it private. Links are long random codes that can't be guessed, and dossier pages are kept out of search engines.",
      "The share link is a separate link. It opens only the one-page report and the sources it cites: never the tracker, debriefs, team contacts or documents, and it doesn't reveal the dossier link.",
    ],
  },
  {
    id: "team-ties",
    title: "Team contacts",
    body: [
      "Teammates can add their own work connections to a dossier, from a LinkedIn or contacts export or by typing them in. The file is read in the teammate's browser and is never uploaded or stored.",
      "Only four fields are kept: name, job title, organisation and LinkedIn profile link. Email addresses, phone numbers, postal addresses and notes are always dropped. For organisations in China, no contact names are kept.",
      "Only contacts at an organisation on the dossier's map are kept; everyone else is discarded. Contact names are shown as hidden bars, never in full.",
      "These contacts belong to that one dossier. They are seen only by people with the dossier link, never on the share link, never shown to other clients and never used for anyone else's research.",
      "There is no login, so we can't check who uploads. Each teammate confirms that the export is their own and that they agree to share these connections (self-certified).",
      "A teammate can choose “Withdraw my connections” at any time. Their contacts and ties are deleted from our database at once and disappear from the map. Intro drafts already copied out of Portolan can't be recalled.",
    ],
  },
  {
    id: "deletion",
    title: "Deleting a dossier",
    body: [
      "To have a dossier deleted, reply to the email that sent you its link, from the address you used to create it. We delete the dossier and everything in it, including tracker items, debriefs, documents and team contacts.",
    ],
  },
  {
    id: "not-advice",
    title: "Research, not advice",
    body: [
      "Dossiers, reports and documents are research references drawn from public sources. They are not legal or investment advice. Check anything important with a qualified adviser before you act on it.",
    ],
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
