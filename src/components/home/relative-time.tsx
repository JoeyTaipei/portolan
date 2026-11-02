"use client";

import { useEffect, useState } from "react";
import type { T } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

// "refreshed 2h ago" with the exact time on hover. Rendered after mount so server and browser
// clocks never disagree in the HTML.
function relative(t: T, iso: string, now: number): string {
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return t("just now");
  if (mins < 60) return t("{n} min ago", { n: mins });
  const h = Math.round(mins / 60);
  if (h < 24) return t("{n}h ago", { n: h });
  const days = Math.round(h / 24);
  return days === 1 ? t("yesterday") : t("{n} days ago", { n: days });
}

export function RelativeTime({ iso, override }: { iso: string; override?: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const t = useT();
  useEffect(() => {
    const tick = () => setText(relative(t, iso, Date.now()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso, t]);
  const exact = new Date(iso).toLocaleString(t.locale === "zh-TW" ? "zh-TW" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" });
  return (
    <time dateTime={iso} title={t("{time} Taipei time", { time: exact })}>
      {override ?? text ?? exact}
    </time>
  );
}
