-- 0010_course_pdf.sql
-- One reference PDF per course, uploaded in the admin course editor for admins/teachers to read and
-- download. Students never see it (the player doesn't read this table). Run AFTER 0009.
--
-- Access model matches 0009: the static admin uses the public anon key, so these policies are open
-- to the anon key. The bucket is PRIVATE (no public URL, files are fetched through the API), but anyone holding the anon key could still read it. That is deterrent-level protection,
-- not real DRM. Tighten when admins and students sign in with Supabase Auth.

create table if not exists public.course_resources (
  course_id uuid primary key references public.courses(id) on delete cascade,
  pdf_path text,
  pdf_name text,
  pdf_size bigint,
  updated_at timestamptz not null default now()
);
alter table public.course_resources enable row level security;

drop policy if exists "course_resources_anon_all" on public.course_resources;
create policy "course_resources_anon_all" on public.course_resources
  for all to anon, authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "course_files_anon_read" on storage.objects;
create policy "course_files_anon_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'course-files');
drop policy if exists "course_files_anon_insert" on storage.objects;
create policy "course_files_anon_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'course-files');
drop policy if exists "course_files_anon_update" on storage.objects;
create policy "course_files_anon_update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'course-files');
drop policy if exists "course_files_anon_delete" on storage.objects;
create policy "course_files_anon_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'course-files');
