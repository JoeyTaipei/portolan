// Dossier and share ids (risky change: spec §9). 16 random bytes → base64url = 22 characters,
// 128 bits, so links can't be guessed. Uses Web Crypto, which works on the server and in tests.

export const SAMPLE_DOSSIER_ID = "sample";
/** The sample's share id is random like a real one, so /s/sample stays a 404 (spec §9). */
export const SAMPLE_SHARE_ID = "jebqgYb3j4SoWrUgtDELdQ";

/** MKT-2: the hand-curated Vietnam sample at /d/sample-vn (Sample data, never the database). */
export const SAMPLE_VN_ID = "sample-vn";
export const SAMPLE_VN_SHARE_ID = "1tNseuddMPlCOM2XRWIOAA";

/** MKT-3: the 碳基 (Carbon-Based Technology) demo, one hand-curated sample per target market. */
export const SAMPLE_CBT_US_ID = "sample-cbt-us";
export const SAMPLE_CBT_JP_ID = "sample-cbt-jp";
export const SAMPLE_CBT_PL_ID = "sample-cbt-pl";
export const SAMPLE_CBT_PH_ID = "sample-cbt-ph";
export const SAMPLE_CBT_US_SHARE_ID = "FQt9eSVD1zJtAReetQCVMg";
export const SAMPLE_CBT_JP_SHARE_ID = "gHpOgu2z8qNmHqlMBeMfXA";
export const SAMPLE_CBT_PL_SHARE_ID = "XKWxOeVbyWbIddi7W4IaxA";
export const SAMPLE_CBT_PH_SHARE_ID = "ThDKUbZlPJhqoYfapKJwKg";

/** Every sample: fixed public id → random share id. Samples never touch the database. */
export const SAMPLE_IDS: readonly { id: string; shareId: string }[] = [
  { id: SAMPLE_DOSSIER_ID, shareId: SAMPLE_SHARE_ID },
  { id: SAMPLE_VN_ID, shareId: SAMPLE_VN_SHARE_ID },
  { id: SAMPLE_CBT_US_ID, shareId: SAMPLE_CBT_US_SHARE_ID },
  { id: SAMPLE_CBT_JP_ID, shareId: SAMPLE_CBT_JP_SHARE_ID },
  { id: SAMPLE_CBT_PL_ID, shareId: SAMPLE_CBT_PL_SHARE_ID },
  { id: SAMPLE_CBT_PH_ID, shareId: SAMPLE_CBT_PH_SHARE_ID },
];

/** Any sample: writes stay in this browser and never reach the server. */
export function isSampleId(id: string): boolean {
  return SAMPLE_IDS.some((s) => s.id === id);
}

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
