import { describe, expect, it } from "vitest";
import type { Contact, IntroDraft, Tie, TeamMember } from "@/lib/types";
import { matchContacts, normaliseOrg, orgTargets } from "./match";
import { FILE_LIMITS, manualContact, parseContactFile } from "./parse";
import { warmPaths, type PathEdge, type PathTie } from "./warm-path";
import { withdrawMember } from "./withdraw";

// Spec §17 team bullet: parsing that drops email/phone, formula neutralising, file limits,
// organisation matching, the 2-hop limit and no data left after withdrawal.

const enc = (s: string) => new TextEncoder().encode(s);
const KEPT = ["linkedinUrl", "name", "orgText", "origin", "title"];

describe("parsing", () => {
  it("LinkedIn CSV: skips the note lines and keeps only name, title, organisation, URL", () => {
    const csv = [
      "Notes:",
      '"When exporting your connection data, you may notice that some of the email addresses are missing."',
      "",
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On",
      "Ada,Lin,https://www.linkedin.com/in/ada-lin,ada@example.com,Industrial Technology Research Institute,Programme manager,01 Oct 2026",
      'Bo,Chen,https://evil.example/x,bo@example.com,"Thunder Tiger, Inc.",Engineer,02 Oct 2026',
    ].join("\n");
    const r = parseContactFile(enc(csv));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe("linkedin");
    expect(r.contacts).toHaveLength(2);
    expect(Object.keys(r.contacts[0]).sort()).toEqual(KEPT);
    expect(r.contacts[0]).toEqual({ name: "Ada Lin", title: "Programme manager", orgText: "Industrial Technology Research Institute", linkedinUrl: "https://www.linkedin.com/in/ada-lin", origin: "linkedin" });
    expect(r.contacts[1].linkedinUrl).toBeNull();
    expect(r.contacts[1].orgText).toBe("Thunder Tiger, Inc.");
    expect(JSON.stringify(r.contacts)).not.toMatch(/@example\.com|Oct 2026/);
  });

  it("Google CSV: Name / Organization columns, phone and email dropped", () => {
    const csv = "Name,E-mail 1 - Value,Phone 1 - Value,Organization 1 - Name,Organization 1 - Title,Notes\nMei Wu,mei@example.com,+886 2 1234,AIDC,Director,met at TADTE\n";
    const r = parseContactFile(enc(csv));
    expect(r.ok && r.format).toBe("google");
    if (!r.ok) return;
    expect(r.contacts).toEqual([{ name: "Mei Wu", title: "Director", orgText: "AIDC", linkedinUrl: null, origin: "google" }]);
  });

  it("vCard: only FN, ORG and TITLE; PHOTO, EMAIL and TEL ignored", () => {
    const vcf = "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jun Hsu\r\nORG:National Communications Commission;Licensing\r\nTITLE:Officer\r\nEMAIL:jun@example.com\r\nTEL:+886 2 5555\r\nPHOTO;ENCODING=b:AAAA\r\nEND:VCARD\r\n";
    const r = parseContactFile(enc(vcf));
    expect(r.ok && r.format).toBe("vcard");
    if (!r.ok) return;
    expect(r.contacts).toEqual([{ name: "Jun Hsu", title: "Officer", orgText: "National Communications Commission", linkedinUrl: null, origin: "vcard" }]);
  });

  it("neutralises formula prefixes and cuts values to 200 characters", () => {
    const csv = `First Name,Last Name,URL,Company,Position\n=HYPERLINK("x"),+1,,@SUM(A1),${"x".repeat(400)}\n`;
    const r = parseContactFile(enc(csv));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.contacts[0];
    expect(c.name.startsWith("'=")).toBe(true);
    expect(c.orgText).toBe("'@SUM(A1)");
    expect(c.title).toHaveLength(FILE_LIMITS.field);
    expect(manualContact({ name: "-Tom", org: "ITRI" })?.name).toBe("'-Tom");
  });

  it("refuses files over 2 MB, over 30,000 rows, and binary or non-UTF-8 files", () => {
    expect(parseContactFile(new Uint8Array(FILE_LIMITS.bytes + 1)).ok).toBe(false);
    const big = "Name,Organization 1 - Name\n" + "A,B\n".repeat(FILE_LIMITS.rows + 1);
    expect(parseContactFile(enc(big)).ok).toBe(false);
    expect(parseContactFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0xfe, 0x00])).ok).toBe(false);
    expect(parseContactFile(new Uint8Array([0x4e, 0x61, 0xc3, 0x28])).ok).toBe(false);
  });
});

describe("matching", () => {
  const targets = orgTargets(
    [
      { id: "itri", name: "Industrial Technology Research Institute", short: "ITRI", nameZh: "工業技術研究院", isChina: false },
      { id: "ncsist", name: "National Chung-Shan Institute of Science and Technology", short: "NCSIST", nameZh: "國家中山科學研究院", isChina: false },
      { id: "dji", name: "DJI", short: "DJI", nameZh: "大疆創新", isChina: true },
    ],
    [{ alias: "中科院", stakeholderKey: "ncsist" }],
  );
  const c = (orgText: string) => ({ name: "A Person", title: "Engineer", orgText, linkedinUrl: "https://www.linkedin.com/in/a", origin: "manual" as const });

  it("exact names, short names and aliases match; close names go to confirm; others are discarded", () => {
    const r = matchContacts([c("ITRI"), c("中科院"), c("Industrial Technology Research Inst."), c("Some Bakery Ltd")], targets);
    expect(r.matched.map((m) => m.stakeholderId)).toEqual(["itri", "ncsist"]);
    expect(r.toConfirm.map((m) => m.stakeholderId)).toEqual(["itri"]);
    expect(r.discarded).toBe(1);
    expect(normaliseOrg("Thunder Tiger Co., Ltd.")).toBe("thunder tiger");
  });

  it("China stays organisation level: no name, title or URL is kept", () => {
    const r = matchContacts([c("DJI")], targets);
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].contact).toMatchObject({ name: "", title: null, linkedinUrl: null });
  });
});

describe("warm paths", () => {
  const ties: PathTie[] = [
    { id: "t1", memberId: "mei", contactId: "c1", stakeholderId: "aidc", strength: 2 },
    { id: "t2", memberId: "tom", contactId: "c2", stakeholderId: "ab", strength: 1 },
  ];
  const edges: PathEdge[] = [
    { aId: "ab", bId: "aidc", relation: "Attended the briefing", sourceIds: ["s1"], status: "sourced" },
    { aId: "ab", bId: "mnd", relation: "Directly subordinate agency", sourceIds: ["s2"], status: "sourced" },
    { aId: "aidc", bId: "x", relation: "Unsourced", sourceIds: [], status: "unverified" },
  ];
  const active = new Set(["mei", "tom"]);

  it("finds direct and 2-hop paths, ranked by strength", () => {
    const p = warmPaths("ab", ties, edges, active);
    expect(p.map((x) => [x.memberId, x.hops])).toEqual([
      ["mei", 2],
      ["tom", 1],
    ]);
  });

  it("stops at 2 hops and ignores unsourced edges", () => {
    // mei → aidc → ab → mnd would be 3 hops.
    expect(warmPaths("mnd", ties.slice(0, 1), edges, active)).toEqual([]);
    expect(warmPaths("x", ties, edges, active)).toEqual([]);
  });

  it("withdrawn members' ties don't count", () => {
    expect(warmPaths("ab", ties, edges, new Set(["tom"])).map((x) => x.memberId)).toEqual(["tom"]);
  });
});

describe("withdrawal", () => {
  it("leaves no contacts, ties or drafts for that member", () => {
    const at = "2026-11-01T00:00:00Z";
    const team: TeamMember[] = [
      { id: "mei", dossierId: "d", name: "Mei", role: null, status: "connected", consentedAt: at, withdrawnAt: null, createdAt: at },
      { id: "tom", dossierId: "d", name: "Tom", role: null, status: "connected", consentedAt: at, withdrawnAt: null, createdAt: at },
    ];
    const contacts: Contact[] = [
      { id: "c1", memberId: "mei", name: null, title: "Engineer", orgText: "AIDC", linkedinUrl: null, origin: "manual", createdAt: at },
      { id: "c2", memberId: "tom", name: null, title: null, orgText: "ITRI", linkedinUrl: null, origin: "manual", createdAt: at },
    ];
    const ties: Tie[] = [
      { id: "t1", contactId: "c1", stakeholderId: "aidc", strength: 2, how: "Former colleague", match: "exact", createdAt: at },
      { id: "t2", contactId: "c2", stakeholderId: "itri", strength: 1, how: "In contacts", match: "exact", createdAt: at },
    ];
    const introDrafts: IntroDraft[] = [{ id: "i1", memberId: "mei", contactId: "c1", targetStakeholderId: "ab", text: "Hi", sourceIds: [], createdAt: at }];
    const out = withdrawMember({ team, contacts, ties, introDrafts }, "mei", new Date(at));
    expect(out.team.find((m) => m.id === "mei")).toMatchObject({ status: "withdrawn", withdrawnAt: new Date(at).toISOString() });
    expect(JSON.stringify([out.contacts, out.ties, out.introDrafts])).not.toMatch(/"c1"|"t1"|"i1"|"mei"/);
    expect(out.contacts).toHaveLength(1);
    expect(out.ties).toHaveLength(1);
  });
});
