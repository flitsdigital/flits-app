-- Todos table
create table if not exists todos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  done          boolean not null default false,
  due_date      date,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  assignee_id   uuid references auth.users(id) on delete set null,
  linked_type   text check (linked_type in ('client', 'post', 'lead')),
  linked_id     text,
  linked_label  text,
  notes         text,
  position      int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists todos_owner_idx on todos (owner_id, done, due_date);

-- RLS
alter table todos enable row level security;

-- Service role has full access (used by supabaseAdmin in the app)
create policy "Service role full access" on todos
  for all using (true) with check (true);
