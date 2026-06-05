-- Future cloud schema for ProjectTrack.
-- Run this only when you are ready to move from local browser storage to Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  stage text not null default 'Planning',
  status text not null default 'On Track',
  progress integer not null default 0 check (progress between 0 and 100),
  start_date date,
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  owner text,
  due_date date,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  file_type text,
  note text,
  uploaded_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_files enable row level security;

-- Demo-only public policies. Replace with auth.uid() ownership policies for private production use.
create policy "Demo read projects" on public.projects for select to anon using (true);
create policy "Demo insert projects" on public.projects for insert to anon with check (true);
create policy "Demo update projects" on public.projects for update to anon using (true) with check (true);
create policy "Demo delete projects" on public.projects for delete to anon using (true);

create policy "Demo read project tasks" on public.project_tasks for select to anon using (true);
create policy "Demo insert project tasks" on public.project_tasks for insert to anon with check (true);
create policy "Demo update project tasks" on public.project_tasks for update to anon using (true) with check (true);
create policy "Demo delete project tasks" on public.project_tasks for delete to anon using (true);

create policy "Demo read project files" on public.project_files for select to anon using (true);
create policy "Demo insert project files" on public.project_files for insert to anon with check (true);
create policy "Demo delete project files" on public.project_files for delete to anon using (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.projects to anon;
grant select, insert, update, delete on public.project_tasks to anon;
grant select, insert, delete on public.project_files to anon;
