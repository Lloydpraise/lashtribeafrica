# Migrations

Run these in order, in the Supabase SQL editor for your project
(Dashboard → SQL Editor → New query → paste → Run), or via the Supabase
CLI if you have it set up (`supabase db push`).

1. `0001_products_schema.sql` — creates `categories` and `products` tables.
2. `0002_product_media_storage.sql` — creates the `product-media` storage
   bucket (public) that the admin panel uploads images/videos into.
3. `0003_seed_products.sql` — seeds categories + the 6 products currently
   live on the storefront, so nothing goes blank when it switches from
   the static data file to Supabase. Safe to skip if you'd rather start
   with an empty catalog and add products by hand in the admin panel.
4. `0004_site_settings_kits_offers.sql` — creates `site_settings` (a
   single editable row for hero copy, the countdown, the announcement
   ticker, and the privacy/shipping/terms policy pages), `kits` (Kit
   Strip bundles — only one can be active at a time), and `offers`
   (% off / free shipping promotions). Seeds one default `site_settings`
   row with the copy that used to be hardcoded, so nothing changes on
   the storefront until you edit it in Site Settings.

5. `0005_academy_courses.sql` — academy courses: `courses`, `course_modules`,
   `lessons` (public curriculum metadata), `lesson_content` (gated video + text
   blocks), `enrollments`, `lesson_progress`, `lesson_notes`, plus
   `has_course_access()` and `academy_admins`. Run after 0001 (re-uses
   `set_updated_at()`). **Unlike the product tables, writes are admin-only**:
   after running it, make yourself an admin with
   `insert into public.academy_admins (user_id) select id from auth.users where email = 'you@example.com';`
6. `0006_seed_demo_courses.sql` — optional. Two sample courses (one video + text,
   one reading-only) so `/academy/learn/?course=volume-lashing-fundamentals`
   works straight away. The videos are placeholder clips; delete the demo with
   the one-liner at the top of the file.

7. `0007_course_classic_set_essentials.sql` — the real "Classic Set Essentials"
   course (4 modules, 13 lessons, story-mode blocks + final quiz). Generated from
   `src/data/courses/classic-set-essentials.js` by
   `node scripts/course-to-sql.mjs src/data/courses/classic-set-essentials.js > supabase/migrations/0007_...sql`.
   Safe to re-run (upserts by id). Images live in `public/course-media/`.
   Lessons are `is_preview = true` so they read without a real login; to lock down:
   `update public.lessons set is_preview = false where course_id = '62eebf2d-79e9-5ada-ab79-9102d999a4cd';`
   The other courses can use the same script.

8. `0008_admin_courses.sql` — powers the admin **Courses** screen: adds `course_type`,
   `compare_price` and `hero_path` to `courses`; `course_bundles` + `course_bundle_items`;
   the public `course-media` storage bucket (hero images, story images, short videos up to 50 MB;
   **only academy admins can upload**); and the transactional `admin_save_course()` /
   `admin_save_bundle()` functions. Run after 0005.
   Outside the editor: `node scripts/course-to-json.mjs <course.js>` makes an importable .json, and
   `node scripts/course-to-sql.mjs <course.json>` makes SQL from an exported course.
   Self-test of the import code: `node scripts/test-course-import.mjs`.
9. `0009_courses_anon_admin.sql` — removes the Supabase Auth gate from the admin Courses section
   and enables course editing with the public anon key, matching Products. **This makes all course
   catalog, bundle, and lesson content publicly readable and writable, including paid lesson
   material and uploads.** Run after 0008. Anyone with the public anon key can read, create, edit,
   or delete this data until proper Supabase Auth is implemented. Do not use this temporary setup
   to protect paid course content.

**Security note:** all of this uses permissive RLS policies that let the
public anon key read *and write*. The admin panel is a static site with no
server-side session to scope policies to. The temporary course policy also
makes paid lesson content publicly readable; full detail is in
`0009_courses_anon_admin.sql`. Replace these policies with real Supabase Auth
before using them to protect paid content.

**After running migrations:** since the storefront pages are statically
generated at build time (not server-rendered), any product change you
make in the admin panel needs a rebuild + redeploy to show up on the live
site. `npm run dev` picks up changes on the next save/refresh; a deployed
site needs its normal deploy step re-run.
