-- ── Snelle routes (reiskosten templates) per gebruiker ─────────────────────────
-- Voer uit in de Supabase SQL Editor.

create table if not exists public.travel_route_presets (
  id              text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  label           text not null,
  from_location   text not null,
  to_location     text not null,
  kilometers      numeric not null,
  return_trip     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists travel_route_presets_user_id_idx
  on public.travel_route_presets (user_id);

alter table public.travel_route_presets enable row level security;

create policy "travel_route_presets_select_own"
  on public.travel_route_presets for select
  to authenticated
  using (user_id = auth.uid());

create policy "travel_route_presets_insert_own"
  on public.travel_route_presets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "travel_route_presets_update_own"
  on public.travel_route_presets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "travel_route_presets_delete_own"
  on public.travel_route_presets for delete
  to authenticated
  using (user_id = auth.uid());
