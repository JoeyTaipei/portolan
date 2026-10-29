import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import "./globals.css";

// Mockup typography: Inter for UI text, Newsreader for headings and big numbers, IBM Plex Mono for labels.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Market entry intelligence: evidence-backed stakeholder maps and briefs.",
  appleWebApp: { capable: true, title: "Atlas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F3EEE4",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
