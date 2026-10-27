-- 0026_security_hardening.sql
-- Stop trusting the browser. Everything below is enforced by the database, so it holds even for
-- someone calling Supabase directly with the public (anon) key that ships in every page.
--
--   1. Courses, modules, lessons, bundles: the public sees PUBLISHED items only; only admins write.
--      (Undoes the temporary "anon can do anything" rules from 0009.)
--   2. Lesson content (the paid part): only students with access, free-preview lessons, and admins.
--   3. Course PDFs (course_resources + the private course-files bucket): admins only.
--   4. course-media bucket: files still load by their public link (the player needs that), but only
--      admins can list, upload, replace or delete. Listing the bucket used to reveal every video.
--   5. admin_save_course / admin_save_bundle run as the caller, so the rules above apply to them,
--      and the public key can no longer call them at all.
--   6. Lesson progress must point at a published lesson of the same course (no cross-course tricks).
--   7. Sign-up no longer claims someone else's guest customer record. Only a CONFIRMED email links a
--      new login to earlier guest orders; the phone typed at sign-up is never used to match.
--   8. Admin-only and internal database functions can't be called with the public key.
--
-- Run after 0025 in the SQL editor; safe to re-run. Works whether or not 0018 has been run (nothing
-- here touches courses.category). Run it BEFORE testing the admin: the admin must be signed in as an
-- academy_admins member to edit courses from now on (which it already is: see AdminLogin.jsx).

-- ---------------------------------------------------------------------
-- 1. Course catalog: published to the public, everything to admins, writes for admins only
-- ---------------------------------------------------------------------
drop policy if exists "courses_anon_read"   on public.courses;
drop policy if exists "courses_anon_insert" on public.courses;
drop policy if exists "courses_anon_update" on public.courses;
drop policy if exists "courses_anon_delete" on public.courses;
drop policy if exists "courses_public_read" on public.courses;
drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_public_read" on public.courses
  for select to anon, authenticated
  using (status = 'published' or public.is_academy_admin());
create policy "courses_admin_write" on public.courses
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "modules_anon_read"   on public.course_modules;
drop policy if exists "modules_anon_insert" on public.course_modules;
drop policy if exists "modules_anon_update" on public.course_modules;
drop policy if exists "modules_anon_delete" on public.course_modules;
drop policy if exists "modules_public_read" on public.course_modules;
drop policy if exists "modules_admin_write" on public.course_modules;
create policy "modules_public_read" on public.course_modules
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or exists (select 1 from public.courses c where c.id = course_modules.course_id and c.status = 'published')
  );
create policy "modules_admin_write" on public.course_modules
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "lessons_anon_read"   on public.lessons;
drop policy if exists "lessons_anon_insert" on public.lessons;
drop policy if exists "lessons_anon_update" on public.lessons;
drop policy if exists "lessons_anon_delete" on public.lessons;
drop policy if exists "lessons_public_read" on public.lessons;
drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_public_read" on public.lessons
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or (
      lessons.status = 'published'
      and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
    )
  );
create policy "lessons_admin_write" on public.lessons
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "bundles_anon_read"   on public.course_bundles;
drop policy if exists "bundles_anon_insert" on public.course_bundles;
drop policy if exists "bundles_anon_update" on public.course_bundles;
drop policy if exists "bundles_anon_delete" on public.course_bundles;
drop policy if exists "bundles_public_read" on public.course_bundles;
drop policy if exists "bundles_admin_write" on public.course_bundles;
create policy "bundles_public_read" on public.course_bundles
  for select to anon, authenticated
  using (status = 'published' or public.is_academy_admin());
create policy "bundles_admin_write" on public.course_bundles
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "bundle_items_anon_read"   on public.course_bundle_items;
drop policy if exists "bundle_items_anon_insert" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_update" on public.course_bundle_items;
drop policy if exists "bundle_items_anon_delete" on public.course_bundle_items;
drop policy if exists "bundle_items_public_read" on public.course_bundle_items;
drop policy if exists "bundle_items_admin_write" on public.course_bundle_items;
create policy "bundle_items_public_read" on public.course_bundle_items
  for select to anon, authenticated
  using (
    public.is_academy_admin()
    or exists (select 1 from public.course_bundles b where b.id = course_bundle_items.bundle_id and b.status = 'published')
  );
create policy "bundle_items_admin_write" on public.course_bundle_items
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 2. Lesson content: only for students who have the course (or a free preview lesson)
-- ---------------------------------------------------------------------
drop policy if exists "lesson_content_anon_read"   on public.lesson_content;
drop policy if exists "lesson_content_anon_insert" on public.lesson_content;
drop policy if exists "lesson_content_anon_update" on public.lesson_content;
drop policy if exists "lesson_content_anon_delete" on public.lesson_content;
drop policy if exists "lesson_content_entitled_read" on public.lesson_content;
drop policy if exists "lesson_content_admin_write" on public.lesson_content;
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
create policy "lesson_content_admin_write" on public.lesson_content
  for all to authenticated
  using (public.is_academy_admin()) with check (public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 3. Course PDFs: admins only (students never see them)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.course_resources') is not null then
    execute 'drop policy if exists "course_resources_anon_all" on public.course_resources';
    execute 'drop policy if exists "course_resources_admin_all" on public.course_resources';
    execute 'create policy "course_resources_admin_all" on public.course_resources
               for all to authenticated
               using (public.is_academy_admin()) with check (public.is_academy_admin())';
  end if;
end $$;

drop policy if exists "course_files_anon_read"   on storage.objects;
drop policy if exists "course_files_anon_insert" on storage.objects;
drop policy if exists "course_files_anon_update" on storage.objects;
drop policy if exists "course_files_anon_delete" on storage.objects;
drop policy if exists "course_files_admin_read"   on storage.objects;
drop policy if exists "course_files_admin_insert" on storage.objects;
drop policy if exists "course_files_admin_update" on storage.objects;
drop policy if exists "course_files_admin_delete" on storage.objects;
create policy "course_files_admin_read" on storage.objects
  for select to authenticated using (bucket_id = 'course-files' and public.is_academy_admin());
create policy "course_files_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'course-files' and public.is_academy_admin());
create policy "course_files_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-files' and public.is_academy_admin())
  with check (bucket_id = 'course-files' and public.is_academy_admin());
create policy "course_files_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'course-files' and public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 4. course-media bucket: public links keep working, the bucket can't be listed or changed by the public.
--    (A public bucket serves /object/public/... links without checking these rules; the rules only
--    govern listing, uploading, replacing and deleting through the API.)
-- ---------------------------------------------------------------------
drop policy if exists "course_media_public_read"  on storage.objects;
drop policy if exists "course_media_anon_insert"  on storage.objects;
drop policy if exists "course_media_anon_update"  on storage.objects;
drop policy if exists "course_media_anon_delete"  on storage.objects;
drop policy if exists "course_media_admin_read"   on storage.objects;
drop policy if exists "course_media_admin_insert" on storage.objects;
drop policy if exists "course_media_admin_update" on storage.objects;
drop policy if exists "course_media_admin_delete" on storage.objects;
create policy "course_media_admin_read" on storage.objects
  for select to authenticated using (bucket_id = 'course-media' and public.is_academy_admin());
create policy "course_media_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'course-media' and public.is_academy_admin());
create policy "course_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-media' and public.is_academy_admin())
  with check (bucket_id = 'course-media' and public.is_academy_admin());
create policy "course_media_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'course-media' and public.is_academy_admin());

-- product-media: tighten the 0016 update rule so a file can't be moved out of the bucket.
drop policy if exists "product_media_admin_update" on storage.objects;
create policy "product_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-media' and public.is_academy_admin())
  with check (bucket_id = 'product-media' and public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 5. Course save routines: run as the caller (so RLS above applies) and not callable with the public key
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['public.admin_save_course(jsonb)', 'public.admin_save_bundle(jsonb)'] loop
    if to_regprocedure(f) is not null then
      execute format('alter function %s security invoker', f);
      execute format('revoke all on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Lesson progress: own rows, a course you can open, and a published lesson OF THAT course
-- ---------------------------------------------------------------------
drop policy if exists "progress_own_insert" on public.lesson_progress;
create policy "progress_own_insert" on public.lesson_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.has_course_access(lesson_progress.course_id)
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_progress.lesson_id and l.course_id = lesson_progress.course_id and l.status = 'published'
    )
  );
drop policy if exists "progress_own_update" on public.lesson_progress;
create policy "progress_own_update" on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.has_course_access(lesson_progress.course_id)
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_progress.lesson_id and l.course_id = lesson_progress.course_id and l.status = 'published'
    )
  );

-- Notes: same "lesson belongs to the course" rule.
drop policy if exists "notes_own_all" on public.lesson_notes;
create policy "notes_own_all" on public.lesson_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.has_course_access(lesson_notes.course_id)
    and exists (select 1 from public.lessons l where l.id = lesson_notes.lesson_id and l.course_id = lesson_notes.course_id)
  );

-- ---------------------------------------------------------------------
-- 7. Sign-up can't take over someone else's guest record
--    Before: the trigger matched a new login to an existing guest customer by the email OR the phone in
--    the sign-up form, before the email was confirmed. Anyone could sign up with another person's phone
--    number and then read that person's orders and delivery details in their profile.
--    Now: a new login gets its own customer row. It is linked to earlier guest orders only by its email,
--    and only once that email is confirmed (at sign-up when confirmation is off, otherwise on confirm).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_phone text := public.normalize_phone(new.raw_user_meta_data->>'phone');
begin
  begin
    v_id := public._upsert_customer(
      new.raw_user_meta_data->>'full_name',
      case when new.email_confirmed_at is not null then new.email end,  -- only a confirmed email can claim a guest record
      null,                                                              -- never match on the typed phone
      null, new.id, false
    );
    -- Keep the phone on the new profile when nobody else has it.
    if v_phone is not null then
      begin
        update public.customers set phone = v_phone where id = v_id and phone is null;
      exception when unique_violation then null;
      end;
    end if;
  exception when others then
    raise warning 'customer link failed for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.handle_new_user_customer() from public, anon, authenticated;

-- When an email is confirmed later, link that login to its guest orders (or just record the email).
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(new.email, ''))), '');
  v_mine public.customers%rowtype;
  v_guest uuid;
begin
  if old.email_confirmed_at is not null or new.email_confirmed_at is null or v_email is null then
    return new;
  end if;
  begin
    select * into v_mine from public.customers where user_id = new.id;
    select id into v_guest from public.customers where lower(email) = v_email and user_id is null limit 1;

    if v_guest is not null and (
      v_mine.id is null or (
        not exists (select 1 from public.orders o where o.customer_id = v_mine.id)
        and not exists (select 1 from public.course_certificates cc where cc.customer_id = v_mine.id)
      )
    ) then
      -- The new profile has nothing on it yet: drop it and take over the guest record instead.
      if v_mine.id is not null then
        delete from public.customers where id = v_mine.id;
      end if;
      update public.customers set
        user_id = new.id,
        full_name = case when full_name = '' then coalesce(v_mine.full_name, '') else full_name end
      where id = v_guest;
      if v_mine.phone is not null then
        begin
          update public.customers set phone = v_mine.phone where id = v_guest and phone is null;
        exception when unique_violation then null;
        end;
      end if;
    elsif v_mine.id is not null then
      begin
        update public.customers set email = v_email where id = v_mine.id and email is null;
      exception when unique_violation then null;  -- that email is on a record with orders: an admin can merge them
      end;
    else
      perform public._upsert_customer(new.raw_user_meta_data->>'full_name', v_email, null, null, new.id, false);
    end if;
  exception when others then
    raise warning 'customer link on confirm failed for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.handle_user_email_confirmed() from public, anon, authenticated;

drop trigger if exists on_auth_user_confirmed_customer on auth.users;
create trigger on_auth_user_confirmed_customer
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- ---------------------------------------------------------------------
-- 8. Function permissions. Supabase lets the public key call every function by default; these are
--    admin-only or internal, so take that away. (Each one also checks for an admin inside, where relevant.)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_set_order_status', 'admin_set_course_access', 'admin_move_order_batch', 'generate_batches',
        'batch_supplier_lines', 'admin_reprice_formula_products', 'admin_save_course', 'admin_save_bundle',
        'update_my_profile', 'issue_certificate',
        '_upsert_customer', '_grant_order_enrollments', 'formula_prices', '_resolve_options', '_offer_pct', '_line_pricing'
      )
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if r.proname like '\_%' or r.proname = 'formula_prices' then
      execute format('revoke all on function %s from authenticated', r.sig);   -- internal helpers: nobody calls these directly
    else
      execute format('grant execute on function %s to authenticated', r.sig);  -- signed-in only; admin check inside
    end if;
  end loop;
end $$;

-- Payments: readable by admins only, written only by the Pesapal functions (service role).
drop policy if exists "Admins read payments" on public.payments;
create policy "Admins read payments" on public.payments
  for select to authenticated using (public.is_academy_admin());

-- The admin list: an admin can see who the admins are; nobody can add one through the API.
drop policy if exists "academy_admins_read" on public.academy_admins;
create policy "academy_admins_read" on public.academy_admins
  for select to authenticated using (public.is_academy_admin());
