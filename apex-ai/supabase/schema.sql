-- ============================================================
--  APEX Executive Assistant — Supabase Database Schema
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";       -- for scheduled jobs

-- ── USERS ─────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  timezone      text not null default 'UTC',
  avatar_url    text,
  preferences   jsonb not null default '{
    "work_start": "08:00",
    "work_end": "18:00",
    "peak_energy_hours": ["09:00","10:00","11:00"],
    "break_duration_minutes": 10,
    "focus_block_minutes": 90,
    "notification_enabled": true,
    "notification_channels": ["browser"],
    "google_calendar_connected": false,
    "theme": "dark",
    "ai_personality": "professional",
    "weekly_goal_hours": 40
  }'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users: own row only" on public.users
  for all using (auth.uid() = id);

-- ── TASKS ─────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users(id) on delete cascade,
  title               text not null,
  description         text,
  category            text not null default 'other'
                        check (category in ('deep_work','meetings','admin','communications',
                                            'planning','errands','health','finance','personal','other')),
  priority            text not null default 'medium'
                        check (priority in ('critical','high','medium','low')),
  priority_score      integer not null default 50 check (priority_score between 0 and 100),
  estimated_minutes   integer not null default 30 check (estimated_minutes > 0),
  actual_minutes      integer check (actual_minutes >= 0),
  due_date            date,
  scheduled_start     timestamptz,
  status              text not null default 'pending'
                        check (status in ('pending','in_progress','completed','deferred','cancelled')),
  recurring           boolean not null default false,
  recurrence_rule     text,         -- 'daily' | 'weekly:mon,wed' | 'monthly:1'
  energy_required     text not null default 'medium'
                        check (energy_required in ('high','medium','low')),
  tags                text[]  not null default '{}',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_tasks_user_id       on public.tasks (user_id);
create index idx_tasks_status        on public.tasks (status);
create index idx_tasks_due_date      on public.tasks (due_date);
create index idx_tasks_priority_score on public.tasks (priority_score desc);
create index idx_tasks_updated_at    on public.tasks (updated_at desc);

alter table public.tasks enable row level security;

create policy "Tasks: own rows only" on public.tasks
  for all using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute procedure public.touch_updated_at();

-- ── SCHEDULES ─────────────────────────────────────────────────────────────
create table if not exists public.schedules (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.users(id) on delete cascade,
  date                  date not null,
  generated_plan_json   jsonb not null default '[]'::jsonb,
  work_start            text not null default '08:00',
  work_end              text not null default '18:00',
  total_focus_minutes   integer not null default 0,
  overload_warning      boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (user_id, date)
);

create index idx_schedules_user_date on public.schedules (user_id, date desc);

alter table public.schedules enable row level security;

create policy "Schedules: own rows only" on public.schedules
  for all using (auth.uid() = user_id);

-- ── PRODUCTIVITY LOGS ─────────────────────────────────────────────────────
create table if not exists public.productivity_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  task_id         uuid references public.tasks(id) on delete set null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  focus_score     smallint check (focus_score between 0 and 10),
  interruptions   smallint not null default 0,
  actual_energy   text check (actual_energy in ('high','medium','low')),
  notes           text
);

create index idx_logs_user_id  on public.productivity_logs (user_id);
create index idx_logs_task_id  on public.productivity_logs (task_id);
create index idx_logs_started  on public.productivity_logs (started_at desc);

alter table public.productivity_logs enable row level security;

create policy "Logs: own rows only" on public.productivity_logs
  for all using (auth.uid() = user_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null,
  task_id     uuid references public.tasks(id) on delete set null,
  sent_at     timestamptz not null default now(),
  opened      boolean not null default false,
  action_url  text
);

create index idx_notifs_user_id on public.notifications (user_id);
create index idx_notifs_sent_at on public.notifications (sent_at desc);

alter table public.notifications enable row level security;

create policy "Notifications: own rows only" on public.notifications
  for all using (auth.uid() = user_id);

-- ── REALTIME SUBSCRIPTIONS ────────────────────────────────────────────────
-- Enable realtime for tasks and notifications
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notifications;

-- ── USEFUL VIEWS ─────────────────────────────────────────────────────────
create or replace view public.today_tasks as
  select t.*
  from   public.tasks t
  where  t.status not in ('cancelled', 'completed')
    and  (
      t.due_date = current_date
      or date(t.scheduled_start) = current_date
      or t.status = 'in_progress'
    );

create or replace view public.overdue_tasks as
  select t.*
  from   public.tasks t
  where  t.status not in ('cancelled', 'completed')
    and  t.due_date < current_date;

-- ── SEED: Default categories reference (informational) ───────────────────
comment on column public.tasks.category is
  'Values: deep_work | meetings | admin | communications | planning | errands | health | finance | personal | other';

comment on column public.tasks.recurrence_rule is
  'Format: "daily" | "weekly:mon,tue,wed" | "monthly:1" (day of month)';

-- ============================================================
--  Done. Go build something dangerous with time.
-- ============================================================
