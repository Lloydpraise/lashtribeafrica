-- 0015: paid courses stay locked until paid.
--
-- Problem: opening a FREE course creates an enrollment row (source 'free'). When that course was
-- later switched to paid, those rows kept granting access, so existing students walked straight in.
--
-- Model after this migration (one switch per student + course = a row in public.enrollments):
--   * free course            -> anyone signed in can open it
--   * paid course            -> only a student with a non-free enrollment (created by the payment
--                               confirmation flow, i.e. admin_set_order_status(... 'paid'), or by an admin)
--   * flipping a course free -> paid automatically removes its 'free' enrollments (trigger below)
-- has_course_access() is still ONE indexed lookup per open, and also ignores stale free rows.
-- Run after 0014; safe to re-run.

create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.courses c
      where c.id = p_course_id and c.status = 'published' and c.is_free
    )
    or exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.course_id = p_course_id and e.user_id = auth.uid()
        and (e.source <> 'free' or c.is_free)
    )
    or public.is_academy_admin()
  );
$$;

-- Switching a course from free to paid ends the free access everywhere, immediately.
create or replace function public._courses_end_free_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_free and not new.is_free then
    delete from public.enrollments where course_id = new.id and source = 'free';
  end if;
  return new;
end;
$$;
drop trigger if exists courses_end_free_access on public.courses;
create trigger courses_end_free_access
  after update of is_free on public.courses
  for each row execute function public._courses_end_free_access();

-- One-off clean-up for courses that were already switched to paid.
delete from public.enrollments e
using public.courses c
where c.id = e.course_id and not c.is_free and e.source = 'free';

-- A paid order must replace any old enrollment row (it used to "do nothing" on conflict).
create or replace function public._grant_order_enrollments(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid; v_no text;
begin
  select c.user_id, o.order_no into v_user, v_no
  from public.orders o join public.customers c on c.id = o.customer_id where o.id = p_order;
  if v_user is null then
    raise warning 'order % has course items but the customer has no login yet', p_order;
    return;
  end if;

  insert into public.enrollments (user_id, course_id, source, order_ref, order_id)
  select v_user, x.course_id, 'purchase', v_no, p_order
  from (
    select oi.course_id from public.order_items oi
     where oi.order_id = p_order and oi.item_type = 'course' and oi.course_id is not null
    union
    select bi.course_id from public.order_items oi
      join public.course_bundle_items bi on bi.bundle_id = oi.bundle_id
     where oi.order_id = p_order and oi.item_type = 'bundle'
  ) x
  on conflict (user_id, course_id) do update
    set source = 'purchase', order_ref = excluded.order_ref, order_id = excluded.order_id;
end;
$$;
revoke all on function public._grant_order_enrollments(uuid) from public, anon, authenticated;

-- Manual switch for admins (e.g. paid by bank transfer, a gift, or taking access away).
create or replace function public.admin_set_course_access(p_user uuid, p_course uuid, p_grant boolean, p_source text default 'admin')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_academy_admin() and auth.role() <> 'service_role' then
    raise exception 'Not allowed';
  end if;
  if p_grant then
    insert into public.enrollments (user_id, course_id, source)
    values (p_user, p_course, case when p_source in ('purchase', 'gift', 'admin') then p_source else 'admin' end)
    on conflict (user_id, course_id) do update set source = excluded.source;
  else
    delete from public.enrollments where user_id = p_user and course_id = p_course;
  end if;
end;
$$;
revoke all on function public.admin_set_course_access(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_course_access(uuid, uuid, boolean, text) to authenticated;

-- "My courses" must not list stale free enrolments of courses that are now paid.
create or replace view public.customer_course_progress with (security_invoker = true) as
select
  c.id as customer_id,
  e.user_id,
  e.course_id,
  co.slug as course_slug,
  co.title as course_title,
  co.cover_url,
  e.source,
  e.created_at as enrolled_at,
  (select count(*) from public.lessons l where l.course_id = e.course_id and l.status = 'published') as total_lessons,
  (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = e.user_id and lp.course_id = e.course_id and lp.completed and l.status = 'published') as completed_lessons,
  (select max(lp.updated_at) from public.lesson_progress lp
    where lp.user_id = e.user_id and lp.course_id = e.course_id) as last_activity_at,
  cert.id as certificate_id,
  cert.certificate_no,
  cert.verify_code,
  cert.issued_at as certificate_issued_at
from public.enrollments e
join public.customers c on c.user_id = e.user_id
join public.courses co on co.id = e.course_id
left join public.course_certificates cert on cert.user_id = e.user_id and cert.course_id = e.course_id
where e.source <> 'free' or co.is_free;

grant select on public.customer_course_progress to authenticated;
