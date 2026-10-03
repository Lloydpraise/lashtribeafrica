-- 0009_courses_anon_admin.sql
-- Temporarily let the static admin client manage courses with the public anon key,
-- matching the product admin flow. This is not authentication: anyone with the anon
-- key can read, create, update, and delete course content and media. That includes paid
-- lesson content. Replace with authenticated admin policies before treating paid content
-- as private.
--
-- Run AFTER 0008_admin_courses.sql.

-- The admin editor must be able to read drafts and full lesson bodies. This makes all
-- course catalog and lesson content publicly readable through the anon key.
drop policy if exists "courses_public_read" on public.courses;
drop policy if exists "courses_anon_read" on public.courses;
create policy "courses_anon_read" on public.courses
  for select to anon, authenticated using (true);

drop policy if exists "modules_public_read" on public.course_modules;
drop policy if exists "modules_anon_read" on public.course_modules;
create policy "modules_anon_read" on public.course_modules
  for select to anon, authenticated using (true);

drop policy if exists "lessons_public_read" on public.lessons;
drop policy if exists "lessons_anon_read" on public.lessons;
create policy "lessons_anon_read" on public.lessons
  for select to anon, authenticated using (true);

drop policy if exists "lesson_content_entitled_read" on public.lesson_content;
drop policy if exists "lesson_content_anon_read" on public.lesson_content;
create policy "lesson_content_anon_read" on public.lesson_content
  for select to anon, authenticated using (true);

drop policy if exists "bundles_public_read" on public.course_bundles;
drop policy if exists "bundles_anon_read" on public.course_bundles;
create policy "bundles_anon_read" on public.course_bundles
  for select to anon, authenticated using (true);

drop policy if exists "bundle_items_public_read" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_read" on public.course_bundle_items;
create policy "bundle_items_anon_read" on public.course_bundle_items
  for select to anon, authenticated using (true);

drop policy if exists "courses_admin_write" on public.courses;
drop policy if exists "courses_anon_insert" on public.courses;
drop policy if exists "courses_anon_update" on public.courses;
drop policy if exists "courses_anon_delete" on public.courses;
create policy "courses_anon_insert" on public.courses
  for insert to anon, authenticated with check (true);
create policy "courses_anon_update" on public.courses
  for update to anon, authenticated using (true) with check (true);
create policy "courses_anon_delete" on public.courses
  for delete to anon, authenticated using (true);

drop policy if exists "modules_admin_write" on public.course_modules;
drop policy if exists "modules_anon_insert" on public.course_modules;
drop policy if exists "modules_anon_update" on public.course_modules;
drop policy if exists "modules_anon_delete" on public.course_modules;
create policy "modules_anon_insert" on public.course_modules
  for insert to anon, authenticated with check (true);
create policy "modules_anon_update" on public.course_modules
  for update to anon, authenticated using (true) with check (true);
create policy "modules_anon_delete" on public.course_modules
  for delete to anon, authenticated using (true);

drop policy if exists "lessons_admin_write" on public.lessons;
drop policy if exists "lessons_anon_insert" on public.lessons;
drop policy if exists "lessons_anon_update" on public.lessons;
drop policy if exists "lessons_anon_delete" on public.lessons;
create policy "lessons_anon_insert" on public.lessons
  for insert to anon, authenticated with check (true);
create policy "lessons_anon_update" on public.lessons
  for update to anon, authenticated using (true) with check (true);
create policy "lessons_anon_delete" on public.lessons
  for delete to anon, authenticated using (true);

drop policy if exists "lesson_content_admin_write" on public.lesson_content;
drop policy if exists "lesson_content_anon_insert" on public.lesson_content;
drop policy if exists "lesson_content_anon_update" on public.lesson_content;
drop policy if exists "lesson_content_anon_delete" on public.lesson_content;
create policy "lesson_content_anon_insert" on public.lesson_content
  for insert to anon, authenticated with check (true);
create policy "lesson_content_anon_update" on public.lesson_content
  for update to anon, authenticated using (true) with check (true);
create policy "lesson_content_anon_delete" on public.lesson_content
  for delete to anon, authenticated using (true);

drop policy if exists "bundles_admin_write" on public.course_bundles;
drop policy if exists "bundles_anon_insert" on public.course_bundles;
drop policy if exists "bundles_anon_update" on public.course_bundles;
drop policy if exists "bundles_anon_delete" on public.course_bundles;
create policy "bundles_anon_insert" on public.course_bundles
  for insert to anon, authenticated with check (true);
create policy "bundles_anon_update" on public.course_bundles
  for update to anon, authenticated using (true) with check (true);
create policy "bundles_anon_delete" on public.course_bundles
  for delete to anon, authenticated using (true);

drop policy if exists "bundle_items_admin_write" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_insert" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_update" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_delete" on public.course_bundle_items;
create policy "bundle_items_anon_insert" on public.course_bundle_items
  for insert to anon, authenticated with check (true);
create policy "bundle_items_anon_update" on public.course_bundle_items
  for update to anon, authenticated using (true) with check (true);
create policy "bundle_items_anon_delete" on public.course_bundle_items
  for delete to anon, authenticated using (true);

-- Browser uploads, replacements, and removals use the same public-key model as product media.
drop policy if exists "course_media_admin_insert" on storage.objects;
drop policy if exists "course_media_admin_update" on storage.objects;
drop policy if exists "course_media_admin_delete" on storage.objects;
drop policy if exists "course_media_anon_insert" on storage.objects;
drop policy if exists "course_media_anon_update" on storage.objects;
drop policy if exists "course_media_anon_delete" on storage.objects;
create policy "course_media_anon_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'course-media');
create policy "course_media_anon_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'course-media')
  with check (bucket_id = 'course-media');
create policy "course_media_anon_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'course-media');

-- These transactional routines perform writes under the caller's role and are constrained
-- by the command-specific RLS policies above. Remove their academy-admin-only checks.
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
    cover_url, hero_path, sequential, certificate_enabled, bonus_points, status, sort_order
  ) values (
    cid, c ->> 'slug', c ->> 'title', nullif(c ->> 'subtitle', ''), nullif(c ->> 'description', ''),
    coalesce(c ->> 'level', 'beginner'), coalesce(c ->> 'course_type', 'story'),
    free, case when free then 0 else coalesce((c ->> 'price')::numeric, 0) end,
    case when free then null else nullif(c ->> 'compare_price', '')::numeric end,
    nullif(c ->> 'cover_url', ''), nullif(c ->> 'hero_path', ''),
    coalesce((c ->> 'sequential')::boolean, false),
    coalesce((c ->> 'certificate_enabled')::boolean, true),
    coalesce((c ->> 'bonus_points')::integer, 0),
    coalesce(c ->> 'status', 'draft'), coalesce((c ->> 'sort_order')::integer, 0)
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle,
    description = excluded.description, level = excluded.level, course_type = excluded.course_type,
    is_free = excluded.is_free, price = excluded.price, compare_price = excluded.compare_price,
    cover_url = excluded.cover_url, hero_path = excluded.hero_path, sequential = excluded.sequential,
    certificate_enabled = excluded.certificate_enabled, bonus_points = excluded.bonus_points,
    status = excluded.status, sort_order = excluded.sort_order;

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
grant execute on function public.admin_save_course(jsonb) to anon, authenticated;

create or replace function public.admin_save_bundle(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  b jsonb := p -> 'bundle';
  bid uuid := (b ->> 'id')::uuid;
  cids uuid[];
begin
  insert into public.course_bundles (id, slug, title, description, price, compare_price, cover_url, cover_path, status, sort_order)
  values (
    bid, b ->> 'slug', b ->> 'title', nullif(b ->> 'description', ''),
    coalesce((b ->> 'price')::numeric, 0), nullif(b ->> 'compare_price', '')::numeric,
    nullif(b ->> 'cover_url', ''), nullif(b ->> 'cover_path', ''),
    coalesce(b ->> 'status', 'draft'), coalesce((b ->> 'sort_order')::integer, 0)
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, description = excluded.description,
    price = excluded.price, compare_price = excluded.compare_price, cover_url = excluded.cover_url,
    cover_path = excluded.cover_path, status = excluded.status, sort_order = excluded.sort_order;

  select coalesce(array_agg(x::uuid), '{}') into cids
  from jsonb_array_elements_text(coalesce(p -> 'course_ids', '[]'::jsonb)) as t(x);

  delete from public.course_bundle_items where bundle_id = bid;
  insert into public.course_bundle_items (bundle_id, course_id, sort_order)
  select bid, cid, ord - 1
  from unnest(cids) with ordinality as u(cid, ord)
  on conflict do nothing;

  return bid;
end;
$$;

revoke all on function public.admin_save_bundle(jsonb) from public;
grant execute on function public.admin_save_bundle(jsonb) to anon, authenticated;
