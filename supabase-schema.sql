-- Run this script in Supabase SQL Editor.
-- It creates tables and row-level security policies for per-user data isolation.

create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  performed_at timestamptz not null default now(),
  sets_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;

drop policy if exists "Users can read own exercises" on public.exercises;
create policy "Users can read own exercises"
on public.exercises
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own exercises" on public.exercises;
create policy "Users can insert own exercises"
on public.exercises
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exercises" on public.exercises;
create policy "Users can delete own exercises"
on public.exercises
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own sessions" on public.workout_sessions;
create policy "Users can read own sessions"
on public.workout_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sessions" on public.workout_sessions;
create policy "Users can insert own sessions"
on public.workout_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on public.workout_sessions;
create policy "Users can delete own sessions"
on public.workout_sessions
for delete
using (auth.uid() = user_id);
