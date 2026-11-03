import type { Metadata, Viewport } from "next";
import { Courier_Prime, Noto_Sans_TC, Public_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { AnalyticsProvider } from "@/lib/analytics";
import { LANG_COOKIE, toLocale, ZH_HTML_LANG } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

// Estimate (design/direction.md): Public Sans for text and headings.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  style: ["normal", "italic"],
});

// Courier Prime only for grades, source numbers, citations, the top banner and Exhibit labels.
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
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
  // Desk grey (--desk). Written as rgb so colour values stay out of .tsx files.
  themeColor: "rgb(226, 229, 232)",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Not awaited: each client component that needs the language waits inside its own <Suspense>.
  const locale = cookies().then((c) => toLocale(c.get(LANG_COOKIE)?.value));
  return (
    <html lang="en" suppressHydrationWarning className={`${publicSans.variable} ${courierPrime.variable} ${notoTC.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Shared 45° hatch for resistant stakeholders (map, matrix, legend, report). Zero-size, not display:none, so the pattern still paints. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" style={{ fill: "var(--paper)" }} />
              <rect width="1.6" height="4" style={{ fill: "var(--ink)" }} />
            </pattern>
          </defs>
        </svg>
        <Script id="portolan-lang" strategy="beforeInteractive">
          {setLang}
        </Script>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
