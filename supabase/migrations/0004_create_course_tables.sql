create table
  if not exists public.course_mode (
    id uuid primary key default gen_random_uuid (),
    name text not null
  );

create table
  if not exists public.course_theme (
    id uuid primary key default gen_random_uuid (),
    name text not null
  );

create table
  if not exists public.gallery (
    id uuid primary key default gen_random_uuid (),
    source_id uuid not null,
    name text not null,
    link text not null,
    type text not null
  );

create table
  if not exists public.course (
    id uuid primary key default gen_random_uuid (),
    type_id uuid not null references public.course_type (id),
    mode_id uuid not null references public.course_mode (id),
    course_theme_id uuid not null references public.course_theme (id),
    course_related_id uuid references public.course (id),
    name text not null,
    slug text not null,
    duration integer not null,
    certificate_validity text not null,
    overview text not null,
    objective text not null,
    outline text not null,
    requirement text not null,
    brochure text not null,
    is_fresh_graduate boolean not null default false,
    is_experienced boolean not null default false,
    is_student boolean not null default false
  );

create table
  if not exists public.instructor (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    phone_number text not null,
    email text not null,
    course_theme_id uuid not null references public.course_theme (id),
    specialization text not null
  );
