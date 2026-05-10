-- ── travel_expenses: id-kolom een default geven ──────────────────────────────
-- De `id`-kolom mist een DEFAULT, waardoor inserts zonder expliciete id falen
-- met:  null value in column "id" of relation "travel_expenses" violates not-null constraint
--
-- Voer dit script uit in de Supabase SQL Editor (dashboard.supabase.com) zodat
-- ook clients die geen id meesturen blijven werken.

-- Zorg dat de uuid-extensie aanwezig is voor gen_random_uuid()
create extension if not exists pgcrypto;

-- Wanneer de kolom van het type uuid is:
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'travel_expenses'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    execute 'alter table public.travel_expenses alter column id set default gen_random_uuid()';
  end if;
end$$;

-- Wanneer de kolom van het type text is, gebruiken we ook gen_random_uuid()::text:
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'travel_expenses'
      and column_name = 'id'
      and data_type = 'text'
  ) then
    execute 'alter table public.travel_expenses alter column id set default gen_random_uuid()::text';
  end if;
end$$;
