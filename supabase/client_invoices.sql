-- ── Client invoices (milestones / eenmalig) ─────────────────────────────────
-- Voer uit in Supabase SQL Editor na clients_alter.sql

create table if not exists public.client_invoices (
  id              text        primary key,
  client_id       text        not null references public.clients(id) on delete cascade,
  label           text        not null,
  amount          numeric     not null default 0,
  percentage      numeric,
  due_date        date        not null,
  status          text        not null default 'planned'
                  check (status in ('planned', 'sent', 'paid', 'overdue')),
  invoice_number  text,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists client_invoices_client_id_idx
  on public.client_invoices (client_id);

create index if not exists client_invoices_due_date_idx
  on public.client_invoices (due_date);

alter table public.client_invoices enable row level security;

create policy "auth users can manage client_invoices"
  on public.client_invoices for all
  to authenticated
  using (true)
  with check (true);
