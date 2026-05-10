-- Task comments table
create table if not exists task_comments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  author_id    uuid not null,
  author_email text not null,
  author_name  text,
  content      text not null,
  created_at   timestamptz default now()
);

create index if not exists task_comments_task_idx on task_comments (task_id, created_at);

-- RLS
alter table task_comments enable row level security;

create policy "Service role full access" on task_comments
  for all using (true) with check (true);
