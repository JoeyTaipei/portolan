-- MKT-1 (plan S20): a market can target Taiwan, Vietnam or Thailand.
alter table dossiers drop constraint if exists dossiers_market_check;
alter table dossiers add constraint dossiers_market_check check (market in ('TW', 'VN', 'TH'));
