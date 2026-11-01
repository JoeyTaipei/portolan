// Dossier and share ids (risky change: spec §9). 16 random bytes → base64url = 22 characters,
// 128 bits, so links can't be guessed. Uses Web Crypto, which works on the server and in tests.

export const SAMPLE_DOSSIER_ID = "sample";
/** The sample's share id is random like a real one, so /s/sample stays a 404 (spec §9). */
export const SAMPLE_SHARE_ID = "jebqgYb3j4SoWrUgtDELdQ";

const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function randomId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newDossierId(): string {
  return randomId();
}

/** A separate id for /s/[shareId]: the share link never reveals the dossier id. */
export function newShareId(): string {
  return randomId();
}

/** True only for a well-formed generated id (not "sample"). Check this before any DB query. */
export function isDossierId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function isShareId(id: string): boolean {
  return ID_PATTERN.test(id);
}
