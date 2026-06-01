-- Номери заявок ALX-2026-001, ALX-2026-002, …
-- Supabase → SQL Editor → Run (після setup-leads.sql)

alter table public.leads add column if not exists quote_reference text;

create unique index if not exists leads_quote_reference_unique
  on public.leads (quote_reference)
  where quote_reference is not null;

create table if not exists public.quote_reference_counters (
  year integer primary key,
  last_number integer not null default 0
);

create or replace function public.next_quote_reference()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  insert into quote_reference_counters (year, last_number)
  values (y, 1)
  on conflict (year) do update
    set last_number = quote_reference_counters.last_number + 1
  returning last_number into n;

  return 'ALX-' || y::text || '-' || lpad(n::text, 3, '0');
end;
$$;

revoke all on function public.next_quote_reference() from public;
grant execute on function public.next_quote_reference() to anon;
grant execute on function public.next_quote_reference() to authenticated;
