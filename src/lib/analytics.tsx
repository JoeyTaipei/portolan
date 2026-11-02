"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

// PostHog (spec §12, docs/metrics.md). Dossier and share ids are capabilities, so they never
// leave the browser: every URL-like value is rewritten /d/<id> → /d/:id and /s/<id> → /s/:id
// before sending. No email property is ever sent. Without a key this is a no-op.

export type AnalyticsEvent = "dossier_created" | "report_exported" | "debrief_saved" | "waitlist_joined";

const URL_PROPS = ["$current_url", "$pathname", "$referrer"] as const;

/** Replace the id segment of /d/… and /s/… paths, in full URLs or bare paths. */
export function scrubIds(value: string): string {
  return value.replace(/\/d\/[^/?#\s]+/g, "/d/:id").replace(/\/s\/[^/?#\s]+/g, "/s/:id");
}

type Props = Record<string, unknown>;

function scrubProps(props: Props | undefined): Props | undefined {
  if (!props) return props;
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (/email/i.test(k)) continue;
    out[k] = typeof v === "string" ? scrubIds(v) : v;
  }
  // The three URL properties named in the spec, rewritten explicitly as well.
  for (const k of URL_PROPS) {
    if (typeof out[k] === "string") out[k] = scrubIds(out[k] as string);
  }
  return out;
}

let started = false;

function start() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key || typeof window === "undefined") return;
  started = true;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: "history_change",
    capture_pageleave: true,
    // Autocapture and replays would record link targets and text that contain ids.
    autocapture: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
    before_send: (event) => {
      if (!event) return null;
      return {
        ...event,
        properties: scrubProps(event.properties) ?? {},
        $set: scrubProps(event.$set),
        $set_once: scrubProps(event.$set_once),
      };
    },
  });
}

/** Mounted once in the root layout. */
export function AnalyticsProvider() {
  useEffect(() => {
    try {
      start();
    } catch {
      // analytics must never break the page
    }
  }, []);
  return null;
}

/** The product events (docs/metrics.md). Properties must never contain an id or an email. */
export function track(event: AnalyticsEvent, properties?: Props): void {
  try {
    if (!started) return;
    posthog.capture(event, scrubProps(properties));
  } catch {
    // ignore
  }
}
