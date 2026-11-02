"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { htmlLang, LANG_COOKIE, type Locale } from "@/lib/i18n";
import { Both } from "@/lib/i18n/client";

// SHELL-4 (I18N-1, option B): globe + current language, opening English / 繁體中文.
// It lives in the static shell, so it reads the language from <html lang>, not from useT().

const CHOICES: { locale: Locale; label: string }[] = [
  { locale: "en", label: "English" },
  { locale: "zh-TW", label: "繁體中文" },
];

function currentLocale(): Locale {
  return document.documentElement.lang.startsWith("zh") ? "zh-TW" : "en";
}

/** Remember the choice for a year and flip the text drawn in both languages at once. */
function storeLocale(locale: Locale) {
  document.cookie = `${LANG_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = htmlLang(locale);
}

export function LangSwitch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Locale>("en");
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(locale: Locale) {
    setOpen(false);
    button.current?.focus();
    if (locale === currentLocale()) return;
    storeLocale(locale);
    startTransition(() => router.refresh());
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={pending || undefined}
        data-testid="lang-switch"
        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--r-m)] border border-rule bg-[var(--bar)] px-2.5 text-[13px] font-semibold text-[var(--bar-ink)] hover:border-[var(--btn-line)] lg:min-h-[30px]"
        onClick={() => {
          setCurrent(currentLocale());
          setOpen((o) => !o);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          className={`size-4 ${pending ? "animate-spin" : ""}`}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </svg>
        <span className="sr-only">
          <Both k="Language" />:{" "}
        </span>
        <span className="i18n-en">English</span>
        <span className="i18n-zh" lang="zh-Hant-TW">
          繁中
        </span>
        <span aria-hidden="true" className="text-[10px]">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+6px)] right-0 z-[60] min-w-[160px] rounded-[var(--r-m)] border border-rule-strong bg-[var(--panel)] py-1"
        >
          {CHOICES.map((c) => {
            const on = c.locale === current;
            return (
              <button
                key={c.locale}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                lang={htmlLang(c.locale)}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left text-[14px] text-ink hover:bg-panel2 lg:min-h-9 ${
                  on ? "font-bold" : "font-medium"
                }`}
                onClick={() => choose(c.locale)}
              >
                <span aria-hidden="true" className="w-3">
                  {on ? "✓" : ""}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
