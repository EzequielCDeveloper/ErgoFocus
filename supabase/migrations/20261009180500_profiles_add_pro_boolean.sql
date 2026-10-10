-- Migration: add `pro` boolean column to public.profiles and sync with `role`
alter table public.profiles
  add column if not exists pro boolean not null default false;

-- Synchronize existing rows
update public.profiles
  set pro = (role = 'pro')
  where pro is distinct from (role = 'pro');

-- Function to keep `role` and `pro` in lockstep
create or replace function public.sync_profile_pro_role()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.pro is true and (new.role is null or new.role = 'free') then
    new.role := 'pro';
  elsif new.role = 'pro' and (new.pro is null or new.pro is false) then
    new.pro := true;
  elsif new.pro is false and new.role = 'pro' then
    new.role := 'free';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_pro_role_sync on public.profiles;
create trigger on_profile_pro_role_sync
  before insert or update on public.profiles
  for each row execute function public.sync_profile_pro_role();
