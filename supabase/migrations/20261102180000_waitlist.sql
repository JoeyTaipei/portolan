-- S12 waitlist (spec §12 "09 Waitlist", §13). People who leave their details after a pitch.
-- Not tied to any dossier. The team reads it in the Supabase dashboard; the app only writes,
-- from the server with the secret key. RLS on, no policies, no grants to the public roles.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(company) between 1 and 200),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 40),
  came_from text not null default 'direct' check (came_from in ('direct', 'docs', 'share')),
  consent_version text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;
