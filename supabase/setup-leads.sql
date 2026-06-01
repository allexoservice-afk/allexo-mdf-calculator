-- Один раз у Supabase → SQL Editor → Run
-- Проєкт: jmqytyyiljghsqitseus (Allexo-MDF)

-- Колонки (якщо ще немає)
alter table public.leads add column if not exists city text;
alter table public.leads add column if not exists preferred_contact_method text;
alter table public.leads add column if not exists comment text;
alter table public.leads add column if not exists positions_count integer;
alter table public.leads add column if not exists calculation_details jsonb;
alter table public.leads add column if not exists discount numeric default 0;
alter table public.leads add column if not exists windows_count integer default 0;
alter table public.leads add column if not exists quote_reference text;

-- Дозволити заявки з сайту (anon key)
alter table public.leads enable row level security;

drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert"
  on public.leads
  for insert
  to anon
  with check (true);
