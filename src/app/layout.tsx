import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Condensed, Noto_Sans_TC } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { AnalyticsProvider } from "@/lib/analytics";
import { LANG_COOKIE, toLocale, ZH_HTML_LANG } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

// One family only (design/direction.md): IBM Plex Sans Condensed, 400–700 + italic.
const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// SHELL-4 (I18N-6): CJK fallback for 繁中. Google serves it in many small unicode-range
// files; no preload, so English pages download none of them.
const notoTC = Noto_Sans_TC({
  variable: "--font-noto-tc",
  weight: ["400", "500", "700"],
  preload: false,
});

// Runs before paint: <html lang> follows the language cookie, so text drawn in both
// languages (the static shell) shows the right one without a flash (I18N-7).
const setLang = `try{if(/(?:^|; )${LANG_COOKIE}=zh-TW(?:;|$)/.test(document.cookie))document.documentElement.lang="${ZH_HTML_LANG}"}catch(e){}`;

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
  // Not awaited: each client component that needs the language waits inside its own <Suspense>.
  const locale = cookies().then((c) => toLocale(c.get(LANG_COOKIE)?.value));
  return (
    <html lang="en" suppressHydrationWarning className={`${plexCondensed.variable} ${notoTC.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Script id="portolan-lang" strategy="beforeInteractive">
          {setLang}
        </Script>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
