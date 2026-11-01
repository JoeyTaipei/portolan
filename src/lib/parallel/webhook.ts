import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Parallel webhook signatures follow Standard Webhooks (plan P-6):
// headers webhook-id, webhook-timestamp (unix seconds), webhook-signature ("v1,<base64>"
// entries separated by spaces). Signed content = "<id>.<timestamp>.<raw body>", HMAC-SHA256
// with the secret after stripping "whsec_" and base64-decoding it.

export const TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function readWebhookHeaders(h: Headers): WebhookHeaders {
  return { id: h.get("webhook-id"), timestamp: h.get("webhook-timestamp"), signature: h.get("webhook-signature") };
}

/** Signature for one message; exported so tests and the local curl check can sign. */
export function signWebhook(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

/** True only for a fresh message with at least one matching v1 signature. */
export function verifyWebhook(
  secret: string | undefined,
  headers: WebhookHeaders,
  rawBody: string,
  nowMs = Date.now(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  if (!/^\d{1,12}$/.test(headers.timestamp)) return false;
  const ts = Number(headers.timestamp);
  if (Math.abs(nowMs / 1000 - ts) > TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(signWebhook(secret, headers.id, headers.timestamp, rawBody), "base64");
  for (const entry of headers.signature.split(" ")) {
    const [version, sig] = entry.split(",", 2);
    if (version !== "v1" || !sig) continue;
    const given = Buffer.from(sig, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}
