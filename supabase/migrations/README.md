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

**Security note:** all of this uses permissive RLS policies that let the
public anon key read *and write*. That's because the admin panel is a
static site with only a client-side password gate — there's no real
server-side session to scope policies to. Full detail is in the comments
at the top of `0001_products_schema.sql`. It's an acceptable tradeoff for
a low-stakes internal catalog; flag it to me if you want real auth later.

**After running migrations:** since the storefront pages are statically
generated at build time (not server-rendered), any product change you
make in the admin panel needs a rebuild + redeploy to show up on the live
site. `npm run dev` picks up changes on the next save/refresh; a deployed
site needs its normal deploy step re-run.
