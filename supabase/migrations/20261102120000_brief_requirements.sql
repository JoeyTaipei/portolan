-- BRIEF-9 entry requirements (spec §11.1, plan S11). Each item: { topic, text, sourceIds }.
-- Older briefs keep the empty default and the screens hide the section.
alter table public.briefs add column requirements jsonb not null default '[]'::jsonb;
