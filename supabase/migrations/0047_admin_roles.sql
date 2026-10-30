-- 0047_admin_roles.sql
-- Lets an admin make another account an admin (or remove one) from Admin -> Customers.
-- Run after 0026. Safe to re-run.
--
-- Who is an admin is still decided by public.academy_admins (is_academy_admin()). This migration:
--   * locks academy_admins so nobody can add, change or remove a row through the API directly
--     (no table privileges for anon/authenticated, and RLS keeps only the admin read policy),
--   * adds set_user_admin(p_user, p_make_admin): the ONLY way to change admins from the app.
--     It runs inside the database and refuses unless the caller is already an admin,
--     and it refuses to remove the last admin.
--   * records who granted each admin (granted_by) for the audit trail.
--
-- The SQL editor still works as before (it runs as postgres), e.g. for the very first admin:
--   insert into public.academy_admins (user_id)
--   select id from auth.users where lower(email) = lower('you@example.com')
--   on conflict do nothing;

alter table public.academy_admins
  add column if not exists granted_by uuid references auth.users(id) on delete set null;

-- 1. No direct writes through the API, by anyone. Reads stay admin-only (policy from 0026).
alter table public.academy_admins enable row level security;
revoke all on public.academy_admins from anon, authenticated;
grant select on public.academy_admins to authenticated;

drop policy if exists "academy_admins_read" on public.academy_admins;
create policy "academy_admins_read" on public.academy_admins
  for select to authenticated using (public.is_academy_admin());

-- Belt and braces: even if a write policy or grant is added by mistake later, a write made as an
-- API role (anon / authenticated) is rejected. set_user_admin below is SECURITY DEFINER, so its
-- writes run as the function owner and pass; so does the SQL editor (postgres).
-- (This guard is deliberately NOT security definer: it must see the real current_user.)
create or replace function public.academy_admins_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'Admins can only be changed with set_user_admin()' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists academy_admins_guard on public.academy_admins;
create trigger academy_admins_guard
  before insert or update or delete on public.academy_admins
  for each row execute function public.academy_admins_guard();

-- 2. The admin switch. Checked in the database: the caller must be an admin.
create or replace function public.set_user_admin(p_user uuid, p_make_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_caller is null or not exists (select 1 from public.academy_admins where user_id = v_caller) then
    raise exception 'Only an admin can change who is an admin' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'That account does not exist';
  end if;

  -- one change at a time, so two admins can't remove each other at the same moment
  lock table public.academy_admins in share row exclusive mode;

  -- re-check after the lock: the caller may have just been removed
  if not exists (select 1 from public.academy_admins where user_id = v_caller) then
    raise exception 'Only an admin can change who is an admin' using errcode = '42501';
  end if;

  if p_make_admin then
    insert into public.academy_admins (user_id, granted_by)
    values (p_user, v_caller)
    on conflict (user_id) do nothing;
  else
    v_is_admin := exists (select 1 from public.academy_admins where user_id = p_user);
    if v_is_admin and (select count(*) from public.academy_admins) <= 1 then
      raise exception 'You can''t remove the last admin. Make someone else an admin first.';
    end if;
    delete from public.academy_admins where user_id = p_user;
  end if;

  return p_make_admin;
end;
$$;

revoke all on function public.set_user_admin(uuid, boolean) from public, anon;
grant execute on function public.set_user_admin(uuid, boolean) to authenticated;
