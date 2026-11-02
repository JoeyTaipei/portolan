// Contact file parsing (spec §10.3, TEAM-4; risky change: uploaded contact files). Runs in the
// browser. Only name, title, organisation and LinkedIn URL ever leave this function; email,
// phone, address, notes and every other column or vCard field are dropped. Files over 2 MB or
// 30,000 rows, and anything that isn't valid UTF-8/UTF-16 text, are refused. Every value is
// trimmed to 200 characters and a leading = + - @ gets a ' so it can't run as a formula.

export type ContactOrigin = "linkedin" | "google" | "vcard" | "manual";

export interface ParsedContact {
  name: string;
  title: string | null;
  orgText: string;
  linkedinUrl: string | null;
  origin: ContactOrigin;
}

export type ParseResult = { ok: true; contacts: ParsedContact[]; format: ContactOrigin; skipped: number } | { ok: false; error: string };

export const FILE_LIMITS = { bytes: 2 * 1024 * 1024, rows: 30_000, field: 200 } as const;

/** Trim, collapse whitespace, cut to 200 characters, neutralise formula prefixes. */
export function clean(v: string | undefined | null): string {
  const t = (v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, FILE_LIMITS.field);
  return /^[=+\-@]/.test(t) ? `'${t}`.slice(0, FILE_LIMITS.field) : t;
}

/** A LinkedIn profile link, or null. Anything else in the URL column is dropped. */
function linkedin(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return /^https:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%\-.]+\/?$/i.test(t) ? t.slice(0, FILE_LIMITS.field) : null;
}

/** Bytes → text. UTF-16 needs a byte-order mark; otherwise it must be valid UTF-8. */
export function decode(bytes: Uint8Array): string | null {
  try {
    let text: string;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2));
    else text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // NUL bytes mean a binary file that happens to decode.
    return text.includes("\u0000") ? null : text.replace(/^﻿/, "");
  } catch {
    return null;
  }
}

/** RFC 4180-style CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string, maxRows = FILE_LIMITS.rows + 50): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      if (rows.length > maxRows) return null;
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const col = (header: string[], ...names: string[]) => {
  for (const n of names) {
    const i = header.findIndex((h) => h.trim().toLowerCase() === n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
};

function fromRows(rows: string[][]): { contacts: ParsedContact[]; format: "linkedin" | "google"; skipped: number } | null {
  // LinkedIn puts note lines above the header: use the first row that has "First Name".
  const hi = rows.findIndex((r) => r.some((x) => x.trim().toLowerCase() === "first name"));
  const gi = rows.findIndex((r) => r.some((x) => /^(name|organization name|organization 1 - name)$/i.test(x.trim())));
  const isLinkedIn = hi >= 0 && col(rows[hi], "Company") >= 0;
  const headerAt = isLinkedIn ? hi : gi >= 0 ? gi : hi;
  if (headerAt < 0) return null;
  const h = rows[headerAt];
  const first = col(h, "First Name");
  const last = col(h, "Last Name");
  const full = col(h, "Name");
  const org = isLinkedIn ? col(h, "Company") : col(h, "Organization Name", "Organization 1 - Name");
  const title = isLinkedIn ? col(h, "Position") : col(h, "Organization Title", "Organization 1 - Title");
  const url = isLinkedIn ? col(h, "URL") : -1;
  if (org < 0 || (full < 0 && first < 0)) return null;
  const contacts: ParsedContact[] = [];
  let skipped = 0;
  for (const r of rows.slice(headerAt + 1)) {
    const name = clean(full >= 0 && r[full] ? r[full] : [r[first], r[last]].filter(Boolean).join(" "));
    const orgText = clean(r[org]);
    if (!name || !orgText) {
      skipped++;
      continue;
    }
    contacts.push({ name, title: clean(r[title]) || null, orgText, linkedinUrl: url >= 0 ? linkedin(r[url]) : null, origin: isLinkedIn ? "linkedin" : "google" });
  }
  return { contacts, format: isLinkedIn ? "linkedin" : "google", skipped };
}

/** vCard 3/4: only FN, ORG (first component) and TITLE are read; PHOTO, EMAIL, TEL … are ignored. */
export function parseVcard(text: string): { contacts: ParsedContact[]; skipped: number } {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const contacts: ParsedContact[] = [];
  let skipped = 0;
  let cur: { fn?: string; org?: string; title?: string } | null = null;
  const unescape = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
  for (const line of lines) {
    const k = line.indexOf(":");
    if (k < 0) continue;
    const prop = line.slice(0, k).split(";")[0].split(".").pop()!.toUpperCase();
    const value = line.slice(k + 1);
    if (prop === "BEGIN" && /^vcard$/i.test(value.trim())) cur = {};
    else if (prop === "END" && cur) {
      const name = clean(cur.fn);
      const orgText = clean(cur.org);
      if (name && orgText) contacts.push({ name, title: clean(cur.title) || null, orgText, linkedinUrl: null, origin: "vcard" });
      else skipped++;
      cur = null;
    } else if (cur && prop === "FN") cur.fn = unescape(value);
    else if (cur && prop === "ORG") cur.org = unescape(value.split(/(?<!\\);/)[0]);
    else if (cur && prop === "TITLE") cur.title = unescape(value);
  }
  return { contacts, skipped };
}

/** One uploaded file → contacts (LinkedIn Connections.csv, Google Contacts CSV or vCard). */
export function parseContactFile(bytes: Uint8Array): ParseResult {
  if (bytes.byteLength > FILE_LIMITS.bytes) return { ok: false, error: "That file is over 2 MB. Export only your connections, or split the file." };
  const text = decode(bytes);
  if (text === null) return { ok: false, error: "That doesn't look like a text export. Upload LinkedIn's Connections.csv, a Google Contacts CSV or a vCard file." };
  if (/BEGIN:VCARD/i.test(text)) {
    const v = parseVcard(text);
    if (v.contacts.length + v.skipped > FILE_LIMITS.rows) return { ok: false, error: "That file has more than 30,000 contacts." };
    return { ok: true, contacts: v.contacts, format: "vcard", skipped: v.skipped };
  }
  const rows = parseCsv(text);
  if (rows === null) return { ok: false, error: "That file has more than 30,000 contacts." };
  const out = fromRows(rows);
  if (!out) return { ok: false, error: "We couldn't find name and company columns. Upload LinkedIn's Connections.csv, a Google Contacts CSV or a vCard file." };
  if (out.contacts.length + out.skipped > FILE_LIMITS.rows) return { ok: false, error: "That file has more than 30,000 contacts." };
  return { ok: true, ...out };
}

/** "I know X at Y": the same cleaning as a file. */
export function manualContact(input: { name: string; org: string; title?: string | null }): ParsedContact | null {
  const name = clean(input.name);
  const orgText = clean(input.org);
  if (!name || !orgText) return null;
  return { name, title: clean(input.title) || null, orgText, linkedinUrl: null, origin: "manual" };
}
