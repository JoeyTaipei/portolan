"use client";

import { useEffect, useState } from "react";

// "refreshed 2h ago" with the exact time on hover. Rendered after mount so server and browser
// clocks never disagree in the HTML.
function relative(iso: string, now: number): string {
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function RelativeTime({ iso, override }: { iso: string; override?: string | null }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const t = () => setText(relative(iso, Date.now()));
    t();
    const id = setInterval(t, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  const exact = new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" });
  return (
    <time dateTime={iso} title={`${exact} Taipei time`}>
      {override ?? text ?? exact}
    </time>
  );
}
