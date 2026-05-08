create table if not exists public.post_logs (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  action text not null check (action in ('created', 'status_changed', 'updated', 'deleted')),
  actor_email text,
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_logs_post_id_created_at
on public.post_logs(post_id, created_at desc);

alter table public.post_logs enable row level security;

drop policy if exists "post_logs authenticated read" on public.post_logs;
create policy "post_logs authenticated read"
on public.post_logs
for select
to authenticated
using (true);

drop policy if exists "post_logs authenticated write" on public.post_logs;
create policy "post_logs authenticated write"
on public.post_logs
for insert
to authenticated
with check (true);
