-- I18N-9 繁中 for real dossiers (spec SHELL-4, plan S19). English sentence → checked Chinese,
-- written by the translation pass after each brief version. Null = not translated (older
-- briefs, a failed or refused pass); the screens then show the English.
alter table public.briefs add column zh jsonb;
