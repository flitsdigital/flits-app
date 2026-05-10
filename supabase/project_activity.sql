-- Project activity feed table
create table if not exists project_activity (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  task_id     uuid,
  actor_email text not null,
  action      text not null,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index if not exists project_activity_project_idx on project_activity (project_id, created_at desc);

-- RLS
alter table project_activity enable row level security;

create policy "Service role full access" on project_activity
  for all using (true) with check (true);
