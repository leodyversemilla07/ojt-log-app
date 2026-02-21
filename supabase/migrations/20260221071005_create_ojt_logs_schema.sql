create extension if not exists pgcrypto;

create table if not exists public.ojt_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  week_number integer not null check (week_number >= 1),
  day_number integer not null check (day_number >= 1),
  time_in time not null,
  time_out time not null,
  total_hours numeric(5,2) not null check (total_hours >= 0),
  tasks_accomplished text[] not null default '{}',
  key_learnings text[] not null default '{}',
  challenges text not null default '',
  goals_for_tomorrow text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ojt_logs_user_id_idx
  on public.ojt_logs (user_id);

create index if not exists ojt_logs_user_id_date_idx
  on public.ojt_logs (user_id, date desc);

alter table public.ojt_logs enable row level security;

drop policy if exists "Users can view own logs" on public.ojt_logs;
create policy "Users can view own logs"
  on public.ojt_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own logs" on public.ojt_logs;
create policy "Users can insert own logs"
  on public.ojt_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own logs" on public.ojt_logs;
create policy "Users can update own logs"
  on public.ojt_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own logs" on public.ojt_logs;
create policy "Users can delete own logs"
  on public.ojt_logs
  for delete
  using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_ojt_logs_updated_at on public.ojt_logs;
create trigger set_ojt_logs_updated_at
before update on public.ojt_logs
for each row
execute function public.handle_updated_at();
