-- BRIEF-12 procurement routes (spec §11.1, plan S16). Each item:
-- { route, text, sourceIds, buyerId, access, money: { amount, asOf, status, sourceIds } | null }.
-- Older briefs keep the empty default and the screens hide the section.
alter table public.briefs add column routes jsonb not null default '[]'::jsonb;
