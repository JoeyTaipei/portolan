// The only data types in Portolan (docs/spec.md §13, §15). Owned by the ui lane and changed
// only in slice S0; a later need → stop and ask. Real dossiers and the sample share these.
//
// Sourcing rule (product rule, risky change): every fact-like record carries a required
// `status` and a required `sourceIds` array. "sourced" means at least one accepted source id;
// anything else is "unverified", is shown as Unverified and is never scored.

/** ISO-8601 date ("2026-11-01") or timestamp ("2026-11-01T08:00:00Z"). */
export type Iso = string;

/** Any value that can live in a jsonb column. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Every Server Action returns this; `error` is a sentence the user understands. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ─── Shared scalars ──────────────────────────────────────────────────────────

export type Level = "High" | "Medium" | "Low";
export type FactStatus = "sourced" | "unverified";
export type Rating03 = 0 | 1 | 2 | 3;
export type StatementRating = -2 | -1 | 0 | 1 | 2;
export type Market = "TW";
export type Category = "gov" | "ind" | "cap" | "leg" | "evt";
export type Stance = "supportive" | "neutral" | "resistant" | "unknown";

// ─── Dossier ─────────────────────────────────────────────────────────────────

export type DossierStatus = "researching" | "partial" | "ready" | "failed";

/** Dossier-level market checks for Entry readiness (docs/scoring.md 4.2), rated 0–3 with sources. */
export interface MarketCheck {
  rating: Rating03 | null;
  /** Text in the cited excerpt that the rating relies on (§7.7). */
  quote: string | null;
  sourceIds: string[];
  status: FactStatus;
}

export interface MarketChecks {
  money: MarketCheck | null;
  licence: MarketCheck | null;
}

/** `dossiers` row. `email` / `emailHash` never leave the server. */
export interface DossierRow {
  id: string;
  shareId: string;
  name: string;
  company: string;
  product: string;
  market: Market;
  goal: string;
  email: string | null;
  emailHash: string | null;
  certifications: string | null;
  priceRange: string | null;
  twPartners: string | null;
  clientDeadline: Iso | null;
  status: DossierStatus;
  marketChecks: MarketChecks;
  refreshedAt: Iso | null;
  currentRunId: string | null;
  createdAt: Iso;
}

/** What screens see about the dossier itself: the row without email fields. */
export type DossierMeta = Omit<DossierRow, "email" | "emailHash">;

// ─── Research runs, cost and limits ──────────────────────────────────────────

export type RunKind = "initial" | "refresh";
export type RunStatus = "queued" | "running" | "partial" | "done" | "failed";

export interface ResearchRun {
  id: string;
  dossierId: string;
  kind: RunKind;
  status: RunStatus;
  startedAt: Iso | null;
  deadlineAt: Iso | null;
  finishedAt: Iso | null;
  error: string | null;
  createdAt: Iso;
}

export type StepKind = "discover" | "enrich" | "rate" | "check" | "leads" | "brief";
export type StepStatus = "queued" | "running" | "done" | "failed" | "skipped";

export interface ResearchStep {
  id: string;
  runId: string;
  kind: StepKind;
  entityKey: string | null;
  parallelRunId: string | null;
  status: StepStatus;
  attempts: number;
  lockedAt: Iso | null;
  result: Json | null;
  createdAt: Iso;
}

export type CostProvider = "parallel" | "anthropic";

export interface CostLedgerEntry {
  id: string;
  runId: string | null;
  dossierId: string | null;
  provider: CostProvider;
  purpose: string;
  estimatedUsd: number;
  actualUsd: number | null;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: Iso;
}

export interface UsageCounter {
  /** UTC+8 calendar date, "YYYY-MM-DD". */
  day: string;
  /** "site", "email:<hash>", "dossier:<id>:rebrief" … */
  scope: string;
  count: number;
}

// ─── Sources (Admiralty graded) ──────────────────────────────────────────────

export type Reliability = "A" | "B" | "C" | "D" | "E" | "F";
export type Credibility = 1 | 2 | 3 | 4 | 5 | 6;
export type SourceOrigin = "parallel_basis" | "debrief" | "manual";
export type SourceType =
  | "government_gazette"
  | "legislative_record"
  | "government_site"
  | "news"
  | "trade_press"
  | "company_site"
  | "report"
  | "event_page"
  | "database"
  | "debrief"
  | "other";

export interface Source {
  id: string;
  dossierId: string;
  /** "S1", "S2" … numbered per dossier. */
  label: string;
  /** Null only for debriefs. */
  url: string | null;
  title: string;
  publisher: string | null;
  sourceType: SourceType;
  /** Verbatim excerpt from Parallel's Basis (or the debrief summary). */
  excerpt: string;
  excerptLang: string;
  /** Machine translation of a non-English excerpt. */
  translation: string | null;
  reliability: Reliability;
  credibility: Credibility;
  credibilityReason: string | null;
  publishedAt: Iso | null;
  /** Date the excerpt was verified; a claim citing a source without it fails §7.7. */
  verifiedAt: Iso | null;
  origin: SourceOrigin;
  /** False = rejected by the quality filter (§7.4); never used for a fact. */
  accepted: boolean;
  rejectReason: string | null;
  runId: string | null;
  createdAt: Iso;
}

// ─── Stakeholders and what we know about them ────────────────────────────────

export type StakeholderStatus =
  | "active"
  | "still_researching"
  | "pending_check"
  | "not_found_latest"
  | "incomplete";

interface StakeholderBase {
  id: string;
  dossierId: string;
  name: string;
  nameZh: string | null;
  short: string | null;
  category: Category;
  role: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  /** Position in the 3D map, each −1…1. */
  x: number | null;
  y: number | null;
  z: number | null;
  status: StakeholderStatus;
  firstRunId: string | null;
  lastRunId: string | null;
  createdAt: Iso;
}

/** China is organisation level only: a Chinese stakeholder can never be a person. */
export type Stakeholder = StakeholderBase &
  ({ isChina: true; isPerson: false } | { isChina: false; isPerson: boolean });

export type FactField =
  | "title"
  | "role"
  | "mandate"
  | "head"
  | "authority"
  | "budget"
  | "access"
  | "recent"
  | "action"
  | "address";

/** The four Claude-rated influence factors (centrality is computed from edges). */
export type RatedFactor = "authority" | "budget" | "access" | "recent";

export interface Fact {
  id: string;
  stakeholderId: string;
  runId: string | null;
  field: FactField;
  value: Json;
  /** 0–3 for authority / budget / access / recent; null otherwise. */
  rating: Rating03 | null;
  /** Text in the cited excerpt that the claim relies on (§7.7). */
  quote: string | null;
  sourceIds: string[];
  status: FactStatus;
  model: string | null;
  createdAt: Iso;
}

/** Something a stakeholder said or did about foreign firms like the client (scoring §3). */
export interface SupportStatement {
  id: string;
  stakeholderId: string;
  runId: string | null;
  debriefId: string | null;
  rating: StatementRating;
  summary: string;
  quote: string | null;
  /** Every statement cites exactly one source (a debrief counts as one). */
  sourceId: string;
  statedAt: Iso | null;
  createdAt: Iso;
}

export interface Edge {
  id: string;
  dossierId: string;
  aId: string;
  bId: string;
  relation: string;
  sourceIds: string[];
  status: FactStatus;
  createdAt: Iso;
}

export type TimedEventKind = "budget_vote" | "tender_close" | "committee_review" | "event";

export interface TimedEvent {
  id: string;
  dossierId: string;
  title: string;
  kind: TimedEventKind;
  /** Null = date unverified. */
  date: Iso | null;
  stakeholderIds: string[];
  sourceIds: string[];
  status: FactStatus;
  relevantToGoal: boolean;
  createdAt: Iso;
}

// ─── Strategy brief ──────────────────────────────────────────────────────────

/** One written sentence and the source ids it cites. Sentences that fail the check are removed. */
export interface Sentence {
  text: string;
  sourceIds: string[];
}

export type IcdTerm =
  | "almost_no_chance"
  | "very_unlikely"
  | "unlikely"
  | "roughly_even"
  | "likely"
  | "very_likely"
  | "almost_certain";

export type Confidence = "Low" | "Moderate" | "High";

export interface KeyJudgment {
  text: string;
  icd: IcdTerm;
  /** Stated separately from the probability. */
  confidence: Confidence;
  sourceIds: string[];
}

export interface PathStep {
  stakeholderId: string;
  why: Sentence;
}

export interface ReduceOpposition {
  stakeholderId: string;
  step: Sentence;
}

export interface PlanAction {
  text: string;
  stakeholderId: string;
  sourceIds: string[];
}

/** Fixed four boxes (scoring §6). An empty `event` box shows "No sourced event this week". */
export interface SevenDayPlan {
  prep: PlanAction[];
  contact: PlanAction[];
  event: PlanAction[];
  followUp: PlanAction[];
}

export interface MeetItem {
  eventId: string;
  title: string;
  date: Iso;
  mappedStakeholders: number;
  sourceIds: string[];
}

export interface Brief {
  id: string;
  dossierId: string;
  version: number;
  /** Snapshot of the four metrics for this version; live screens recompute. */
  metrics: BriefMetrics;
  rationale: Sentence[];
  judgments: KeyJudgment[];
  path: PathStep[];
  reduceOpposition: ReduceOpposition[];
  plan: SevenDayPlan;
  summary: Sentence[];
  risks: Sentence[];
  meet: MeetItem[];
  /** "Needs from you: …" lines for optional form fields the brief needed. */
  needs: string[];
  /** 2–4 lines of "What changed and why" from v2 on. */
  changesNote: string[];
  /** Data timestamp when generated, for Out of date (scoring §7). */
  inputsAt: Iso;
  createdAt: Iso;
}

export interface BriefCheckLog {
  id: string;
  briefId: string | null;
  documentId: string | null;
  sentence: string;
  reason: string;
  createdAt: Iso;
}

// ─── Leads (network) ─────────────────────────────────────────────────────────

export type LeadType = "investor" | "lawyer" | "event";

export interface MatchCheck {
  label: string;
  passed: boolean;
  sourceIds: string[];
}

/** Investors and lawyers: sourced checks and a level (spec §16 Q4). Events: mapped attendees. */
export type LeadMatch =
  | { type: "checks"; checks: MatchCheck[]; level: Level }
  | { type: "attendees"; stakeholderIds: string[] };

export interface Lead {
  id: string;
  dossierId: string;
  type: LeadType;
  stakeholderId: string | null;
  name: string;
  kind: string;
  match: LeadMatch;
  meta: string | null;
  why: Sentence | null;
  route: string | null;
  eventDate: Iso | null;
  sourceIds: string[];
  verification: FactStatus;
  status: "new" | "saved";
  createdAt: Iso;
}

// ─── Tracker and debriefs ────────────────────────────────────────────────────

export type TrackerStage = "found" | "contacted" | "met" | "partner";
export type TrackerOrigin = "map" | "network" | "debrief" | "intro" | "manual";

export interface TrackerItem {
  id: string;
  dossierId: string;
  stakeholderId: string | null;
  leadId: string | null;
  stage: TrackerStage;
  nextStep: string | null;
  dueDate: Iso | null;
  meetingAt: Iso | null;
  origin: TrackerOrigin;
  createdAt: Iso;
}

export type DebriefOverall = "positive" | "neutral" | "negative";

export interface Debrief {
  id: string;
  trackerItemId: string;
  stakeholderId: string | null;
  meetingAt: Iso | null;
  reporter: string | null;
  overall: DebriefOverall;
  nextStepAgreed: boolean;
  /** Private to the team; never in the playbook or the share link. */
  notes: string | null;
  supportBefore: number | null;
  supportAfter: number | null;
  stageBefore: TrackerStage;
  stageAfter: TrackerStage;
  addedNextStep: string | null;
  playbookOutcomeId: string | null;
  createdAt: Iso;
}

/** Anonymised outcome: no dossier, names or free text. */
export interface PlaybookOutcome {
  id: string;
  route: string;
  category: Category;
  overall: DebriefOverall;
  nextStepAgreed: boolean;
  createdAt: Iso;
}

// ─── Documents and intros ────────────────────────────────────────────────────

export type DocumentType = "briefing_note" | "risk_deck" | "watch_list";
export type DocumentStatus =
  | "requested"
  | "drafting"
  | "draft_ready"
  | "in_review"
  | "approved"
  | "changes_needed"
  | "failed"
  | "in_progress"
  | "ready";
export type ReviewerKind = "founder" | "expert";

export interface DocumentRequest {
  id: string;
  dossierId: string;
  type: DocumentType;
  trackerItemId: string | null;
  expertReview: boolean;
  createdAt: Iso;
}

export interface NoteSection {
  key: string;
  title: string;
  kind: "bullets" | "paragraph" | "quote";
  sentences: Sentence[];
  /** e.g. the one-line delivery note under the elevator pitch. */
  note: string | null;
}

/** AI draft of a briefing note (spec §11.2). */
export interface BriefingNoteContent {
  preparedFor: string;
  stakeholderId: string | null;
  meeting: { at: Iso | null; place: string | null; length: string | null };
  sections: NoteSection[];
  sourceIds: string[];
}

export interface PortolanDocument {
  id: string;
  dossierId: string;
  requestId: string | null;
  type: DocumentType;
  title: string;
  pages: number | null;
  status: DocumentStatus;
  reviewerName: string | null;
  reviewerKind: ReviewerKind | null;
  factsCheckedAt: Iso | null;
  content: BriefingNoteContent | null;
  /** Path in the private `documents` Storage bucket; never a public URL. */
  storagePath: string | null;
  nextUpdateAt: Iso | null;
  changesNote: string | null;
  createdAt: Iso;
}

export type IntroStatus = "received" | "in_progress" | "introduced" | "not_possible";

export interface IntroRequest {
  id: string;
  dossierId: string;
  stakeholderId: string;
  purpose: string;
  status: IntroStatus;
  resultNote: string | null;
  createdAt: Iso;
}

// ─── Team network (dossier only) ─────────────────────────────────────────────

export type MemberStatus = "invited" | "connected" | "withdrawn";

export interface TeamMember {
  id: string;
  dossierId: string;
  name: string;
  role: string | null;
  status: MemberStatus;
  consentedAt: Iso | null;
  withdrawnAt: Iso | null;
  /** Sample only: "Illustrative — not a real connection" (plan P-2). */
  illustrative?: true;
  createdAt: Iso;
}

export type ContactOrigin = "linkedin" | "google" | "vcard" | "manual";

/** Only name, title, organisation and LinkedIn URL are ever kept: no email or phone. */
export interface Contact {
  id: string;
  memberId: string;
  /** Null when withheld (sample, or a contact at a Chinese organisation). Always shown redacted. */
  name: string | null;
  title: string | null;
  orgText: string;
  linkedinUrl: string | null;
  origin: ContactOrigin;
  illustrative?: true;
  createdAt: Iso;
}

export interface Tie {
  id: string;
  contactId: string;
  stakeholderId: string;
  strength: 1 | 2 | 3;
  how: string;
  match: "exact" | "confirmed";
  illustrative?: true;
  createdAt: Iso;
}

/** Intro draft for a teammate to send (never sent by Portolan). Real drafts aren't stored. */
export interface IntroDraft {
  id: string;
  memberId: string;
  contactId: string | null;
  targetStakeholderId: string;
  text: string;
  sourceIds: string[];
  illustrative?: true;
  createdAt: Iso;
}

export interface OrgAlias {
  id: string;
  /** Null = site-wide seed. */
  dossierId: string | null;
  alias: string;
  stakeholderKey: string;
  createdAt: Iso;
}

// ─── Ops ─────────────────────────────────────────────────────────────────────

export interface EmailOutbox {
  id: string;
  dossierId: string;
  toEmail: string;
  kind: string;
  status: "pending" | "sent_manually";
  createdAt: Iso;
}

export interface OpsLog {
  id: string;
  action: string;
  targetId: string | null;
  actor: string;
  note: string | null;
  createdAt: Iso;
}

// ─── The Dossier aggregate (what every screen reads) ─────────────────────────

export interface Dossier extends DossierMeta {
  isSample: boolean;
  run: ResearchRun | null;
  sources: Source[];
  stakeholders: Stakeholder[];
  facts: Fact[];
  statements: SupportStatement[];
  edges: Edge[];
  events: TimedEvent[];
  /** Oldest first; the last one is current. */
  briefs: Brief[];
  leads: Lead[];
  tracker: TrackerItem[];
  debriefs: Debrief[];
  documentRequests: DocumentRequest[];
  documents: PortolanDocument[];
  intros: IntroRequest[];
  team: TeamMember[];
  contacts: Contact[];
  ties: Tie[];
  introDrafts: IntroDraft[];
  aliases: OrgAlias[];
}

// ─── Sample overlay (SHELL-3: writes on the sample stay in this browser) ─────

/** Collections the sample lets visitors change. Each is stored whole under `portolan.sample.<key>`. */
export type SampleOverlayKey =
  | "tracker"
  | "debriefs"
  | "statements"
  | "sources"
  | "leads"
  | "documentRequests"
  | "documents"
  | "intros"
  | "team"
  | "contacts"
  | "ties"
  | "introDrafts";

export type SampleOverlay = Partial<Pick<Dossier, SampleOverlayKey>> & {
  /** Anonymised outcomes the visitor chose to add (kept locally, never sent). */
  playbook?: PlaybookOutcome[];
};

// ─── Scoring results (computed by src/lib/scoring, never stored as truth) ────

/** A score with its range and level, e.g. "High · 70–85 · based on 3 of 5". */
export interface Banded {
  score: number;
  low: number;
  high: number;
  level: Level;
  basedOn: { rated: number; of: number };
}

/** The five influence factors (scoring §2.1); null = no sourced rating. */
export interface InfluenceRatings {
  authority: Rating03 | null;
  budget: Rating03 | null;
  access: Rating03 | null;
  centrality: Rating03 | null;
  recent: Rating03 | null;
}

export type InfluenceFactor = keyof InfluenceRatings;

/** For SCORE-X: each factor's rating, weight and cited sources. */
export interface FactorBreakdown {
  factor: InfluenceFactor;
  weight: number;
  rating: Rating03 | null;
  sourceIds: string[];
}

export type SupportResult =
  | { kind: "unknown" }
  | { kind: "known"; score: number; stance: Exclude<Stance, "unknown">; basedOn: number };

export interface OppositionResult {
  /** Fractions 0–1. */
  value: number;
  low: number;
  high: number;
  level: Level;
  basedOn: { known: number; of: number };
}

export interface ReadinessResult {
  score: number;
  level: Level;
  checks: { money: Rating03 | null; licence: Rating03 | null; support: Rating03 | null };
  basedOn: { rated: number; of: 3 };
}

export type WindowResult =
  | { found: true; days: number; eventId: string; title: string; date: Iso }
  | { found: false; text: "No sourced deadline found" };

export interface DataConfidenceResult {
  level: Level;
  sourceCount: number;
  qualifying: number;
  of: number;
}

export interface BriefMetrics {
  entryReadiness: ReadinessResult | null;
  opposition: OppositionResult | null;
  window: WindowResult;
  dataConfidence: DataConfidenceResult;
}

export type Quadrant = "champions" | "blockers" | "allies" | "monitor";

export interface ContactPick {
  stakeholderId: string;
  rankScore: number;
  warmPath: boolean;
  /** "Allies to grow" fill when fewer than three candidates pass (scoring §5.3). */
  fromAllies: boolean;
}

export interface BriefStatus {
  outOfDate: boolean;
  reasons: string[];
}
