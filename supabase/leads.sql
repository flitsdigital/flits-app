-- ── Leads ─────────────────────────────────────────────────────────────────────
-- Voer dit script uit in de Supabase SQL Editor (dashboard.supabase.com).
-- Maak daarna ook de RLS-policies aan zoals hieronder beschreven.

create table if not exists leads (
  id                text        primary key,
  company_name      text        not null,
  contact_person    text        not null,
  email             text,
  phone             text,
  source            text,
  status            text        not null default 'new',
  assignee_id       uuid        references auth.users(id) on delete set null,
  estimated_value   numeric,
  notes             text,
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Contact moments ───────────────────────────────────────────────────────────

create table if not exists contact_moments (
  id          text        primary key,
  lead_id     text        not null references leads(id) on delete cascade,
  date        date        not null,
  type        text        not null,
  note        text        not null,
  actor_id    uuid,
  actor_email text,
  created_at  timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Pas aan naar jouw eigen RLS-strategie. Onderstaand is een simpel voorbeeld
-- waarbij alle ingelogde gebruikers kunnen lezen en schrijven.

alter table leads         enable row level security;
alter table contact_moments enable row level security;

-- Alle authenticated users mogen alles op leads
create policy "auth users can manage leads"
  on leads for all
  to authenticated
  using (true)
  with check (true);

-- Alle authenticated users mogen alles op contact_moments
create policy "auth users can manage contact_moments"
  on contact_moments for all
  to authenticated
  using (true)
  with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists leads_status_idx        on leads (status);
create index if not exists leads_created_at_idx    on leads (created_at desc);
create index if not exists contact_moments_lead_idx on contact_moments (lead_id);
create index if not exists contact_moments_date_idx on contact_moments (date desc);
