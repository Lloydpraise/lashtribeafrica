-- 0024_product_variant_photos.sql
-- Variations that the product photos show but the products did not have, plus a photo for each variation.
-- When a customer picks a value (for example 10ml), the product page slides to that value's photo.
--
-- New photos ship with the site under public/products/<slug>/<name>.webp.
-- Run AFTER 0022 (and after 0023 if you ran it). Safe to re-run, and works without 0018.
-- Products that are not in the database are skipped (for example the 0023 ones, if you did not run it).
--
-- What changes:
--   Fast-Drying Black Glue      new Size option 10ml / 5ml (the photo shows both bottles), one photo each
--   Ventilador Premade Fans     a photo for each fan size: 3D, 6D, 8D, 10D, 12D, 14D, 20D
--   Fadvan Eyelash Tweezers     AF, A and B series models each show their own row of tweezers
--   Classic / Volume 0.02-0.03 / Ellipse Flat (black)   each thickness shows its own tray
--   L Curl Lash (+ 0.03mm)      a photo for each curl: L, L+, LC, LD
--   Mega Volume Fans 0.05       new Curl option C / D, one photo each
--   0.07 Volume Fans Mixed Tray new Curl option C / D (its photo shows both curls)
--   Isolation Tweezers Curved   now one curved tweezer (the old photo showed a set of 4 different tweezers)
--   Lash Cleaning Shampoo       drops the 2nd photo (it showed the shampoo bundled with a brush)
--   Color Lash                  Colour option (4 two-tone combos), one photo each
--   0023 products, if present:  Mini Air Blower colours, Glue Ring types (renamed by size), DIY Cluster 120 styles
--
-- Existing prices and price_delta values are not changed. New values get price_delta 0.

create or replace function pg_temp.add_images(p_slug text, p_urls text[]) returns void language sql as $$
  update public.products p
     set images = coalesce(p.images, '[]'::jsonb) || coalesce((
           select jsonb_agg(jsonb_build_object('url', u, 'path', null, 'alt', p.name) order by o)
             from unnest(p_urls) with ordinality as x(u, o)
            where not exists (select 1 from jsonb_array_elements(coalesce(p.images, '[]'::jsonb)) e where e->>'url' = u)), '[]'::jsonb)
   where p.slug = p_slug;
$$;

-- Adds the option if the product has none by that name (any case); otherwise adds only the missing values.
create or replace function pg_temp.ensure_option(p_slug text, p_name text, p_values text[]) returns void language plpgsql as $$
declare v_opts jsonb; v_idx int;
begin
  select coalesce(options, '[]'::jsonb) into v_opts from public.products where slug = p_slug;
  if not found then return; end if;
  if jsonb_typeof(v_opts) <> 'array' then v_opts := '[]'::jsonb; end if;
  select o - 1 into v_idx from jsonb_array_elements(v_opts) with ordinality as x(e, o) where lower(e->>'name') = lower(p_name) limit 1;
  if v_idx is null then
    v_opts := v_opts || jsonb_build_array(jsonb_build_object('name', p_name, 'values',
      (select jsonb_agg(jsonb_build_object('value', v, 'price_delta', 0) order by o) from unnest(p_values) with ordinality as y(v, o))));
  else
    v_opts := jsonb_set(v_opts, array[v_idx::text, 'values'], (v_opts->v_idx->'values') || coalesce((
      select jsonb_agg(jsonb_build_object('value', v, 'price_delta', 0) order by o)
        from unnest(p_values) with ordinality as y(v, o)
       where not exists (select 1 from jsonb_array_elements(v_opts->v_idx->'values') e where e->>'value' = v)), '[]'::jsonb));
  end if;
  update public.products set options = v_opts where slug = p_slug;
end $$;

-- Replaces the values of one option (used where the old value names were unclear). Keeps the option's other keys.
create or replace function pg_temp.set_option_values(p_slug text, p_name text, p_values text[]) returns void language sql as $$
  update public.products p
     set options = (select jsonb_agg(case when lower(e->>'name') = lower(p_name)
                                          then jsonb_set(e, '{values}', (select jsonb_agg(jsonb_build_object('value', v, 'price_delta', 0) order by o)
                                                                           from unnest(p_values) with ordinality as y(v, o)))
                                          else e end order by eo)
                      from jsonb_array_elements(p.options) with ordinality as x(e, eo))
   where p.slug = p_slug and jsonb_typeof(p.options) = 'array' and jsonb_array_length(p.options) > 0;
$$;

-- Links a photo to the listed values of an option (photo must already be on the product).
create or replace function pg_temp.link(p_slug text, p_option text, p_values text[], p_url text) returns void language sql as $$
  update public.products p
     set options = (select jsonb_agg(case when lower(e->>'name') = lower(p_option)
                                          then jsonb_set(e, '{values}', (select jsonb_agg(case when v->>'value' = any (p_values)
                                                                                               then v || jsonb_build_object('image', p_url) else v end order by vo)
                                                                           from jsonb_array_elements(e->'values') with ordinality as y(v, vo)))
                                          else e end order by eo)
                      from jsonb_array_elements(p.options) with ordinality as x(e, eo))
   where p.slug = p_slug and jsonb_typeof(p.options) = 'array' and jsonb_array_length(p.options) > 0
     and exists (select 1 from jsonb_array_elements(p.images) i where i->>'url' = p_url);
$$;

-- Removes a photo (and any value links to it), only while the product still has our /products/ photos.
create or replace function pg_temp.drop_image(p_slug text, p_url text) returns void language sql as $$
  update public.products p
     set images = coalesce((select jsonb_agg(i order by o) from jsonb_array_elements(p.images) with ordinality as x(i, o) where i->>'url' <> p_url), '[]'::jsonb),
         options = case when jsonb_typeof(p.options) = 'array' and jsonb_array_length(p.options) > 0 then
                     (select jsonb_agg(jsonb_set(e, '{values}', (select jsonb_agg(case when v->>'image' = p_url then v - 'image' else v end order by vo)
                                                                   from jsonb_array_elements(e->'values') with ordinality as y(v, vo))) order by eo)
                        from jsonb_array_elements(p.options) with ordinality as x(e, eo))
                   else p.options end
   where p.slug = p_slug and exists (select 1 from jsonb_array_elements(p.images) i where i->>'url' = p_url);
$$;

do $$
declare b text := '/products/';
begin
  -- Fadvan fast-drying black glue: 10ml and 5ml bottles
  perform pg_temp.add_images('fadvan-fast-drying-black-glue', array[b||'fadvan-fast-drying-black-glue/size-10ml.webp', b||'fadvan-fast-drying-black-glue/size-5ml.webp']);
  perform pg_temp.ensure_option('fadvan-fast-drying-black-glue', 'Size', array['10ml','5ml']);
  perform pg_temp.link('fadvan-fast-drying-black-glue', 'Size', array['10ml'], b||'fadvan-fast-drying-black-glue/size-10ml.webp');
  perform pg_temp.link('fadvan-fast-drying-black-glue', 'Size', array['5ml'], b||'fadvan-fast-drying-black-glue/size-5ml.webp');

  -- Ventilador premade fans: one tray photo per fan size
  perform pg_temp.add_images('fadvan-ventilador-premade-fans-3d-20d', array[
    b||'fadvan-ventilador-premade-fans-3d-20d/fan-3D.webp', b||'fadvan-ventilador-premade-fans-3d-20d/fan-6D.webp',
    b||'fadvan-ventilador-premade-fans-3d-20d/fan-8D.webp', b||'fadvan-ventilador-premade-fans-3d-20d/fan-10D.webp',
    b||'fadvan-ventilador-premade-fans-3d-20d/fan-12D.webp', b||'fadvan-ventilador-premade-fans-3d-20d/fan-14D.webp']);
  perform pg_temp.link('fadvan-ventilador-premade-fans-3d-20d', 'Fan size', array[s], b||'fadvan-ventilador-premade-fans-3d-20d/fan-'||s||'.webp')
     from unnest(array['3D','6D','8D','10D','12D','14D']) s;
  perform pg_temp.link('fadvan-ventilador-premade-fans-3d-20d', 'Fan size', array['20D'], b||'fadvan-ventilador-premade-fans-3d-20d/3.webp');

  -- Fadvan tweezers: each series has its own row photo (from the catalog)
  perform pg_temp.link('fadvan-fadvan-eyelash-tweezers', 'Model', array['AF1','AF2','AF3','AF4','AF5'], b||'fadvan-fadvan-eyelash-tweezers/2.webp');
  perform pg_temp.link('fadvan-fadvan-eyelash-tweezers', 'Model', array['A1','A2','A3','A4','A5','A6'], b||'fadvan-fadvan-eyelash-tweezers/3.webp');
  perform pg_temp.link('fadvan-fadvan-eyelash-tweezers', 'Model', array['B1','B2','B3','B4','B5','B6','B7','B8'], b||'fadvan-fadvan-eyelash-tweezers/4.webp');

  -- Qeelasee thickness trays
  perform pg_temp.link('qeelasee-classic-lash', 'Thickness', array['0.10mm','0.12mm'], b||'qeelasee-classic-lash/1.webp');
  perform pg_temp.link('qeelasee-classic-lash', 'Thickness', array['0.15mm','0.18mm','0.20mm'], b||'qeelasee-classic-lash/2.webp');
  perform pg_temp.link('qeelasee-volume-lash-0-02-0-03mm', 'Thickness', array['0.03mm'], b||'qeelasee-volume-lash-0-02-0-03mm/1.webp');
  perform pg_temp.link('qeelasee-volume-lash-0-02-0-03mm', 'Thickness', array['0.02mm'], b||'qeelasee-volume-lash-0-02-0-03mm/2.webp');
  perform pg_temp.link('qeelasee-ellipse-flat-lash-black', 'Thickness', array['0.15mm'], b||'qeelasee-ellipse-flat-lash-black/1.webp');
  perform pg_temp.link('qeelasee-ellipse-flat-lash-black', 'Thickness', array['0.20mm','0.25mm'], b||'qeelasee-ellipse-flat-lash-black/2.webp');

  -- L curl: one photo per curl
  perform pg_temp.add_images(s, array[b||s||'/curl-L.webp', b||s||'/curl-Lplus.webp', b||s||'/curl-LC.webp', b||s||'/curl-LD.webp'])
     from unnest(array['qeelasee-l-curl-lash','qeelasee-l-curl-lash-0-03mm']) s;
  perform pg_temp.link(s, 'Curl', array[c], b||s||'/curl-'||f||'.webp')
     from unnest(array['qeelasee-l-curl-lash','qeelasee-l-curl-lash-0-03mm']) s,
          unnest(array['L','L+','LC','LD'], array['L','Lplus','LC','LD']) as z(c, f);

  -- Demo fans: C / D curl
  perform pg_temp.add_images('mega-volume-fans-0-05', array[b||'mega-volume-fans-0-05/curl-C.webp', b||'mega-volume-fans-0-05/curl-D.webp']);
  perform pg_temp.ensure_option('mega-volume-fans-0-05', 'Curl', array['C','D']);
  perform pg_temp.link('mega-volume-fans-0-05', 'Curl', array['C'], b||'mega-volume-fans-0-05/curl-C.webp');
  perform pg_temp.link('mega-volume-fans-0-05', 'Curl', array['D'], b||'mega-volume-fans-0-05/curl-D.webp');
  perform pg_temp.ensure_option('0-07-volume-fans-mixed-tray', 'Curl', array['C','D']);

  -- Isolation tweezers: a single curved tweezer instead of a set of four
  if exists (select 1 from public.products where slug = 'isolation-tweezers-curved'
               and not exists (select 1 from jsonb_array_elements(images) i where coalesce(i->>'url','') not like '/products/%')) then
    update public.products set images = '[]'::jsonb where slug = 'isolation-tweezers-curved';
    perform pg_temp.add_images('isolation-tweezers-curved', array[b||'isolation-tweezers-curved/curved.webp']);
  end if;

  -- Shampoo: drop the photo that showed it bundled with a brush
  perform pg_temp.drop_image('fadvan-lash-cleaning-shampoo-60ml', b||'fadvan-lash-cleaning-shampoo-60ml/2.webp');

  -- Color Lash: two-tone combos
  perform pg_temp.add_images('qeelasee-color-lash', array[b||'qeelasee-color-lash/purple-white.webp', b||'qeelasee-color-lash/yellow-blue.webp',
                                                          b||'qeelasee-color-lash/pink-brown.webp', b||'qeelasee-color-lash/blue-red.webp']);
  perform pg_temp.ensure_option('qeelasee-color-lash', 'Colour', array['Purple + White','Yellow + Blue','Pink + Brown','Blue + Red']);
  perform pg_temp.link('qeelasee-color-lash', 'Colour', array[c], b||'qeelasee-color-lash/'||f||'.webp')
     from unnest(array['Purple + White','Yellow + Blue','Pink + Brown','Blue + Red'], array['purple-white','yellow-blue','pink-brown','blue-red']) as z(c, f);

  -- 0023 products (skipped when 0023 was not run)
  perform pg_temp.add_images('qeelasee-mini-air-blower', array[b||'qeelasee-mini-air-blower/pink.webp', b||'qeelasee-mini-air-blower/black.webp', b||'qeelasee-mini-air-blower/red.webp']);
  perform pg_temp.link('qeelasee-mini-air-blower', 'Colour', array[c], b||'qeelasee-mini-air-blower/'||lower(c)||'.webp')
     from unnest(array['Pink','Black','Red']) c;

  perform pg_temp.set_option_values('qeelasee-glue-rings', 'Type', array['Type 1 (17mm, divided)','Type 2 (17mm)','Type 3 (14mm)','Type 4 (13mm)','Type 5 (13mm, wide)']);
  perform pg_temp.add_images('qeelasee-glue-rings', array(select b||'qeelasee-glue-rings/type-'||i||'.webp' from generate_series(1,5) i));
  perform pg_temp.link('qeelasee-glue-rings', 'Type', array[v], b||'qeelasee-glue-rings/type-'||i||'.webp')
     from unnest(array['Type 1 (17mm, divided)','Type 2 (17mm)','Type 3 (14mm)','Type 4 (13mm)','Type 5 (13mm, wide)']) with ordinality as z(v, i);

  perform pg_temp.add_images('qeelasee-diy-cluster-lash-120-200', array[b||'qeelasee-diy-cluster-lash-120-200/S06.webp', b||'qeelasee-diy-cluster-lash-120-200/40P.webp', b||'qeelasee-diy-cluster-lash-120-200/W51.webp']);
  perform pg_temp.link('qeelasee-diy-cluster-lash-120-200', 'Style', array[v], b||'qeelasee-diy-cluster-lash-120-200/'||v||'.webp')
     from unnest(array['S06','40P','W51']) v;
end $$;
