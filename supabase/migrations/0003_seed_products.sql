-- 0003_seed_products.sql
-- Seeds categories and the 6 products that are currently hardcoded in
-- src/data/ecommerce-products.js, so the storefront keeps showing the
-- same catalog once it switches to reading from Supabase. Safe to run
-- once; re-running just skips rows that already exist (matched by slug).

insert into public.categories (name, slug) values
  ('Lash Fans', 'lash-fans'),
  ('Adhesives & Primers', 'adhesives-primers'),
  ('Tools', 'tools'),
  ('Aftercare', 'aftercare')
on conflict (slug) do nothing;

insert into public.products (
  slug, name, description, features, note, badge, icon,
  category_id, featured_sections,
  market_price, now_price,
  moq, stock_quantity, low_stock_threshold,
  status
)
values
(
  '0-07-volume-fans-mixed-tray',
  '0.07 Volume Fans — Mixed Tray',
  'A soft, lightweight fan set designed for full-volume lash styling with a natural finish. Each tray is curated for quick restocks and smooth, repeatable application across a busy salon schedule.',
  '["Soft, flexible fan shape for full-volume looks", "Low-lint finish for cleaner application", "Batch-ready packaging for salon restocks"]'::jsonb,
  'Save Ksh 3,250 on the tray!',
  'MOQ 5',
  '<path d="M10 60 Q35 40 60 55 Q80 68 95 45" stroke="black" stroke-width="1.5" fill="none"/>',
  (select id from public.categories where slug = 'lash-fans'),
  '{top_selling}',
  1800, 1150,
  5, 50, 5,
  'active'
),
(
  'pro-bond-adhesive-5ml',
  'Pro Bond Adhesive, 5ml',
  'A strong, flexible cement built for consistent hold and easy lash customization. It dries cleanly, keeps lashes looking soft, and works beautifully with our volume and classic collections.',
  '["Strong, long-wear hold with smooth finish", "Easy-to-control formula for premium retention", "Great pairing with volume fans and patch kits"]'::jsonb,
  'Save Ksh 4,000 on the case!',
  'New',
  '<ellipse cx="50" cy="50" rx="30" ry="12" stroke="black" stroke-width="1.5" fill="none"/>',
  (select id from public.categories where slug = 'adhesives-primers'),
  '{top_selling}',
  2400, 1600,
  5, 50, 5,
  'active'
),
(
  'isolation-tweezers-curved',
  'Isolation Tweezers, Curved',
  'Precision curved tweezers designed for isolation and clean lash placement. The slim, ergonomic grip makes every application smoother and more controlled, especially on delicate fan sets.',
  '["Precision tip for clean isolation work", "Comfort grip for longer sessions", "Ideal for premium retail and treatment rooms"]'::jsonb,
  'Save Ksh 2,100 on the set!',
  'Best Seller',
  '<path d="M20 50 L80 50 M50 20 L50 80" stroke="black" stroke-width="1.5"/>',
  (select id from public.categories where slug = 'tools'),
  '{top_selling}',
  1200, 780,
  5, 50, 5,
  'active'
),
(
  'under-eye-gel-patches-bulk',
  'Under-Eye Gel Patches, Bulk',
  'Cooling, skin-safe patches that prep the under-eye area before treatment. Perfect for comfort-focused service add-ons and easy self-care retail upsells.',
  '["Cooling effect for a more comfortable service", "Low-irritation fit with soft texture", "Perfect add-on for retail and treatment bundles"]'::jsonb,
  'Save Ksh 1,700 on the pack!',
  'Bulk',
  '<rect x="25" y="25" width="50" height="50" stroke="black" stroke-width="1.5" fill="none"/>',
  (select id from public.categories where slug = 'aftercare'),
  '{top_selling}',
  900, 560,
  5, 50, 5,
  'active'
),
(
  'mega-volume-fans-0-05',
  'Mega Volume Fans — 0.05',
  'The lighter, fluffier alternative for dramatic volume without excessive weight. These fans are ideal for stylists who want soft dimension and a glossy finish at the same time.',
  '["Ultra-light fan texture for soft volume", "Clean finish to support premium lash artistry", "Ideal for salon teams stocking a premium range"]'::jsonb,
  'Just landed this batch',
  'New In',
  '<path d="M15 55 Q50 30 85 55" stroke="black" stroke-width="1.5" fill="none"/>',
  (select id from public.categories where slug = 'lash-fans'),
  '{new_in}',
  2000, 1300,
  5, 50, 5,
  'active'
),
(
  'low-fume-primer-10ml',
  'Low-Fume Primer, 10ml',
  'A low-fume prep layer that helps create a smoother application and improved bond feel. Designed for clients who prefer a cleaner, more comfortable service experience.',
  '["Low-fume formula for a more comfortable room", "Helps prep for cleaner, more even application", "Works well with premium volume and classic sets"]'::jsonb,
  'Just landed this batch',
  'New In',
  '<circle cx="50" cy="50" r="28" stroke="black" stroke-width="1.5" fill="none"/>',
  (select id from public.categories where slug = 'adhesives-primers'),
  '{new_in}',
  1600, 990,
  5, 50, 5,
  'active'
)
on conflict (slug) do nothing;

-- Wire up "goes together with" associations, matching what was
-- hardcoded in the old static data file.
update public.products set complements = array(
  select id from public.products where slug in ('pro-bond-adhesive-5ml', 'mega-volume-fans-0-05')
) where slug = '0-07-volume-fans-mixed-tray';

update public.products set complements = array(
  select id from public.products where slug in ('0-07-volume-fans-mixed-tray', 'isolation-tweezers-curved')
) where slug = 'pro-bond-adhesive-5ml';

update public.products set complements = array(
  select id from public.products where slug in ('pro-bond-adhesive-5ml', 'low-fume-primer-10ml')
) where slug = 'isolation-tweezers-curved';

update public.products set complements = array(
  select id from public.products where slug in ('mega-volume-fans-0-05', 'low-fume-primer-10ml')
) where slug = 'under-eye-gel-patches-bulk';

update public.products set complements = array(
  select id from public.products where slug in ('0-07-volume-fans-mixed-tray', 'pro-bond-adhesive-5ml')
) where slug = 'mega-volume-fans-0-05';

update public.products set complements = array(
  select id from public.products where slug in ('isolation-tweezers-curved', 'under-eye-gel-patches-bulk')
) where slug = 'low-fume-primer-10ml';
