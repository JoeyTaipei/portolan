import "server-only";
import type {
  Brief,
  BriefMetrics,
  Category,
  Contact,
  ContactOrigin,
  Credibility,
  Debrief,
  DebriefMemo,
  DebriefOverall,
  DocumentRequest,
  DocumentStatus,
  DocumentType,
  Dossier,
  DossierStatus,
  Edge,
  Fact,
  FactField,
  FactStatus,
  IntroRequest,
  IntroStatus,
  Json,
  Lead,
  LeadMatch,
  LeadType,
  MarketChecks,
  MemberStatus,
  OrgAlias,
  PartnerQuestionSet,
  PortolanDocument,
  Rating03,
  Reliability,
  ReviewerKind,
  Sentence,
  EntryRequirement,
  ProcurementRoute,
  SevenDayPlan,
  Source,
  SourceOrigin,
  SourceType,
  Stakeholder,
  StakeholderStatus,
  StatementRating,
  SupportStatement,
  TeamMember,
  Tie,
  TimedEvent,
  TimedEventKind,
  TrackerItem,
  TrackerOrigin,
  TrackerStage,
} from "@/lib/types";
import { db, toRun } from "./research";

// Assemble the Dossier aggregate every screen reads (spec §13) from the database.
// Scores are never read from storage: screens recompute them with src/lib/scoring. The email
// columns are never selected, so they can't reach a page. Research history is kept in the
// tables (spec §7.6), but the aggregate shows each stakeholder's latest run of facts and
// statements; debrief statements always stay.

type Row = Record<string, unknown>;

async function rows(what: string, q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Row[]> {
  const r = await q;
  if (r.error) throw new Error(`read ${what}: ${r.error.message}`);
  return (r.data as Row[] | null) ?? [];
}

const s = (v: unknown) => (v as string) ?? null;
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const json = <T>(v: unknown, fallback: T): T => (v === null || v === undefined ? fallback : (v as T));

const DOSSIER_COLUMNS =
  "id, share_id, name, company, product, market, goal, certifications, price_range, tw_partners, client_deadline, status, market_checks, refreshed_at, current_run_id, created_at";

/** Latest run's rows per stakeholder: the run of each stakeholder's newest research row. */
function latestPerStakeholder<T extends { stakeholderId: string; runId: string | null; createdAt: string }>(items: T[]): T[] {
  const latest = new Map<string, { runId: string | null; at: string }>();
  for (const x of items) {
    const cur = latest.get(x.stakeholderId);
    if (!cur || x.createdAt > cur.at) latest.set(x.stakeholderId, { runId: x.runId, at: x.createdAt });
  }
  return items.filter((x) => latest.get(x.stakeholderId)?.runId === x.runId);
}

function uniqueBy<T>(items: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function readBy(column: "id" | "share_id", value: string): Promise<Dossier | null> {
  const client = db();
  const r = await client.from("dossiers").select(DOSSIER_COLUMNS).eq(column, value).maybeSingle();
  if (r.error) throw new Error(`read dossier: ${r.error.message}`);
  const d = r.data as Row | null;
  if (!d) return null;
  const id = d.id as string;

  const [runRows, sourceRows, stakeholderRows, edgeRows, eventRows, briefRows, leadRows, trackerRows, requestRows, documentRows, introRows, memberRows, aliasRows] =
    await Promise.all([
      d.current_run_id ? rows("run", client.from("research_runs").select().eq("id", d.current_run_id as string)) : Promise.resolve([]),
      rows("sources", client.from("sources").select().eq("dossier_id", id)),
      rows("stakeholders", client.from("stakeholders").select().eq("dossier_id", id).order("created_at")),
      rows("edges", client.from("edges").select().eq("dossier_id", id)),
      rows("events", client.from("timed_events").select().eq("dossier_id", id).order("date")),
      rows("briefs", client.from("briefs").select().eq("dossier_id", id).order("version")),
      rows("leads", client.from("leads").select().eq("dossier_id", id).order("created_at")),
      rows("tracker", client.from("tracker_items").select().eq("dossier_id", id).order("created_at")),
      rows("document requests", client.from("document_requests").select().eq("dossier_id", id)),
      rows("documents", client.from("documents").select().eq("dossier_id", id).order("created_at")),
      rows("intros", client.from("intro_requests").select().eq("dossier_id", id)),
      rows("team", client.from("team_members").select().eq("dossier_id", id)),
      rows("aliases", client.from("org_aliases").select().eq("dossier_id", id)),
    ]);

  const stakeholderIds = stakeholderRows.map((x) => x.id as string);
  const trackerIds = trackerRows.map((x) => x.id as string);
  const memberIds = memberRows.map((x) => x.id as string);
  const [factRows, statementRows, debriefRows, contactRows] = await Promise.all([
    stakeholderIds.length ? rows("facts", client.from("facts").select().in("stakeholder_id", stakeholderIds)) : Promise.resolve([]),
    stakeholderIds.length ? rows("statements", client.from("support_statements").select().in("stakeholder_id", stakeholderIds)) : Promise.resolve([]),
    trackerIds.length ? rows("debriefs", client.from("debriefs").select().in("tracker_item_id", trackerIds).order("created_at")) : Promise.resolve([]),
    memberIds.length ? rows("contacts", client.from("contacts").select().in("member_id", memberIds)) : Promise.resolve([]),
  ]);
  const contactIds = contactRows.map((x) => x.id as string);
  const tieRows = contactIds.length ? await rows("ties", client.from("ties").select().in("contact_id", contactIds)) : [];

  const sources: Source[] = sourceRows
    .map((x) => ({
      id: x.id as string,
      dossierId: id,
      label: x.label as string,
      url: s(x.url),
      title: x.title as string,
      publisher: s(x.publisher),
      sourceType: x.source_type as SourceType,
      excerpt: x.excerpt as string,
      excerptLang: x.excerpt_lang as string,
      translation: s(x.translation),
      reliability: x.reliability as Reliability,
      credibility: x.credibility as Credibility,
      credibilityReason: s(x.credibility_reason),
      publishedAt: s(x.published_at),
      verifiedAt: s(x.verified_at),
      origin: x.origin as SourceOrigin,
      accepted: x.accepted as boolean,
      rejectReason: s(x.reject_reason),
      runId: s(x.run_id),
      createdAt: x.created_at as string,
    }))
    .sort((a, b) => Number(a.label.slice(1)) - Number(b.label.slice(1)));

  const stakeholders: Stakeholder[] = stakeholderRows.map((x) => {
    const base = {
      id: x.id as string,
      dossierId: id,
      name: x.name as string,
      nameZh: s(x.name_zh),
      short: s(x.short),
      category: x.category as Category,
      role: s(x.role),
      city: s(x.city),
      lat: (x.lat as number) ?? null,
      lng: (x.lng as number) ?? null,
      x: (x.x as number) ?? null,
      y: (x.y as number) ?? null,
      z: (x.z as number) ?? null,
      status: x.status as StakeholderStatus,
      firstRunId: s(x.first_run_id),
      lastRunId: s(x.last_run_id),
      createdAt: x.created_at as string,
    };
    // China is organisation level only (the DB check constraint enforces it too).
    return x.is_china ? { ...base, isChina: true as const, isPerson: false as const } : { ...base, isChina: false as const, isPerson: Boolean(x.is_person) };
  });

  const allFacts: Fact[] = factRows.map((x) => ({
    id: x.id as string,
    stakeholderId: x.stakeholder_id as string,
    runId: s(x.run_id),
    field: x.field as FactField,
    value: x.value as Json,
    rating: (x.rating as Rating03) ?? null,
    quote: s(x.quote),
    sourceIds: arr(x.source_ids),
    status: x.status as FactStatus,
    model: s(x.model),
    debriefId: s(x.debrief_id),
    createdAt: x.created_at as string,
  }));
  // Research facts: each stakeholder's latest run. Meeting memo facts (TRK-10): all of them,
  // kept out of the "latest run" pick so a run-less memo fact never hides research.
  const researchFacts = latestPerStakeholder(allFacts.filter((f) => !f.debriefId));
  const facts: Fact[] = [...researchFacts, ...allFacts.filter((f) => f.debriefId)];

  const allStatements: SupportStatement[] = statementRows.map((x) => ({
    id: x.id as string,
    stakeholderId: x.stakeholder_id as string,
    runId: s(x.run_id),
    debriefId: s(x.debrief_id),
    rating: x.rating as StatementRating,
    summary: x.summary as string,
    quote: s(x.quote),
    sourceId: x.source_id as string,
    statedAt: s(x.stated_at),
    createdAt: x.created_at as string,
  }));
  // Research statements: the latest run that rated each stakeholder. Debrief statements: all.
  const lastRated = new Map<string, string | null>();
  for (const f of researchFacts) lastRated.set(f.stakeholderId, f.runId);
  const statements = allStatements.filter((x) => x.debriefId !== null || !lastRated.has(x.stakeholderId) || lastRated.get(x.stakeholderId) === x.runId);

  // A refresh can find the same tie or event again: show each once.
  const edges: Edge[] = uniqueBy(
    edgeRows.map((x) => ({
      id: x.id as string,
      dossierId: id,
      aId: x.a_id as string,
      bId: x.b_id as string,
      relation: x.relation as string,
      sourceIds: arr(x.source_ids),
      status: x.status as FactStatus,
      debriefId: s(x.debrief_id),
      createdAt: x.created_at as string,
    })),
    (e) => [e.aId, e.bId].sort().join("|") + "|" + e.relation.toLowerCase(),
  );
  const events: TimedEvent[] = uniqueBy(
    eventRows.map((x) => ({
      id: x.id as string,
      dossierId: id,
      title: x.title as string,
      kind: x.kind as TimedEventKind,
      date: s(x.date),
      stakeholderIds: arr(x.stakeholder_ids),
      sourceIds: arr(x.source_ids),
      status: x.status as FactStatus,
      relevantToGoal: Boolean(x.relevant_to_goal),
      createdAt: x.created_at as string,
    })),
    (e) => `${e.title.toLowerCase()}|${e.date ?? ""}`,
  );

  const briefs: Brief[] = briefRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    version: x.version as number,
    // A snapshot for this version only; live screens recompute the metrics.
    metrics: x.metrics as BriefMetrics,
    rationale: json<Sentence[]>(x.rationale, []),
    judgments: json(x.judgments, []),
    path: json(x.path, []),
    reduceOpposition: json(x.reduce_opposition, []),
    plan: json<SevenDayPlan>(x.plan, { prep: [], contact: [], event: [], followUp: [] }),
    summary: json<Sentence[]>(x.summary, []),
    risks: json<Sentence[]>(x.risks, []),
    requirements: json<EntryRequirement[]>(x.requirements, []),
    routes: json<ProcurementRoute[]>(x.routes, []),
    meet: json(x.meet, []),
    needs: json<string[]>(x.needs, []),
    changesNote: json<string[]>(x.changes_note, []),
    zh: json<Record<string, string> | null>(x.zh, null),
    inputsAt: x.inputs_at as string,
    createdAt: x.created_at as string,
  }));

  const leads: Lead[] = leadRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    type: x.type as LeadType,
    stakeholderId: s(x.stakeholder_id),
    name: x.name as string,
    kind: x.kind as string,
    match: x.match as LeadMatch,
    meta: s(x.meta),
    why: json<Sentence | null>(x.why, null),
    route: s(x.route),
    eventDate: s(x.event_date),
    sourceIds: arr(x.source_ids),
    verification: x.verification as FactStatus,
    status: x.status as Lead["status"],
    createdAt: x.created_at as string,
  }));

  const tracker: TrackerItem[] = trackerRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    stakeholderId: s(x.stakeholder_id),
    leadId: s(x.lead_id),
    stage: x.stage as TrackerStage,
    nextStep: s(x.next_step),
    dueDate: s(x.due_date),
    meetingAt: s(x.meeting_at),
    origin: x.origin as TrackerOrigin,
    createdAt: x.created_at as string,
  }));

  const debriefs: Debrief[] = debriefRows.map((x) => ({
    id: x.id as string,
    trackerItemId: x.tracker_item_id as string,
    stakeholderId: s(x.stakeholder_id),
    meetingAt: s(x.meeting_at),
    reporter: s(x.reporter),
    overall: x.overall as DebriefOverall,
    nextStepAgreed: Boolean(x.next_step_agreed),
    notes: s(x.notes),
    supportBefore: (x.support_before as number) ?? null,
    supportAfter: (x.support_after as number) ?? null,
    stageBefore: x.stage_before as TrackerStage,
    stageAfter: x.stage_after as TrackerStage,
    addedNextStep: s(x.added_next_step),
    playbookOutcomeId: s(x.playbook_outcome_id),
    memo: (x.memo as DebriefMemo | null) ?? null,
    createdAt: x.created_at as string,
  }));

  const documentRequests: DocumentRequest[] = requestRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    type: x.type as DocumentType,
    trackerItemId: s(x.tracker_item_id),
    expertReview: Boolean(x.expert_review),
    createdAt: x.created_at as string,
  }));

  const documents: PortolanDocument[] = documentRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    requestId: s(x.request_id),
    type: x.type as DocumentType,
    title: x.title as string,
    pages: (x.pages as number) ?? null,
    status: x.status as DocumentStatus,
    reviewerName: s(x.reviewer_name),
    reviewerKind: (x.reviewer_kind as ReviewerKind) ?? null,
    factsCheckedAt: s(x.facts_checked_at),
    content: json(x.content, null),
    storagePath: s(x.storage_path),
    nextUpdateAt: s(x.next_update_at),
    changesNote: s(x.changes_note),
    createdAt: x.created_at as string,
  }));

  const intros: IntroRequest[] = introRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    stakeholderId: x.stakeholder_id as string,
    purpose: x.purpose as string,
    status: x.status as IntroStatus,
    resultNote: s(x.result_note),
    createdAt: x.created_at as string,
  }));

  const team: TeamMember[] = memberRows.map((x) => ({
    id: x.id as string,
    dossierId: id,
    name: x.name as string,
    role: s(x.role),
    status: x.status as MemberStatus,
    consentedAt: s(x.consented_at),
    withdrawnAt: s(x.withdrawn_at),
    createdAt: x.created_at as string,
  }));

  const contacts: Contact[] = contactRows.map((x) => ({
    id: x.id as string,
    memberId: x.member_id as string,
    name: s(x.name),
    title: s(x.title),
    orgText: x.org_text as string,
    linkedinUrl: s(x.linkedin_url),
    origin: x.origin as ContactOrigin,
    createdAt: x.created_at as string,
  }));

  const ties: Tie[] = tieRows.map((x) => ({
    id: x.id as string,
    contactId: x.contact_id as string,
    stakeholderId: x.stakeholder_id as string,
    strength: x.strength as Tie["strength"],
    how: x.how as string,
    match: x.match as Tie["match"],
    createdAt: x.created_at as string,
  }));

  const aliases: OrgAlias[] = aliasRows.map((x) => ({
    id: x.id as string,
    dossierId: s(x.dossier_id),
    alias: x.alias as string,
    stakeholderKey: x.stakeholder_key as string,
    createdAt: x.created_at as string,
  }));

  return {
    id,
    shareId: d.share_id as string,
    name: d.name as string,
    company: d.company as string,
    product: d.product as string,
    market: d.market === "VN" || d.market === "TH" ? d.market : "TW",
    goal: d.goal as string,
    certifications: s(d.certifications),
    priceRange: s(d.price_range),
    twPartners: s(d.tw_partners),
    clientDeadline: s(d.client_deadline),
    status: d.status as DossierStatus,
    marketChecks: json<MarketChecks>(d.market_checks, { money: null, licence: null }),
    refreshedAt: s(d.refreshed_at),
    currentRunId: s(d.current_run_id),
    createdAt: d.created_at as string,
    isSample: false,
    run: runRows[0] ? toRun(runRows[0]) : null,
    sources,
    stakeholders,
    facts,
    statements,
    edges,
    events,
    briefs,
    leads,
    tracker,
    debriefs,
    documentRequests,
    documents,
    intros,
    team,
    contacts,
    ties,
    // Real intro drafts aren't stored (spec §10.6): they're written on request.
    introDrafts: [],
    aliases,
    partnerQuestions: await readPartnerQuestions(client, id),
  };
}

/** A real dossier by its id (already format-checked by the caller), or null. */
export function readDossier(id: string): Promise<Dossier | null> {
  return readBy("id", id);
}

/** A real dossier by its share id (already format-checked by the caller), or null. */
export function readByShareId(shareId: string): Promise<Dossier | null> {
  return readBy("share_id", shareId);
}

/** NET-8: the newest tailored partner questions. A missing table or bad row never blocks the dossier (starter questions show). */
async function readPartnerQuestions(client: ReturnType<typeof db>, dossierId: string): Promise<PartnerQuestionSet | null> {
  try {
    const r = await client.from("partner_question_sets").select().eq("dossier_id", dossierId).order("created_at", { ascending: false }).limit(1);
    const row = r.error ? null : (r.data?.[0] as Row | undefined);
    const entries = (row?.content as { entries?: PartnerQuestionSet["entries"] } | null)?.entries;
    if (!row || !Array.isArray(entries)) return null;
    return { id: row.id as string, createdAt: row.created_at as string, model: (row.model as string | null) ?? null, entries };
  } catch {
    return null;
  }
}
