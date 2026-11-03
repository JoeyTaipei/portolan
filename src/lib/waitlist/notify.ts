import "server-only";
import type { WaitlistEntry } from "./join";

// Posts one Slack message per waitlist sign-up (spec §12 "09 Waitlist"). The webhook URL is a
// server-only secret; unset means no message. A failure is logged without personal data and
// never fails the sign-up.

export async function notifySlack(entry: WaitlistEntry, created: boolean): Promise<void> {
  const url = process.env.WAITLIST_SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = [
    `${created ? "New waitlist sign-up" : "Waitlist sign-up updated"} (from ${entry.cameFrom})`,
    `Company: ${entry.company}`,
    `Email: ${entry.email}`,
    `Phone: ${entry.phone}`,
  ].join("\n");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`waitlist: Slack notification failed with HTTP ${res.status}`);
  } catch {
    console.error("waitlist: Slack notification failed");
  }
}
