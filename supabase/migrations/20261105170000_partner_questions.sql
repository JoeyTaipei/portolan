-- NET-8 tailored partner questions (spec NET-8, plan S23). One row per generation; the newest
-- row for a dossier is the one shown. Content is checked in code before it is stored (every
-- question cites sources the candidate has). Server only: RLS on, no anon policy.
create table public.partner_question_sets (
  id uuid primary key default gen_random_uuid(),
  dossier_id text not null references public.dossiers (id) on delete cascade,
  content jsonb not null,
  model text,
  created_at timestamptz not null default now()
);
create index partner_question_sets_dossier_idx on public.partner_question_sets (dossier_id, created_at desc);
alter table public.partner_question_sets enable row level security;
