-- Portolan initial schema (docs/spec.md §13). Created in S0; later changes need Joey's OK.
-- Access: the server only, with the secret key. Every table has row level security turned on
-- and no policies, so the anon and authenticated roles can read or write nothing.

create extension if not exists pgcrypto;

-- ─── Dossiers ────────────────────────────────────────────────────────────────

create table public.dossiers (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{22}$'),
  share_id text not null unique check (share_id ~ '^[A-Za-z0-9_-]{22}$'),
  name text not null,
  company text not null check (char_length(company) <= 200),
  product text not null check (char_length(product) <= 200),
  market text not null default 'TW' check (market = 'TW'),
  goal text not null check (char_length(goal) <= 200),
  email text,
  email_hash text,
  certifications text,
  price_range text,
  tw_partners text,
  client_deadline date,
  status text not null default 'researching'
    check (status in ('researching', 'partial', 'ready', 'failed')),
  market_checks jsonb not null default '{"money": null, "licence": null}'::jsonb,
  refreshed_at timestamptz,
  current_run_id uuid,
  created_at timestamptz not null default now()
);
create index dossiers_email_hash_idx on public.dossiers (email_hash);

-- ─── Research runs, cost and limits ──────────────────────────────────────────

create table public.research_runs (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  kind text not null check (kind in ('initial', 'refresh')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'partial', 'done', 'failed')),
  started_at timestamptz,
  deadline_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index research_runs_dossier_idx on public.research_runs (dossier_id);

alter table public.dossiers
  add constraint dossiers_current_run_fk
  foreign key (current_run_id) references public.research_runs (id) on delete set null;

create table public.research_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs (id) on delete cascade,
  kind text not null check (kind in ('discover', 'enrich', 'rate', 'check', 'leads', 'brief')),
  entity_key text,
  parallel_run_id text unique,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'skipped')),
  attempts int not null default 0,
  locked_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now()
);
create index research_steps_run_status_idx on public.research_steps (run_id, status);

create table public.cost_ledger (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.research_runs (id) on delete cascade,
  dossier_id text references public.dossiers (id) on delete cascade,
  provider text not null check (provider in ('parallel', 'anthropic')),
  purpose text not null,
  estimated_usd numeric(10, 4) not null,
  actual_usd numeric(10, 4),
  model text,
  tokens_in int,
  tokens_out int,
  created_at timestamptz not null default now(),
  check (run_id is not null or dossier_id is not null)
);
create index cost_ledger_run_idx on public.cost_ledger (run_id);
create index cost_ledger_dossier_idx on public.cost_ledger (dossier_id);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  day date not null, -- UTC+8 calendar day
  scope text not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  unique (day, scope)
);

-- ─── Sources ─────────────────────────────────────────────────────────────────

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  label text not null,
  url text,
  title text not null,
  publisher text,
  source_type text not null default 'other',
  excerpt text not null,
  excerpt_lang text not null default 'en',
  translation text,
  reliability text not null check (reliability in ('A', 'B', 'C', 'D', 'E', 'F')),
  credibility int not null check (credibility between 1 and 6),
  credibility_reason text,
  published_at date,
  verified_at date,
  origin text not null check (origin in ('parallel_basis', 'debrief', 'manual')),
  accepted boolean not null,
  reject_reason text,
  run_id uuid references public.research_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (dossier_id, label),
  check (accepted or reject_reason is not null),
  check (url is not null or origin = 'debrief')
);

-- ─── Stakeholders ────────────────────────────────────────────────────────────

create table public.stakeholders (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  name text not null,
  name_zh text,
  short text,
  category text not null check (category in ('gov', 'ind', 'cap', 'leg', 'evt')),
  is_person boolean not null default false,
  is_china boolean not null default false,
  role text,
  city text,
  lat double precision,
  lng double precision,
  x real,
  y real,
  z real,
  status text not null default 'active'
    check (status in ('active', 'still_researching', 'pending_check', 'not_found_latest', 'incomplete')),
  first_run_id uuid references public.research_runs (id) on delete set null,
  last_run_id uuid references public.research_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  -- China is organisation level only: never a person record.
  constraint stakeholders_china_org_only check (not (is_china and is_person))
);
create index stakeholders_dossier_idx on public.stakeholders (dossier_id);

create table public.facts (
  id uuid primary key default gen_random_uuid(),
  stakeholder_id uuid not null references public.stakeholders (id) on delete cascade,
  run_id uuid references public.research_runs (id) on delete set null,
  field text not null
    check (field in ('title', 'role', 'mandate', 'head', 'authority', 'budget', 'access', 'recent', 'action', 'address')),
  value jsonb not null,
  rating int check (rating between 0 and 3),
  quote text,
  source_ids uuid[] not null default '{}',
  status text not null check (status in ('sourced', 'unverified')),
  model text,
  created_at timestamptz not null default now(),
  -- "sourced" needs at least one source id.
  check (status = 'unverified' or cardinality(source_ids) > 0)
);
create index facts_stakeholder_idx on public.facts (stakeholder_id);

-- ─── Tracker and debriefs (before statements, which may cite a debrief) ──────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  type text not null check (type in ('investor', 'lawyer', 'event')),
  stakeholder_id uuid references public.stakeholders (id) on delete set null,
  name text not null,
  kind text not null,
  match jsonb not null,
  meta text,
  why jsonb,
  route text,
  event_date date,
  source_ids uuid[] not null default '{}',
  verification text not null default 'unverified' check (verification in ('sourced', 'unverified')),
  status text not null default 'new' check (status in ('new', 'saved')),
  created_at timestamptz not null default now(),
  check (verification = 'unverified' or cardinality(source_ids) > 0)
);
create index leads_dossier_idx on public.leads (dossier_id);

create table public.tracker_items (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  stakeholder_id uuid references public.stakeholders (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  stage text not null default 'found' check (stage in ('found', 'contacted', 'met', 'partner')),
  next_step text,
  due_date date,
  meeting_at timestamptz,
  origin text not null check (origin in ('map', 'network', 'debrief', 'intro', 'manual')),
  created_at timestamptz not null default now(),
  check (stakeholder_id is not null or lead_id is not null)
);
create index tracker_items_dossier_idx on public.tracker_items (dossier_id);

-- Anonymised: no dossier, person or free-text columns.
create table public.playbook_outcomes (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  category text not null check (category in ('gov', 'ind', 'cap', 'leg', 'evt')),
  overall text not null check (overall in ('positive', 'neutral', 'negative')),
  next_step_agreed boolean not null,
  created_at timestamptz not null default now()
);

create table public.debriefs (
  id uuid primary key default gen_random_uuid(),
  tracker_item_id uuid not null references public.tracker_items (id) on delete cascade,
  stakeholder_id uuid references public.stakeholders (id) on delete cascade,
  meeting_at timestamptz,
  reporter text,
  overall text not null check (overall in ('positive', 'neutral', 'negative')),
  next_step_agreed boolean not null,
  notes text check (char_length(notes) <= 1000),
  support_before int,
  support_after int,
  stage_before text not null check (stage_before in ('found', 'contacted', 'met', 'partner')),
  stage_after text not null check (stage_after in ('found', 'contacted', 'met', 'partner')),
  added_next_step text,
  playbook_outcome_id uuid references public.playbook_outcomes (id) on delete set null,
  created_at timestamptz not null default now()
);
create index debriefs_tracker_item_idx on public.debriefs (tracker_item_id);

create table public.support_statements (
  id uuid primary key default gen_random_uuid(),
  stakeholder_id uuid not null references public.stakeholders (id) on delete cascade,
  run_id uuid references public.research_runs (id) on delete set null,
  debrief_id uuid references public.debriefs (id) on delete cascade,
  rating int not null check (rating between -2 and 2),
  summary text not null,
  quote text,
  source_id uuid not null references public.sources (id) on delete cascade,
  stated_at date,
  created_at timestamptz not null default now()
);
create index support_statements_stakeholder_idx on public.support_statements (stakeholder_id);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  a_id uuid not null references public.stakeholders (id) on delete cascade,
  b_id uuid not null references public.stakeholders (id) on delete cascade,
  relation text not null,
  source_ids uuid[] not null default '{}',
  status text not null check (status in ('sourced', 'unverified')),
  created_at timestamptz not null default now(),
  check (a_id <> b_id),
  check (status = 'unverified' or cardinality(source_ids) > 0)
);
create index edges_dossier_idx on public.edges (dossier_id);

create table public.timed_events (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('budget_vote', 'tender_close', 'committee_review', 'event')),
  date date,
  stakeholder_ids uuid[] not null default '{}',
  source_ids uuid[] not null default '{}',
  status text not null check (status in ('sourced', 'unverified')),
  relevant_to_goal boolean not null default false,
  created_at timestamptz not null default now(),
  check (status = 'unverified' or cardinality(source_ids) > 0)
);
create index timed_events_dossier_idx on public.timed_events (dossier_id);

-- ─── Strategy brief ──────────────────────────────────────────────────────────

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  version int not null,
  metrics jsonb not null,
  rationale jsonb not null default '[]'::jsonb,
  judgments jsonb not null default '[]'::jsonb,
  path jsonb not null default '[]'::jsonb,
  reduce_opposition jsonb not null default '[]'::jsonb,
  plan jsonb not null default '{"prep": [], "contact": [], "event": [], "followUp": []}'::jsonb,
  summary jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  meet jsonb not null default '[]'::jsonb,
  needs jsonb not null default '[]'::jsonb,
  changes_note jsonb not null default '[]'::jsonb,
  inputs_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (dossier_id, version)
);

-- ─── Documents and intros ────────────────────────────────────────────────────

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  type text not null check (type in ('briefing_note', 'risk_deck', 'watch_list')),
  tracker_item_id uuid references public.tracker_items (id) on delete set null,
  expert_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index document_requests_dossier_idx on public.document_requests (dossier_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  request_id uuid references public.document_requests (id) on delete set null,
  type text not null check (type in ('briefing_note', 'risk_deck', 'watch_list')),
  title text not null,
  pages int,
  status text not null check (status in (
    'requested', 'drafting', 'draft_ready', 'in_review', 'approved',
    'changes_needed', 'failed', 'in_progress', 'ready'
  )),
  reviewer_name text,
  reviewer_kind text check (reviewer_kind in ('founder', 'expert')),
  facts_checked_at date,
  content jsonb,
  storage_path text,
  next_update_at date,
  changes_note text,
  created_at timestamptz not null default now()
);
create index documents_dossier_idx on public.documents (dossier_id);

create table public.brief_check_log (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  sentence text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check (brief_id is not null or document_id is not null)
);

create table public.intro_requests (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  stakeholder_id uuid not null references public.stakeholders (id) on delete cascade,
  purpose text not null check (char_length(purpose) <= 300),
  status text not null default 'received'
    check (status in ('received', 'in_progress', 'introduced', 'not_possible')),
  result_note text,
  created_at timestamptz not null default now()
);

-- ─── Team network (this dossier only) ────────────────────────────────────────

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  name text not null,
  role text,
  status text not null default 'invited' check (status in ('invited', 'connected', 'withdrawn')),
  consented_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index team_members_dossier_idx on public.team_members (dossier_id);

-- Only name, title, organisation and LinkedIn URL: no email, phone, address or notes.
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members (id) on delete cascade,
  name text check (char_length(name) <= 200),
  title text check (char_length(title) <= 200),
  org_text text not null check (char_length(org_text) <= 200),
  linkedin_url text check (char_length(linkedin_url) <= 200),
  origin text not null check (origin in ('linkedin', 'google', 'vcard', 'manual')),
  created_at timestamptz not null default now()
);
create index contacts_member_idx on public.contacts (member_id);

create table public.ties (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  stakeholder_id uuid not null references public.stakeholders (id) on delete cascade,
  strength int not null default 1 check (strength between 1 and 3),
  how text not null,
  match text not null check (match in ('exact', 'confirmed')),
  created_at timestamptz not null default now()
);
create index ties_contact_idx on public.ties (contact_id);

create table public.org_aliases (
  id uuid primary key default gen_random_uuid(),
  dossier_id text references public.dossiers (id) on delete cascade, -- null = site-wide seed
  alias text not null,
  stakeholder_key text not null,
  created_at timestamptz not null default now()
);
create unique index org_aliases_unique_idx
  on public.org_aliases (coalesce(dossier_id, ''), lower(alias));

-- ─── Ops ─────────────────────────────────────────────────────────────────────

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  to_email text not null,
  kind text not null,
  status text not null default 'pending' check (status in ('pending', 'sent_manually')),
  created_at timestamptz not null default now()
);

create table public.ops_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_id text,
  actor text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ─── Row level security: on for all 26 tables, no policies ───────────────────

alter table public.dossiers enable row level security;
alter table public.research_runs enable row level security;
alter table public.research_steps enable row level security;
alter table public.cost_ledger enable row level security;
alter table public.usage_counters enable row level security;
alter table public.sources enable row level security;
alter table public.stakeholders enable row level security;
alter table public.facts enable row level security;
alter table public.support_statements enable row level security;
alter table public.edges enable row level security;
alter table public.timed_events enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_check_log enable row level security;
alter table public.leads enable row level security;
alter table public.tracker_items enable row level security;
alter table public.debriefs enable row level security;
alter table public.playbook_outcomes enable row level security;
alter table public.document_requests enable row level security;
alter table public.documents enable row level security;
alter table public.intro_requests enable row level security;
alter table public.team_members enable row level security;
alter table public.contacts enable row level security;
alter table public.ties enable row level security;
alter table public.org_aliases enable row level security;
alter table public.email_outbox enable row level security;
alter table public.ops_log enable row level security;

-- Belt and braces: the public roles get no table privileges either.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ─── Functions (server only) ─────────────────────────────────────────────────

-- Claim up to n queued steps of a run for processing (spec §7.3). Concurrent callers never
-- get the same step.
create function public.claim_research_steps(p_run_id uuid, p_n int)
returns setof public.research_steps
language sql
security invoker
set search_path = ''
as $$
  update public.research_steps s
     set status = 'running', locked_at = now(), attempts = s.attempts + 1
   where s.id in (
     select q.id from public.research_steps q
      where q.run_id = p_run_id and q.status = 'queued'
      order by q.created_at
      limit greatest(p_n, 0)
      for update skip locked
   )
  returning s.*;
$$;

-- Atomically add one to a usage counter if it is below p_max. Returns whether it was allowed.
create function public.bump_usage(p_day date, p_scope text, p_max int)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  if p_max < 1 then
    return false;
  end if;
  insert into public.usage_counters as u (day, scope, count)
  values (p_day, p_scope, 1)
  on conflict (day, scope) do update
    set count = u.count + 1
    where u.count < p_max
  returning u.count into v_count;
  return v_count is not null;
end;
$$;

revoke execute on function public.claim_research_steps(uuid, int) from public, anon, authenticated;
revoke execute on function public.bump_usage(date, text, int) from public, anon, authenticated;
grant execute on function public.claim_research_steps(uuid, int) to service_role;
grant execute on function public.bump_usage(date, text, int) to service_role;

-- ─── Storage: private bucket for uploaded document PDFs ──────────────────────

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- ─── Site-wide organisation aliases ──────────────────────────────────────────

insert into public.org_aliases (dossier_id, alias, stakeholder_key) values
  (null, '中科院', 'ncsist'),
  (null, '國家中山科學研究院', 'ncsist'),
  (null, 'NCSIST', 'ncsist'),
  (null, 'National Chung-Shan Institute of Science and Technology', 'ncsist');
