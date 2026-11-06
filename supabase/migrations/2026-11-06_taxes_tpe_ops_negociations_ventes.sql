-- Taxes réutilisables, opérations TPE/TAG indépendantes, négociations bancaires,
-- factures Ventes Carburant. (Le mode démo n'en a pas besoin : schéma libre.)

-- Repair tables left with uuid ids by an earlier failed run (empty, safe to drop)
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public'
             and table_name='bank_negotiations' and column_name='id' and data_type='uuid') then
    drop table public.bank_negotiations; end if;
  if exists (select 1 from information_schema.columns where table_schema='public'
             and table_name='tag_types' and column_name='id' and data_type='uuid') then
    drop table public.tag_types; end if;
  if exists (select 1 from information_schema.columns where table_schema='public'
             and table_name='tax_presets' and column_name='id' and data_type='uuid') then
    drop table public.tax_presets; end if;
end $$;

create table if not exists tax_presets (
  id text primary key, name text not null, kind text not null default 'percent',
  value numeric not null default 0, created_at timestamptz default now()
);

alter table purchases add column if not exists extra_taxes jsonb default '[]'::jsonb;
alter table purchases add column if not exists extra_taxes_amount numeric default 0;

alter table brigade_accounting_justifications add column if not exists entry_mode text;
alter table brigade_accounting_justifications add column if not exists operations jsonb default '[]'::jsonb;
alter table brigade_accounting_justifications add column if not exists tag_type text;

create table if not exists tag_types (
  id text primary key, name text not null, created_at timestamptz default now()
);

create table if not exists bank_negotiations (
  id text primary key, bank_account_id text references bank_accounts(id) on delete cascade,
  date timestamptz not null, amount numeric not null default 0,
  item_keys jsonb default '[]'::jsonb, items jsonb default '[]'::jsonb,
  notes text, reference text, tx_id text, created_by text, created_at timestamptz default now()
);

alter table shop_sales add column if not exists invoice_meta jsonb;

-- Row Level Security for the tables above (signed-in staff only)
alter table public.tax_presets       enable row level security;
alter table public.tag_types         enable row level security;
alter table public.bank_negotiations enable row level security;
drop policy if exists tax_presets_staff on public.tax_presets;
create policy tax_presets_staff on public.tax_presets for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists tag_types_staff on public.tag_types;
create policy tag_types_staff on public.tag_types for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists bank_negotiations_staff on public.bank_negotiations;
create policy bank_negotiations_staff on public.bank_negotiations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
