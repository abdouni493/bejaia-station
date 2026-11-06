-- =====================================================================================
--  Supabase, seule source des données
--  • Les réglages de la zakât quittent le navigateur pour station_settings.
--  • Les fiches du jeu de démonstration (identifiants « …-demo-… ») qu'une
--    ancienne copie locale a pu pousser dans biz_products sont retirées.
--    (L'application retire aussi celles du blob biz_store à son prochain
--    démarrage, et les supprime de biz_products elle-même.)
--  Idempotent : peut être rejoué sans risque.
-- =====================================================================================
alter table public.station_settings add column if not exists zakat_config jsonb;

delete from public.biz_products where id ~ '^[a-z0-9]+-demo-';
