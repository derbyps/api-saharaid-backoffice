create table if not exists public.course_mode (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.course_gallery (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  link text not null
);

create table if not exists public.course (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  type_id uuid not null references public.course_type (id),
  duration integer not null,
  mode_id uuid not null references public.course_mode (id),
  certificate_validity text not null,
  theme text not null,
  overview text not null,
  objective text not null,
  outline text not null,
  requirement text not null,
  gallery_id uuid references public.course_gallery (id),
  course_related_id uuid references public.course (id),
  brochure text not null,
  is_fresh_graduate boolean not null default false,
  is_experienced boolean not null default false,
  is_student boolean not null default false
);
