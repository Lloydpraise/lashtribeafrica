-- 0018_course_categories.sql
-- Course categories for the Academy dashboard: Beginner, Advanced and Business development.
-- The admin sets one per course (Admin -> Courses -> open a course -> Category) and the student
-- dashboard groups the catalog under them.
--
-- Run after 0017 in the SQL editor; safe to re-run. Run it BEFORE deploying the new site code
-- (the site still works if it goes first, it just groups every course by its old level until this runs).
--
-- Existing courses are sorted once, on the first run, from their old "level": beginner stays
-- beginner, intermediate and advanced become advanced. Move any course (e.g. the Business Bootcamp)
-- to "Business development" afterwards in the admin. Re-running never overwrites those choices.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'courses' and column_name = 'category'
  ) then
    alter table public.courses add column category text not null default 'beginner';
    update public.courses set category = case when level = 'beginner' then 'beginner' else 'advanced' end;
  end if;
end $$;

alter table public.courses drop constraint if exists courses_category_check;
alter table public.courses
  add constraint courses_category_check check (category in ('beginner', 'advanced', 'business'));

-- admin_save_course() (from 0014) now saves the category too. Everything else is unchanged.
create or replace function public.admin_save_course(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  c jsonb := p -> 'course';
  cid uuid := (c ->> 'id')::uuid;
  m jsonb;
  l jsonb;
  mid uuid;
  lid uuid;
  mi integer := 0;
  li integer := 0;
  keep_modules uuid[] := '{}';
  keep_lessons uuid[] := '{}';
  free boolean := coalesce((c ->> 'is_free')::boolean, true);
begin
  insert into public.courses (
    id, slug, title, subtitle, description, level, course_type, is_free, price, compare_price,
    cover_url, hero_path, sequential, certificate_enabled, bonus_points, status, sort_order,
    duration_label, about, learn_points, category
  ) values (
    cid, c ->> 'slug', c ->> 'title', nullif(c ->> 'subtitle', ''), nullif(c ->> 'description', ''),
    coalesce(c ->> 'level', 'beginner'), coalesce(c ->> 'course_type', 'story'),
    free, case when free then 0 else coalesce((c ->> 'price')::numeric, 0) end,
    case when free then null else nullif(c ->> 'compare_price', '')::numeric end,
    nullif(c ->> 'cover_url', ''), nullif(c ->> 'hero_path', ''),
    coalesce((c ->> 'sequential')::boolean, false),
    coalesce((c ->> 'certificate_enabled')::boolean, true),
    coalesce((c ->> 'bonus_points')::integer, 0),
    coalesce(c ->> 'status', 'draft'), coalesce((c ->> 'sort_order')::integer, 0),
    coalesce(nullif(btrim(c ->> 'duration_label'), ''), '2 weeks'),
    nullif(btrim(coalesce(c ->> 'about', '')), ''),
    case when jsonb_typeof(c -> 'learn_points') = 'array'
         then array(select btrim(x) from jsonb_array_elements_text(c -> 'learn_points') x where btrim(x) <> '')
         else '{}'::text[] end,
    case when c ->> 'category' in ('beginner', 'advanced', 'business') then c ->> 'category' else 'beginner' end
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle,
    description = excluded.description, level = excluded.level, course_type = excluded.course_type,
    is_free = excluded.is_free, price = excluded.price, compare_price = excluded.compare_price,
    cover_url = excluded.cover_url, hero_path = excluded.hero_path, sequential = excluded.sequential,
    certificate_enabled = excluded.certificate_enabled, bonus_points = excluded.bonus_points,
    status = excluded.status, sort_order = excluded.sort_order,
    duration_label = excluded.duration_label, about = excluded.about, learn_points = excluded.learn_points,
    -- a save that doesn't mention a category (an older admin page) leaves the stored one alone
    category = case when c ? 'category' then excluded.category else public.courses.category end;

  for m in select * from jsonb_array_elements(coalesce(p -> 'modules', '[]'::jsonb)) loop
    mid := (m ->> 'id')::uuid;
    keep_modules := keep_modules || mid;
    insert into public.course_modules (id, course_id, title, sort_order)
    values (mid, cid, coalesce(nullif(m ->> 'title', ''), 'Untitled module'), mi)
    on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, sort_order = excluded.sort_order;
    mi := mi + 1;

    for l in select * from jsonb_array_elements(coalesce(m -> 'lessons', '[]'::jsonb)) loop
      li := li + 1;
      lid := (l ->> 'id')::uuid;
      keep_lessons := keep_lessons || lid;

      insert into public.lessons (
        id, course_id, module_id, title, kind, summary, duration_seconds, read_minutes, is_preview, sort_order, status
      ) values (
        lid, cid, mid, coalesce(nullif(l ->> 'title', ''), 'Untitled lesson'),
        coalesce(l ->> 'kind', 'reading'), nullif(l ->> 'summary', ''),
        coalesce((l ->> 'duration_seconds')::integer, 0), coalesce((l ->> 'read_minutes')::integer, 0),
        coalesce((l ->> 'is_preview')::boolean, false), li, coalesce(l ->> 'status', 'published')
      )
      on conflict (id) do update set
        course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title,
        kind = excluded.kind, summary = excluded.summary, duration_seconds = excluded.duration_seconds,
        read_minutes = excluded.read_minutes, is_preview = excluded.is_preview,
        sort_order = excluded.sort_order, status = excluded.status;

      insert into public.lesson_content (lesson_id, video, blocks)
      values (
        lid,
        case when l -> 'video' is null or jsonb_typeof(l -> 'video') = 'null' then null else l -> 'video' end,
        coalesce(l -> 'blocks', '[]'::jsonb)
      )
      on conflict (lesson_id) do update set video = excluded.video, blocks = excluded.blocks;
    end loop;
  end loop;

  delete from public.lessons where course_id = cid and not (id = any (keep_lessons));
  delete from public.course_modules where course_id = cid and not (id = any (keep_modules));

  return cid;
end;
$$;

revoke all on function public.admin_save_course(jsonb) from public;
revoke all on function public.admin_save_course(jsonb) from anon;
grant execute on function public.admin_save_course(jsonb) to authenticated;  -- signed-in admins only (see 0026)

