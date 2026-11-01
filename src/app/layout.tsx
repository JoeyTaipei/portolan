import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Condensed } from "next/font/google";
import { AnalyticsProvider } from "@/lib/analytics";
import "./globals.css";

// One family only (design/direction.md): IBM Plex Sans Condensed, 400–700 + italic.
const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Portolan",
  description: "Market entry intelligence: evidence-backed stakeholder maps and briefs.",
  appleWebApp: { capable: true, title: "Portolan", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Chart white (--bg). Written as rgb so colour values stay out of .tsx files.
  themeColor: "rgb(252, 253, 251)",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexCondensed.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
