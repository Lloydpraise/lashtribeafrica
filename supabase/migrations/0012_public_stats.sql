-- Public headline numbers for the academy footer (read-only, no personal data).
-- Optional: without it the footer still shows the live course count, just not "students taught".

create or replace function public.academy_public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'courses',  (select count(*) from public.courses where status = 'published'),
    'students', (select count(distinct user_id) from public.enrollments)
  );
$$;

revoke all on function public.academy_public_stats() from public;
grant execute on function public.academy_public_stats() to anon, authenticated;
