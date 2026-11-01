// Tracker debrief and Undo (plan S5-T1, P-17). The two risky changes: support after a debrief
// follows docs/scoring.md §3.1, and the playbook row carries nothing that identifies anyone.
import { describe, expect, it } from "vitest";
import { briefStatus } from "@/lib/scoring/brief-status";
import { sourceWeight } from "@/lib/scoring/source-weight";
import { supportFor } from "@/lib/scoring/support";
import { sampleDossier } from "@/lib/sample/reader";
import type { Source, SupportStatement } from "@/lib/types";
import { applyDebrief, dueDebriefs, trackerState, undoDebrief, type DebriefInput, type TrackerState } from "./flow";

const NOW = new Date("2026-11-01T10:00:00Z");
const IDS = { debrief: "db-1", source: "src-db-1", statement: "st-db-1", playbook: "pb-1" };

function src(id: string, over: Partial<Source> = {}): Source {
  return {
    id,
    dossierId: "d",
    label: id,
    url: `https://example.gov.tw/${id}`,
    title: id,
    publisher: null,
    sourceType: "news",
    excerpt: "x",
    excerptLang: "en",
    translation: null,
    reliability: "B",
    credibility: 2,
    credibilityReason: null,
    publishedAt: "2026-09-01",
    verifiedAt: "2026-10-30",
    origin: "parallel_basis",
    accepted: true,
    rejectReason: null,
    runId: null,
    createdAt: "2026-10-01T00:00:00Z",
    ...over,
  };
}

function stmt(id: string, rating: SupportStatement["rating"], sourceId: string): SupportStatement {
  return { id, stakeholderId: "alliance", runId: "r", debriefId: null, rating, summary: "s", quote: null, sourceId, statedAt: null, createdAt: "2026-10-01T00:00:00Z" };
}

function base(): TrackerState {
  return {
    dossierId: "d",
    stakeholders: [{ id: "alliance", name: "Taiwan Drone Industry Alliance", short: "Drone alliance", category: "ind" }],
    leads: [],
    tracker: [
      {
        id: "t1",
        dossierId: "d",
        stakeholderId: "alliance",
        leadId: null,
        stage: "contacted",
        nextStep: "Ask for an intro meeting",
        dueDate: "2026-11-03",
        meetingAt: "2026-10-31",
        origin: "intro",
        createdAt: "2026-10-01T00:00:00Z",
      },
    ],
    debriefs: [],
    statements: [stmt("a", 1, "s1"), stmt("b", 2, "s2")],
    sources: [src("s1"), src("s2", { reliability: "C", credibility: 3 })],
    playbook: [],
    brief: { inputsAt: "2026-10-30T04:09:36Z" },
  };
}

const NOTES = "Open to associate membership; asked about Acme's export licence.";
const input = (over: Partial<DebriefInput> = {}): DebriefInput => ({
  trackerItemId: "t1",
  overall: "negative",
  nextStepAgreed: true,
  notes: NOTES,
  addToPlaybook: true,
  nextStep: { text: "Submit membership form", dueDate: "2026-11-08" },
  ...over,
});

describe("applyDebrief", () => {
  it("recalculates support with the debrief as an A1 source weighted ×2 (scoring §3.1)", () => {
    const s = base();
    const { state, receipt } = applyDebrief(s, input(), IDS, NOW);

    // By hand: 50 × Σ(w × r) ÷ Σ w, with the debrief at A1 ×2 and Negative = −2.
    const w1 = sourceWeight(s.sources[0], NOW);
    const w2 = sourceWeight(s.sources[1], NOW);
    const before = Math.round((50 * (w1 * 1 + w2 * 2)) / (w1 + w2));
    const wd = 1 * 1 * 1 * 2; // A, 1, recent, ×2
    const after = Math.round((50 * (w1 * 1 + w2 * 2 + wd * -2)) / (w1 + w2 + wd));

    expect(receipt.supportBefore).toMatchObject({ kind: "known", score: before });
    expect(receipt.supportAfter).toMatchObject({ kind: "known", score: after });
    expect(supportFor("alliance", state.statements, state.sources, NOW)).toEqual(receipt.supportAfter);
    const debriefSource = state.sources.find((x) => x.id === IDS.source)!;
    expect(debriefSource).toMatchObject({ origin: "debrief", reliability: "A", credibility: 1, accepted: true, url: null });
    expect(sourceWeight(debriefSource, NOW)).toBe(wd);
    expect(state.debriefs[0]).toMatchObject({ supportBefore: before, supportAfter: after, notes: NOTES });
  });

  it("moves the stage to at least Met, adds the agreed next step and marks the brief out of date", () => {
    const { state, receipt } = applyDebrief(base(), input(), IDS, NOW);
    expect(receipt).toMatchObject({ stageBefore: "contacted", stageAfter: "met", briefOutOfDate: true });
    expect(state.tracker[0]).toMatchObject({ stage: "met", nextStep: "Submit membership form", dueDate: "2026-11-08" });
    const brief = sampleDossier.briefs.at(-1)!;
    const status = briefStatus({ ...brief, inputsAt: "2026-10-30T04:09:36Z" }, { ...sampleDossier, debriefs: state.debriefs }, NOW);
    expect(status.reasons).toContain("A debrief was saved after this brief was written.");

    const partner = base();
    partner.tracker[0].stage = "partner";
    expect(applyDebrief(partner, input({ nextStepAgreed: false, nextStep: null }), IDS, NOW).state.tracker[0]).toMatchObject({
      stage: "partner",
      nextStep: "Ask for an intro meeting",
    });
  });

  it("stores only route, category, overall and next step in the playbook: no names, ids or notes", () => {
    const { state, receipt } = applyDebrief(base(), input(), IDS, NOW);
    const [row] = state.playbook;
    expect(Object.keys(row).sort()).toEqual(["category", "createdAt", "id", "nextStepAgreed", "overall", "route"]);
    expect(row).toMatchObject({ route: "industry · intro → meeting", category: "ind", overall: "negative", nextStepAgreed: true });
    const text = JSON.stringify(row);
    for (const leak of ["alliance", "Alliance", "Drone", "Acme", "membership", "d", "t1"].map((x) => `"${x}"`)) expect(text).not.toContain(leak);
    expect(text).not.toMatch(/Drone|Acme|membership|Ask for/);
    expect(receipt.playbookRoute).toBe(row.route);
    // Notes stay in the debrief only: not in the source excerpt or the statement.
    expect(JSON.stringify(state.sources) + JSON.stringify(state.statements)).not.toContain("Acme");

    const unticked = applyDebrief(base(), input({ addToPlaybook: false }), IDS, NOW);
    expect(unticked.state.playbook).toEqual([]);
    expect(unticked.state.debriefs[0].playbookOutcomeId).toBeNull();
  });

  it("clears the debrief-due card once the meeting has a debrief", () => {
    const s = base();
    expect(dueDebriefs(s, NOW).map((d) => d.item.id)).toEqual(["t1"]);
    expect(dueDebriefs(applyDebrief(s, input(), IDS, NOW).state, NOW)).toEqual([]);
  });
});

describe("undoDebrief", () => {
  it("restores everything: debrief, source, statement, playbook row, stage, next step and support", () => {
    const s = base();
    const { state, receipt } = applyDebrief(s, input(), IDS, NOW);
    const undone = undoDebrief(state, receipt);
    expect(undone).toEqual(s);
    expect(supportFor("alliance", undone.statements, undone.sources, NOW)).toEqual(receipt.supportBefore);
  });

  it("works on the sample dossier, where support starts from its sourced statements", () => {
    const s = trackerState(sampleDossier);
    const item = s.tracker[0];
    const withMeeting = { ...s, tracker: s.tracker.map((t) => (t.id === item.id ? { ...t, meetingAt: "2026-10-31" } : t)) };
    const { state, receipt } = applyDebrief(withMeeting, input({ trackerItemId: item.id, overall: "positive" }), IDS, NOW);
    expect(receipt.supportAfter).not.toEqual(receipt.supportBefore);
    expect(undoDebrief(state, receipt)).toEqual(withMeeting);
  });
});
