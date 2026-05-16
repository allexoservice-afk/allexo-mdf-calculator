-- Виконайте в Supabase → SQL Editor (проєкт Allexo-MDF)
-- Після виконання: Settings → API → Reload schema (або зачекайте ~1 хв)

alter table public.leads add column if not exists city text;
alter table public.leads add column if not exists preferred_contact_method text;
alter table public.leads add column if not exists comment text;
alter table public.leads add column if not exists positions_count integer;

-- Опційно: дубль jsonb (код за замовчуванням пише в calculation_details)
alter table public.leads add column if not exists calculation_data jsonb;
