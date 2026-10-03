-- 0008_admin_courses.sql
-- Admin course builder: course type, pricing extras, hero image, course bundles,
-- the `course-media` storage bucket, and two transactional save functions.
--
-- Run AFTER 0005 (needs courses, lessons, academy_admins, is_academy_admin()).
-- Safe to re-run.
--
-- Initial access model: writes here are academy-admin-only. Migration 0009 replaces
-- these policies and RPC checks with public anon-key access for the temporary static admin:
--
--   insert into public.academy_admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
--
-- The block above is only needed before migration 0009 is applied.

-- ---------------------------------------------------------------------
-- 1. courses: type, compare-at price, hero image path
-- ---------------------------------------------------------------------
alter table public.courses
  add column if not exists course_type text not null default 'story',
  add column if not exists compare_price numeric(10,2),
  add column if not exists hero_path text;      -- storage path of cover_url (so it can be replaced/removed)

alter table public.courses drop constraint if exists courses_course_type_check;
alter table public.courses
  add constraint courses_course_type_check check (course_type in ('video', 'story'));

-- cover_url (from 0005) is the course hero image. Existing courses that contain video lessons are video courses.
update public.courses c
set course_type = 'video'
where course_type = 'story'
  and exists (select 1 from public.lessons l where l.course_id = c.id and l.kind = 'video');

-- ---------------------------------------------------------------------
-- 2. bundles: several courses sold together at one price
-- ---------------------------------------------------------------------
create table if not exists public.course_bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  price numeric(10,2) not null default 0,
  compare_price numeric(10,2),                  -- optional "was" price shown struck through
  cover_url text,
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists course_bundles_set_updated_at on public.course_bundles;
create trigger course_bundles_set_updated_at
  before update on public.course_bundles
  for each row execute function public.set_updated_at();

create table if not exists public.course_bundle_items (
  bundle_id uuid not null references public.course_bundles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (bundle_id, course_id)
);
create index if not exists course_bundle_items_course_idx on public.course_bundle_items(course_id);

alter table public.course_bundles      enable row level security;
alter table public.course_bundle_items enable row level security;

drop policy if exists "bundles_public_read" on public.course_bundles;
create policy "bundles_public_read" on public.course_bundles
  for select to anon, authenticated
  using (status = 'published' or public.is_academy_admin());
drop policy if exists "bundles_admin_write" on public.course_bundles;
create policy "bundles_admin_write" on public.course_bundles
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "bundle_items_public_read" on public.course_bundle_items;
create policy "bundle_items_public_read" on public.course_bundle_items
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or exists (select 1 from public.course_bundles b where b.id = bundle_id and b.status = 'published')
  );
drop policy if exists "bundle_items_admin_write" on public.course_bundle_items;
create policy "bundle_items_admin_write" on public.course_bundle_items
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- A bundle purchase enrols the buyer in each course; allow 'bundle' as an enrolment source.
alter table public.enrollments drop constraint if exists enrollments_source_check;
alter table public.enrollments
  add constraint enrollments_source_check check (source in ('purchase', 'free', 'gift', 'admin', 'bundle'));

-- ---------------------------------------------------------------------
-- 3. storage: course-media bucket (hero images, story figures, short videos)
--    Initial policy: public read and admin-only write. Migration 0009 opens writes to anon.
--    Limit: 50 MB per file (Supabase's free-plan ceiling). Raise it in Dashboard > Storage
--    settings first if your plan allows more, then change file_size_limit below.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media', 'course-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
        'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_media_public_read" on storage.objects;
create policy "course_media_public_read" on storage.objects
  for select using (bucket_id = 'course-media');

drop policy if exists "course_media_admin_insert" on storage.objects;
create policy "course_media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-media' and public.is_academy_admin());

drop policy if exists "course_media_admin_update" on storage.objects;
create policy "course_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-media' and public.is_academy_admin());

drop policy if exists "course_media_admin_delete" on storage.objects;
create policy "course_media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-media' and public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 4. admin_save_course(payload): saves a whole course in ONE transaction
--
--   { "course":  { id, slug, title, subtitle, description, level, course_type, is_free, price,
--                  compare_price, cover_url, hero_path, sequential, certificate_enabled,
--                  bonus_points, status, sort_order },
--     "modules": [ { id, title, lessons: [ { id, title, kind, summary, duration_seconds,
--                    read_minutes, is_preview, status, video, blocks } ] } ] }
--
--   Ids are uuids generated by the admin screen. Modules/lessons missing from the payload are
--   deleted (and their student progress with them). Runs with the caller's rights, so RLS
--   still applies; the explicit check just gives a clear error.
-- ---------------------------------------------------------------------
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
  if not public.is_academy_admin() then
    raise exception 'Only academy admins can save courses' using errcode = '42501';
  end if;

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

grant execute on function public.admin_save_course(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5. admin_save_bundle(payload): bundle + its courses in one transaction
--   { "bundle": { id, slug, title, description, price, compare_price, cover_url, cover_path,
--                 status, sort_order }, "course_ids": [uuid, ...] }   -- order = display order
-- ---------------------------------------------------------------------
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
  if not public.is_academy_admin() then
    raise exception 'Only academy admins can save bundles' using errcode = '42501';
  end if;

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

grant execute on function public.admin_save_bundle(jsonb) to authenticated;
