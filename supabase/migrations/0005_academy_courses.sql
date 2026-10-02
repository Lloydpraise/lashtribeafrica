-- 0005_academy_courses.sql
-- Academy courses: catalog, curriculum, gated lesson content, enrollments,
-- per-student progress and notes.
--
-- Run AFTER 0001 (re-uses public.set_updated_at()).
--
-- Access model
--   * Catalog + curriculum (titles, order, durations) is public for published
--     courses, so locked courses can still be shown and sold.
--   * Lesson CONTENT (video source, text blocks) lives in a separate table,
--     public.lesson_content, and is only readable when the student has access:
--       - the lesson is flagged is_preview, OR
--       - the course is free and the student is signed in, OR
--       - the student is enrolled (paid / gifted / admin-granted), OR
--       - the user is an academy admin.
--   * Course material is stored as structured text blocks + a video reference.
--     There is no downloadable file for students: PDFs uploaded in the admin are
--     only ever used to extract text and are never served to students.
--   * Writes to catalog/content tables are admin-only (public.academy_admins).
--     Unlike the product tables, these do NOT allow anonymous writes, because
--     they protect paid content. Admin screens must sign in with Supabase Auth.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------
create table if not exists public.academy_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_academy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.academy_admins a where a.user_id = auth.uid());
$$;

-- To make yourself an admin (replace with your auth user id / email):
--   insert into public.academy_admins (user_id)
--   select id from auth.users where email = 'you@example.com';

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  is_free boolean not null default true,
  price numeric(10,2) not null default 0,
  cover_url text,
  sequential boolean not null default false,       -- true = lessons unlock one by one
  certificate_enabled boolean not null default true,
  bonus_points integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- modules (groups of lessons)
-- ---------------------------------------------------------------------
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists course_modules_course_idx on public.course_modules(course_id, sort_order);

-- ---------------------------------------------------------------------
-- lessons (metadata only; safe to show on locked courses)
-- ---------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  title text not null,
  kind text not null default 'video' check (kind in ('video', 'reading', 'assessment')),
  summary text,
  duration_seconds integer not null default 0,     -- video length
  read_minutes integer not null default 0,         -- estimated reading time
  is_preview boolean not null default false,       -- readable without enrolling
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons(course_id, sort_order);

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- lesson_content (GATED: video reference + text blocks)
--   video  : { provider: 'file'|'hls'|'youtube', src|id, poster, duration,
--              chapters:[{t,title}], transcript:[{t,text}],
--              products:[{t, slug, note}] }   -- or null for reading lessons
--   blocks : [{ type: 'heading'|'text'|'list'|'steps'|'callout'|'quote'|
--                     'figure'|'checkpoint'|'quiz'|'divider', ... }]
-- ---------------------------------------------------------------------
create table if not exists public.lesson_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  video jsonb,
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists lesson_content_set_updated_at on public.lesson_content;
create trigger lesson_content_set_updated_at
  before update on public.lesson_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- enrollments (paid / gifted / free self-enrol)
-- Paid + gifted rows are written by an admin or a server-side function
-- (service role) once payment is confirmed. Students can only self-enrol
-- into FREE published courses.
-- ---------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'purchase' check (source in ('purchase', 'free', 'gift', 'admin')),
  order_ref text,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists enrollments_user_idx on public.enrollments(user_id);

-- ---------------------------------------------------------------------
-- access helper
-- ---------------------------------------------------------------------
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
      where e.course_id = p_course_id and e.user_id = auth.uid()
    )
    or public.is_academy_admin()
  );
$$;

grant execute on function public.has_course_access(uuid) to anon, authenticated;
grant execute on function public.is_academy_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- progress + notes (per student)
-- ---------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  position_seconds integer not null default 0,     -- resume point for video
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lesson_progress_course_idx on public.lesson_progress(user_id, course_id);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  t_seconds integer,                               -- null for notes on reading lessons
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lesson_notes_lesson_idx on public.lesson_notes(user_id, lesson_id);

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.academy_admins  enable row level security;
alter table public.courses         enable row level security;
alter table public.course_modules  enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_content  enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes    enable row level security;

-- academy_admins: an admin can see who the admins are; nobody writes via the API
-- (add admins from the SQL editor).
drop policy if exists "academy_admins_read" on public.academy_admins;
create policy "academy_admins_read" on public.academy_admins
  for select to authenticated using (public.is_academy_admin());

-- courses
drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses
  for select to anon, authenticated
  using (status = 'published' or public.is_academy_admin());
drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write" on public.courses
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- modules
drop policy if exists "modules_public_read" on public.course_modules;
create policy "modules_public_read" on public.course_modules
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );
drop policy if exists "modules_admin_write" on public.course_modules;
create policy "modules_admin_write" on public.course_modules
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- lessons (metadata)
drop policy if exists "lessons_public_read" on public.lessons;
create policy "lessons_public_read" on public.lessons
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or (
      status = 'published'
      and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    )
  );
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- lesson_content (gated)
drop policy if exists "lesson_content_entitled_read" on public.lesson_content;
create policy "lesson_content_entitled_read" on public.lesson_content
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_content.lesson_id
        and l.status = 'published'
        and c.status = 'published'
        and (l.is_preview or public.has_course_access(l.course_id))
    )
  );
drop policy if exists "lesson_content_admin_write" on public.lesson_content;
create policy "lesson_content_admin_write" on public.lesson_content
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- enrollments
drop policy if exists "enrollments_own_read" on public.enrollments;
create policy "enrollments_own_read" on public.enrollments
  for select to authenticated
  using (user_id = auth.uid() or public.is_academy_admin());
drop policy if exists "enrollments_free_self_enrol" on public.enrollments;
create policy "enrollments_free_self_enrol" on public.enrollments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and source = 'free'
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_free and c.status = 'published'
    )
  );
drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- lesson_progress (own rows only, and only for courses the student can access)
drop policy if exists "progress_own_read" on public.lesson_progress;
create policy "progress_own_read" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "progress_own_insert" on public.lesson_progress;
create policy "progress_own_insert" on public.lesson_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_course_access(course_id));
drop policy if exists "progress_own_update" on public.lesson_progress;
create policy "progress_own_update" on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_course_access(course_id));

-- lesson_notes (own rows only)
drop policy if exists "notes_own_all" on public.lesson_notes;
create policy "notes_own_all" on public.lesson_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_course_access(course_id));
