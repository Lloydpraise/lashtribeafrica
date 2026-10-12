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

10. `0010_course_pdf.sql` — one reference PDF per course (`course_resources` table + private
    `course-files` bucket), uploaded and downloaded from the admin course editor. Students never
    read it. Run after 0009. Open to the anon key like 0009 until admin sign-in exists.

11. `0011_customers_orders.sql` — **customers, orders and certificates.** Adds `customers`,
    `orders`, `order_items`, `course_certificates`; the `place_order()` function (the only way an
    order is created; prices are read on the server, courses need a signed-in profile);
    `admin_set_order_status()` (marking an order paid unlocks its courses, refund/cancel removes
    them); `update_my_profile()`, `issue_certificate()` (only once every lesson is done) and the
    public `verify_certificate()`; plus the reporting views `customer_stats`,
    `customer_product_stats` (repeat purchases across separate orders) and
    `customer_course_progress`. A trigger links every new login to its customer record (matching
    on email or phone, so earlier guest orders follow them). Run after 0010. Safe to re-run.
    **Unlike products and courses, none of these tables are open to the anon key.** Admins must be
    signed in (see below); students only ever see their own rows.

### One-time Supabase setup for customers + admin sign-in
1. Authentication → Providers → Email → turn **off** "Confirm email" (so a first-time buyer can
   buy a course straight away).
2. Create your admin login: Authentication → Users → Add user (email + password), then in the
   SQL editor run
   `insert into public.academy_admins (user_id) select id from auth.users where email = 'you@example.com';`
   The admin page (`/admin`) now asks for this login.
3. Authentication → URL Configuration → add your site URL (used by "Forgot password" links).
4. Certificate template: put your PDF at `public/certificate-template.pdf`. The student's name and
   the serial number are written onto page 1; adjust `TEMPLATE_LAYOUT` at the top of
   `src/services/certificatePdf.js` to move them. With no template file a built-in design is used.
5. Payments (M-Pesa / Pesapal, later): `place_order()` creates a *pending* order. Your payment
   callback should call `admin_set_order_status(order_id, 'paid', 'mpesa', '<receipt>')` using the
   service role key from a server function. Until then, use **Mark as paid** in admin → Orders.

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

12. `0012_public_stats.sql` — optional. A read-only function that returns the number of published
   courses and distinct enrolled students, used by the academy footer. Without it the footer shows
   only the course count.

13. `0013_preorder_batches.sql` — **preorder batching**. Adds `suppliers`, `products.supplier_id`, `batches`
   (one row per supplier shipment date), `orders.batch_id` and `site_settings.batch_cutoff_days` (default 7),
   plus `next_open_batch()`, `generate_batches()`, `admin_move_order_batch()` and `batch_supplier_lines()`.
   `place_order()` is replaced so every order with products joins the first OPEN batch that is MORE than the
   cutoff (7 days) away; the result also returns `batch_id` and `ship_date` for the checkout confirmation.
   It seeds the 15th and month-end for the next 6 months. Run after 0012; safe to re-run.
   After running it: add your suppliers in **Admin → Site Settings → Suppliers**, then in **Products** use the
   "products have no supplier" bar to set one for all existing products (every product needs a supplier).
   Course-only orders have no batch. With no open batch an order is saved as "Unassigned" (Orders → By shipping batch).
14. **`0014_contact_policy_course_info.sql`** – Contact + social fields on `site_settings` (email defaults to
   info@lashtribeafrica.com; phone, WhatsApp and social links start empty or with handle defaults and are edited in
   Admin → Site Settings → Contact & social), a starter shipping policy (only filled if the policy is blank),
   and course fields `duration_label` (default "2 weeks"), `about`, `learn_points`; `admin_save_course()` saves them.
   Run after 0013; safe to re-run. Rebuild/redeploy the site afterwards so course pages are generated.
15. **`0015_paid_course_access.sql`** – Paid courses stay locked until paid. Old "free" enrollments no longer unlock a
   course that has become paid (and are removed automatically when you switch a course free → paid). A paid order
   replaces any old enrollment, and `admin_set_course_access(user, course, true/false)` is a manual grant/revoke switch.
   Run after 0014; safe to re-run.
