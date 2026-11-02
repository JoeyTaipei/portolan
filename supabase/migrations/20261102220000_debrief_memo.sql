-- TRK-9…12 meeting memo (spec §12 06, docs/scoring.md §3.2, plan S18).
-- The memo's answers live on the debrief; its influence answers become facts and its
-- "who else must agree" answers become edges, both citing the debrief's own source.
-- Deleting the debrief (Undo) removes them with it. Old rows read null.
alter table public.debriefs add column memo jsonb;
alter table public.facts add column debrief_id uuid references public.debriefs (id) on delete cascade;
alter table public.edges add column debrief_id uuid references public.debriefs (id) on delete cascade;
create index facts_debrief_idx on public.facts (debrief_id) where debrief_id is not null;
create index edges_debrief_idx on public.edges (debrief_id) where debrief_id is not null;
