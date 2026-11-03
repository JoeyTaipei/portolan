"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { makeT, translateRuntime, type Key, type Locale, type T, type Vars } from "./index";

// Client side of SHELL-4. The root layout passes the cookie read as a promise, so a client
// component that calls useT() streams inside its page's <Suspense> like the server text does.

const LocaleContext = createContext<Promise<Locale>>(Promise.resolve("en"));

export function I18nProvider({ locale, children }: { locale: Promise<Locale>; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useT(): T {
  const locale = use(use(LocaleContext));
  return useMemo(() => makeT(locale), [locale]);
}

const EN = makeT("en");
const ZH = makeT("zh-TW");

/**
 * Both languages, one shown by CSS from <html lang> (set before paint from the cookie).
 * For text in the static shell and Suspense fallbacks, which render before the cookie is read.
 */
export function Both({ k, vars }: { k: Key; vars?: Vars }) {
  return <Pair en={EN(k, vars)} zh={ZH(k, vars)} />;
}

/** Both, for a code-written string built elsewhere (translated like `t.x`). */
export function BothX({ en }: { en: string }) {
  return <Pair en={en} zh={translateRuntime(en)} />;
}

function Pair({ en, zh }: { en: string; zh: string }) {
  if (en === zh) return <>{en}</>;
  return (
    <>
      <span className="i18n-en">{en}</span>
      <span className="i18n-zh" lang="zh-Hant-TW">
        {zh}
      </span>
    </>
  );
}
