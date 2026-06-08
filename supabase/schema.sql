-- ProjectTrack profile sync schema.
-- Run in Supabase SQL Editor, then add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.

create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  project_data jsonb not null default '{"projects":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Users can delete own profile" on public.user_profiles;

create policy "Users can read own profile"
on public.user_profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own profile"
on public.user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own profile"
on public.user_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own profile"
on public.user_profiles for delete
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('engineering-files', 'engineering-files', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own engineering files" on storage.objects;
drop policy if exists "Users can upload own engineering files" on storage.objects;
drop policy if exists "Users can update own engineering files" on storage.objects;
drop policy if exists "Users can delete own engineering files" on storage.objects;

create policy "Users can read own engineering files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'engineering-files'
  and owner = auth.uid()
);

create policy "Users can upload own engineering files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'engineering-files'
  and owner = auth.uid()
);

create policy "Users can update own engineering files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'engineering-files'
  and owner = auth.uid()
)
with check (
  bucket_id = 'engineering-files'
  and owner = auth.uid()
);

create policy "Users can delete own engineering files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'engineering-files'
  and owner = auth.uid()
);
