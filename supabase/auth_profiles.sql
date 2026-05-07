-- ============================================================
-- Auth profiles migration
-- Voer dit uit in Supabase > SQL Editor
-- ============================================================

-- 1. Profiles tabel
create table if not exists public.profiles (
  id            uuid        references auth.users on delete cascade primary key,
  email         text        not null,
  name          text,
  role          text        not null default 'default'
                            check (role in ('admin', 'default')),
  allowed_pages text[]      not null default array['content']::text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. RLS — gebruikers zien alleen hun eigen profiel
--    Admin-bewerkingen gaan via de service role key (bypassed RLS)
alter table public.profiles enable row level security;

create policy "Own profile read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Own profile update"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Trigger: maak automatisch een profiel aan bij signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 4. Eerste admin instellen
-- Pas het e-mailadres aan naar jouw eigen account en voer dit
-- uit nadat je jezelf via de app hebt aangemeld.
-- ============================================================

-- update public.profiles
-- set role = 'admin'
-- where email = 'jouw@emailadres.nl';
