-- Supabase → SQL Editor (проєкт Allexo-MDF)
-- Дозволити вставку заявок з сайту (anon key у браузері)

alter table public.leads enable row level security;

drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert"
  on public.leads
  for insert
  to anon
  with check (true);

-- Опційно: перегляд лише для authenticated (адмін)
-- drop policy if exists "leads_authenticated_select" on public.leads;
-- create policy "leads_authenticated_select"
--   on public.leads for select to authenticated using (true);
