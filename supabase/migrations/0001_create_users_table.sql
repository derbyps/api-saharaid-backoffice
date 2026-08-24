create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  salt text not null,
  created_at timestamptz not null default now()
);
