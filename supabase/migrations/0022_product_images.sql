-- 0022_product_images.sql
-- Fills products.images for the 0003 demo products and the 0019 Qeelasee/Fadvan products.
-- The image files ship with the site under public/products/<slug>/N.webp (white background, square, max 1000px),
-- so they are served from /products/<slug>/N.webp. Nothing is uploaded to Supabase storage.
--
-- Safe to re-run and safe on a database where later migrations (e.g. 0018) were not run: it only touches
-- products.images (from 0001). A product is updated only when it has no images yet, or when every image it has
-- came from this migration (url starts with /products/). Photos uploaded in the admin are never overwritten.
-- Products whose slug is not in the database are skipped.
-- Images go live with the next site deploy (the files must be in public/ of the deployed build).

with src(slug, urls) as (values
  ('qeelasee-volume-lash-0-02-0-03mm', '["/products/qeelasee-volume-lash-0-02-0-03mm/1.webp", "/products/qeelasee-volume-lash-0-02-0-03mm/2.webp", "/products/qeelasee-volume-lash-0-02-0-03mm/3.webp"]'::jsonb),
  ('qeelasee-volume-lash-0-05-0-07mm', '["/products/qeelasee-volume-lash-0-05-0-07mm/1.webp", "/products/qeelasee-volume-lash-0-05-0-07mm/2.webp"]'::jsonb),
  ('qeelasee-brown-lash', '["/products/qeelasee-brown-lash/1.webp", "/products/qeelasee-brown-lash/2.webp"]'::jsonb),
  ('qeelasee-classic-lash', '["/products/qeelasee-classic-lash/1.webp", "/products/qeelasee-classic-lash/2.webp", "/products/qeelasee-classic-lash/3.webp"]'::jsonb),
  ('qeelasee-l-curl-lash', '["/products/qeelasee-l-curl-lash/1.webp", "/products/qeelasee-l-curl-lash/2.webp"]'::jsonb),
  ('qeelasee-l-curl-lash-0-03mm', '["/products/qeelasee-l-curl-lash-0-03mm/1.webp", "/products/qeelasee-l-curl-lash-0-03mm/2.webp"]'::jsonb),
  ('qeelasee-m-curl-lash', '["/products/qeelasee-m-curl-lash/1.webp", "/products/qeelasee-m-curl-lash/2.webp"]'::jsonb),
  ('qeelasee-m-curl-lash-0-03mm', '["/products/qeelasee-m-curl-lash-0-03mm/1.webp", "/products/qeelasee-m-curl-lash-0-03mm/2.webp"]'::jsonb),
  ('qeelasee-ellipse-flat-lash-black', '["/products/qeelasee-ellipse-flat-lash-black/1.webp", "/products/qeelasee-ellipse-flat-lash-black/2.webp", "/products/qeelasee-ellipse-flat-lash-black/3.webp"]'::jsonb),
  ('qeelasee-ellipse-flat-lash-brown', '["/products/qeelasee-ellipse-flat-lash-brown/1.webp", "/products/qeelasee-ellipse-flat-lash-brown/2.webp"]'::jsonb),
  ('qeelasee-yy-shape-lash-black', '["/products/qeelasee-yy-shape-lash-black/1.webp", "/products/qeelasee-yy-shape-lash-black/2.webp"]'::jsonb),
  ('qeelasee-yy-shape-lash-dark-brown', '["/products/qeelasee-yy-shape-lash-dark-brown/1.webp"]'::jsonb),
  ('qeelasee-yy-shape-lash-light-brown', '["/products/qeelasee-yy-shape-lash-light-brown/1.webp", "/products/qeelasee-yy-shape-lash-light-brown/2.webp"]'::jsonb),
  ('qeelasee-easy-fanning-lash', '["/products/qeelasee-easy-fanning-lash/1.webp", "/products/qeelasee-easy-fanning-lash/2.webp", "/products/qeelasee-easy-fanning-lash/3.webp"]'::jsonb),
  ('qeelasee-3d-clover-lash-black', '["/products/qeelasee-3d-clover-lash-black/1.webp", "/products/qeelasee-3d-clover-lash-black/2.webp"]'::jsonb),
  ('qeelasee-4d-w-shape-lash-black', '["/products/qeelasee-4d-w-shape-lash-black/1.webp", "/products/qeelasee-4d-w-shape-lash-black/2.webp"]'::jsonb),
  ('qeelasee-5d-w-shape-lash-black', '["/products/qeelasee-5d-w-shape-lash-black/1.webp", "/products/qeelasee-5d-w-shape-lash-black/2.webp"]'::jsonb),
  ('qeelasee-w-shape-lash-6d-black', '["/products/qeelasee-w-shape-lash-6d-black/1.webp", "/products/qeelasee-w-shape-lash-6d-black/2.webp"]'::jsonb),
  ('qeelasee-3d-clover-lash-brown', '["/products/qeelasee-3d-clover-lash-brown/1.webp"]'::jsonb),
  ('qeelasee-4d-w-shape-lash-brown', '["/products/qeelasee-4d-w-shape-lash-brown/1.webp", "/products/qeelasee-4d-w-shape-lash-brown/2.webp"]'::jsonb),
  ('qeelasee-5d-w-shape-lash-brown', '["/products/qeelasee-5d-w-shape-lash-brown/1.webp"]'::jsonb),
  ('qeelasee-w-shape-lash-6d-brown', '["/products/qeelasee-w-shape-lash-6d-brown/1.webp", "/products/qeelasee-w-shape-lash-6d-brown/2.webp"]'::jsonb),
  ('qeelasee-spike-3d-w-lash-brown', '["/products/qeelasee-spike-3d-w-lash-brown/1.webp", "/products/qeelasee-spike-3d-w-lash-brown/2.webp"]'::jsonb),
  ('qeelasee-camellia-lash', '["/products/qeelasee-camellia-lash/1.webp", "/products/qeelasee-camellia-lash/2.webp"]'::jsonb),
  ('qeelasee-spikes-lashes', '["/products/qeelasee-spikes-lashes/1.webp"]'::jsonb),
  ('qeelasee-premade-fans-6d-short-stem', '["/products/qeelasee-premade-fans-6d-short-stem/1.webp", "/products/qeelasee-premade-fans-6d-short-stem/2.webp"]'::jsonb),
  ('qeelasee-color-lash', '["/products/qeelasee-color-lash/1.webp"]'::jsonb),
  ('qeelasee-rainbow-lash', '["/products/qeelasee-rainbow-lash/1.webp", "/products/qeelasee-rainbow-lash/2.webp"]'::jsonb),
  ('fadvan-ventilador-premade-fans-3d-20d', '["/products/fadvan-ventilador-premade-fans-3d-20d/1.webp", "/products/fadvan-ventilador-premade-fans-3d-20d/2.webp", "/products/fadvan-ventilador-premade-fans-3d-20d/3.webp"]'::jsonb),
  ('fadvan-8d-w-shape-lash', '["/products/fadvan-8d-w-shape-lash/1.webp", "/products/fadvan-8d-w-shape-lash/2.webp", "/products/fadvan-8d-w-shape-lash/3.webp"]'::jsonb),
  ('fadvan-diy-cluster-lashes', '["/products/fadvan-diy-cluster-lashes/1.webp", "/products/fadvan-diy-cluster-lashes/2.webp", "/products/fadvan-diy-cluster-lashes/3.webp"]'::jsonb),
  ('fadvan-eyelash-extension-glue-a-01-10ml', '["/products/fadvan-eyelash-extension-glue-a-01-10ml/1.webp"]'::jsonb),
  ('fadvan-fast-drying-black-glue', '["/products/fadvan-fast-drying-black-glue/1.webp"]'::jsonb),
  ('fadvan-sky-glue', '["/products/fadvan-sky-glue/1.webp"]'::jsonb),
  ('fadvan-diy-lash-glue-wand', '["/products/fadvan-diy-lash-glue-wand/1.webp", "/products/fadvan-diy-lash-glue-wand/2.webp"]'::jsonb),
  ('fadvan-lash-gel-remover-5g', '["/products/fadvan-lash-gel-remover-5g/1.webp"]'::jsonb),
  ('fadvan-lash-cleaning-shampoo-60ml', '["/products/fadvan-lash-cleaning-shampoo-60ml/1.webp", "/products/fadvan-lash-cleaning-shampoo-60ml/2.webp"]'::jsonb),
  ('fadvan-fadvan-eyelash-tweezers', '["/products/fadvan-fadvan-eyelash-tweezers/1.webp", "/products/fadvan-fadvan-eyelash-tweezers/2.webp", "/products/fadvan-fadvan-eyelash-tweezers/3.webp", "/products/fadvan-fadvan-eyelash-tweezers/4.webp"]'::jsonb),
  ('0-07-volume-fans-mixed-tray', '["/products/0-07-volume-fans-mixed-tray/1.webp", "/products/0-07-volume-fans-mixed-tray/2.webp"]'::jsonb),
  ('mega-volume-fans-0-05', '["/products/mega-volume-fans-0-05/1.webp", "/products/mega-volume-fans-0-05/2.webp"]'::jsonb),
  ('pro-bond-adhesive-5ml', '["/products/pro-bond-adhesive-5ml/1.webp"]'::jsonb),
  ('isolation-tweezers-curved', '["/products/isolation-tweezers-curved/1.webp", "/products/isolation-tweezers-curved/2.webp"]'::jsonb),
  ('under-eye-gel-patches-bulk', '["/products/under-eye-gel-patches-bulk/1.webp"]'::jsonb),
  ('low-fume-primer-10ml', '["/products/low-fume-primer-10ml/1.webp"]'::jsonb)
)
update public.products p
   set images = (
         select jsonb_agg(jsonb_build_object('url', u.url, 'path', null, 'alt', p.name) order by u.ord)
           from jsonb_array_elements_text(src.urls) with ordinality as u(url, ord)
       )
  from src
 where p.slug = src.slug
   and (
         p.images is null
      or jsonb_array_length(p.images) = 0
      or not exists (
           select 1 from jsonb_array_elements(p.images) e
            where coalesce(e->>'url', '') not like '/products/%'
         )
       );

-- Check: products still without a photo
-- select slug, name, status from public.products where jsonb_array_length(images) = 0 order by sort_order;
