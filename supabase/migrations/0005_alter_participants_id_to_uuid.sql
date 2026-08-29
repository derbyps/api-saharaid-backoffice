alter table public.participants
add column id_uuid uuid default gen_random_uuid();

update public.participants
set id_uuid = gen_random_uuid()
where id_uuid is null;

alter table public.participants
drop constraint participants_pkey;

alter table public.participants
drop column id;

alter table public.participants
rename column id_uuid to id;

alter table public.participants
alter column id set not null;

alter table public.participants
add primary key (id);

alter table public.participants
alter column id set default gen_random_uuid();
