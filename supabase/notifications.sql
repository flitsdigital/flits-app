-- Notifications table
create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  actor_email   text not null,
  type          text not null default 'mention',
  content       text not null,
  linked_type   text,
  linked_id     text,
  context_url   text,
  read          boolean not null default false,
  created_at    timestamptz default now()
);

create index if not exists notifications_user_idx on notifications (user_id, read, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy "Service role full access" on notifications
  for all using (true) with check (true);
