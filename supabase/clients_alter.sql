-- ── Clients: klanttype + projectvelden ─────────────────────────────────────
-- Voer uit in Supabase SQL Editor (eenmalig).

alter table public.clients
  add column if not exists client_type text not null default 'recurring'
    check (client_type in ('recurring', 'project', 'oneoff'));

alter table public.clients
  add column if not exists project_budget numeric;

alter table public.clients
  add column if not exists project_deadline date;

-- Optioneel voor project/oneoff (recurring blijft verplicht in de app)
alter table public.clients alter column billing_cycle drop not null;
alter table public.clients alter column price_per_cycle drop not null;
