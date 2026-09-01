create table if not exists public.schedule (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course (id),
  start_date date not null,
  end_date date not null,
  location text not null,
  course_mode_id uuid not null references public.course_mode (id),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.users (id),
  updated_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.users (id),
  constraint schedule_date_range_check check (end_date >= start_date)
);
