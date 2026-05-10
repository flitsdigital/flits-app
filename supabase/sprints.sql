-- Sprints table
create table if not exists sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  start_date  date,
  end_date    date,
  status      text not null default 'planned' check (status in ('planned', 'active', 'closed')),
  created_at  timestamptz default now()
);

create index if not exists sprints_project_idx on sprints (project_id, status);

-- Add sprint_id to tasks
alter table tasks add column if not exists sprint_id uuid references sprints(id) on delete set null;

-- RLS
alter table sprints enable row level security;

create policy "Service role full access" on sprints
  for all using (true) with check (true);
