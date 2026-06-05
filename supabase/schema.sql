create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 120),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "Public demo read tasks" on public.tasks;
drop policy if exists "Public demo insert tasks" on public.tasks;
drop policy if exists "Public demo update tasks" on public.tasks;
drop policy if exists "Public demo delete tasks" on public.tasks;

create policy "Public demo read tasks"
on public.tasks for select
to anon
using (true);

create policy "Public demo insert tasks"
on public.tasks for insert
to anon
with check (true);

create policy "Public demo update tasks"
on public.tasks for update
to anon
using (true)
with check (true);

create policy "Public demo delete tasks"
on public.tasks for delete
to anon
using (true);

grant usage on schema public to anon;
grant select, insert, update, delete on public.tasks to anon;
