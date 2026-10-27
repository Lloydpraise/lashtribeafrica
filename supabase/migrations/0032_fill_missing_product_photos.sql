-- 0032: give photos to the live products that have none.
--
-- Why some products look blank: 14 active products (the ones added in the admin on 2026-09-28)
-- have an empty `images` list in the database, and nothing was ever uploaded for them in the
-- product-media storage bucket. 0022 only filled the demo + PDF-catalog products, so these were
-- never covered. Every other product's photo URL was checked and loads fine.
--
-- This fills 7 of them with the closest photo already shipped in public/products (or, for
-- Lash Glue 10ML, the photo already uploaded for Lash Glue 5ML). It only touches a product whose
-- `images` list is still empty, so it never overwrites a photo uploaded in the admin, and it is
-- safe to re-run.
--
-- Still without a photo after this (upload them in the admin): Electric Fan, Eye Mask,
-- Full Lash Kit - Clear Bag, I-G Tech Full Kit, Lash Serum, Makeup Box, Tweezers.
--
-- The /products/... photos are part of the site build, so they show on the live site after the
-- next deploy (and straight away on `npm run dev`).

with fill(slug, url) as (
  values
    ('i-g-tech-glue-5ml',  '/products/fadvan-fast-drying-black-glue/size-5ml.webp'),
    ('i-g-tech-glue-10ml', '/products/fadvan-fast-drying-black-glue/size-10ml.webp'),
    ('lash-shampoo-60ml',  '/products/fadvan-lash-cleaning-shampoo-60ml/1.webp'),
    ('microbrush',         '/products/qeelasee-micro-brushes/1.webp'),
    ('eye-patch',          '/products/under-eye-gel-patches-bulk/1.webp'),
    ('mirror',             '/products/qeelasee-lash-check-mirror/1.webp'),
    ('lash-glue-10ml',     (select p.images->0->>'url' from public.products p where p.slug = 'lash-glue-5ml'))
)
update public.products p
   set images = jsonb_build_array(jsonb_build_object('url', f.url, 'path', null, 'alt', p.name))
  from fill f
 where p.slug = f.slug
   and f.url is not null
   and (p.images is null or jsonb_typeof(p.images) <> 'array' or jsonb_array_length(p.images) = 0);

-- What is still missing a photo (should list only the 7 above that need an upload).
select slug, name, status
  from public.products
 where status = 'active'
   and (images is null or jsonb_typeof(images) <> 'array' or jsonb_array_length(images) = 0)
 order by name;
