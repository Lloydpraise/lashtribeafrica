-- 0046_product_weights.sql
-- Shipping weight (kg per ONE unit, packed) for every product, so checkout's shipping fee is never too low.
-- Run after 0029 (weight_kg column). Safe to re-run.
--
-- How checkout charges shipping (already built in 0029/0035/0040, unchanged here):
--   line weight = weight of one unit x quantity, e.g. 0.1 kg x 5 (the MOQ) = 0.5 kg,
--   order weight = sum of the lines, shipping fee = order weight x Ksh per kg (Site Settings), rounded up.
--   cart_quote shows it in the cart, place_order charges it; the quantity can never be below the MOQ.
--
-- Weights: Qeelasee products use the supplier shop's own shipping weight plus 10% for packing, rounded up
-- to 5 g. Fadvan uses the Alibaba listing weights from 0036. The rest are generous estimates.
-- Nothing is lowered: a weight you typed in the admin that is already higher is kept (greatest()).
-- Big items (lash bed, moon lamp, I-G Tech kit, makeup box) are estimates: check them in Admin -> Products.
--
-- Also: a product that still has no weight (0) is now charged as 0.1 kg per unit instead of free shipping.

create temp table _w (slug text primary key, kg numeric, source text) on commit drop;
insert into _w (slug, kg, source) values
    ('qeelasee-fast-volume-glue', 0.040, $n$supplier 32 g + 10%$n$),
    ('qeelasee-fast-drying-glue-05s', 0.040, $n$supplier 32 g + 10%$n$),
    ('qeelasee-3d-clover-lash-black', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-3d-clover-lash-brown', 0.060, $n$supplier 52 g + 10%$n$),
    ('3m-micropore-tape', 0.135, $n$supplier 120 g + 10%$n$),
    ('qeelasee-4d-w-shape-lash-black', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-4d-w-shape-lash-brown', 0.065, $n$supplier 55 g + 10%$n$),
    ('qeelasee-5d-w-shape-lash-black', 0.060, $n$supplier 52 g + 10%$n$),
    ('qeelasee-5d-w-shape-lash-brown', 0.065, $n$supplier 55 g + 10%$n$),
    ('qeelasee-as09-volume-tweezers', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-as10-tweezers', 0.140, $n$supplier 125 g + 10%$n$),
    ('qeelasee-bottom-volume-lashes', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-brown-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-camellia-lash', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-classic-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('classic-lashes', 0.060, $n$estimate: one lash tray (supplier trays are 40-55 g)$n$),
    ('qeelasee-lip-cleaning-brushes', 0.080, $n$supplier 70 g + 10%$n$),
    ('qeelasee-clear-gel-remover', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-color-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-diy-cluster-lash-120-200', 0.090, $n$estimate: supplier lists 0 g; the other DIY cluster kits are 82 g$n$),
    ('qeelasee-diy-cluster-lash-240-30d-40d', 0.095, $n$supplier 82 g + 10%$n$),
    ('qeelasee-diy-cluster-lash-50d-100d', 0.095, $n$supplier 82 g + 10%$n$),
    ('fadvan-diy-cluster-lashes', 0.060, $n$estimate: cluster tray + box$n$),
    ('easy-fan-lashes', 0.060, $n$estimate: one lash tray$n$),
    ('qeelasee-easy-fanning-lash', 0.065, $n$supplier 55 g + 10%$n$),
    ('electric-fan', 0.200, $n$estimate: USB mini fan in a box$n$),
    ('qeelasee-ellipse-flat-lash-black', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-ellipse-flat-lash-brown', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-expert-glue-0606', 0.045, $n$supplier 40 g + 10%$n$),
    ('eye-mask', 0.080, $n$estimate: eye mask in a bag$n$),
    ('eye-patch', 0.150, $n$estimate: pack of gel patches$n$),
    ('fadvan-eyelash-extension-glue-a-01-10ml', 0.080, $n$estimate: 10ml bottle + box$n$),
    ('eyepads', 0.150, $n$estimate: pack of gel pad sachets$n$),
    ('qeelasee-fairy-anime-lashes', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-super-glue-0608', 0.045, $n$supplier 40 g + 10%$n$),
    ('fast-drying-infinity-glow-glue', 0.080, $n$estimate: glue bottle + box$n$),
    ('qeelasee-fiber-tips-pink-tweezers', 0.045, $n$supplier 40 g + 10%$n$),
    ('full-lash-kit-clear-bag', 0.150, $n$estimate: clear PVC bag; CHECK if tools are inside$n$),
    ('qeelasee-glue-rings', 0.100, $n$supplier 90 g + 10%$n$),
    ('qeelasee-glue-primer', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-heart-star-comic-spire-lashes', 0.050, $n$supplier 42 g + 10%$n$),
    ('i-g-tech-full-kit', 2.000, $n$estimate: UV lamp, pedal, glue, glasses, pads; CHECK$n$),
    ('i-g-tech-glue-10ml', 0.080, $n$estimate: 10ml bottle + box$n$),
    ('i-g-tech-glue-5ml', 0.060, $n$estimate: 5ml bottle + box$n$),
    ('qeelasee-l-curl-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-l-curl-lash-0-03mm', 0.045, $n$supplier 40 g + 10%$n$),
    ('lash-bed', 40.000, $n$estimate: curved lash bed, boxed; CHECK$n$),
    ('lash-brush-spoolies', 0.080, $n$estimate: bag of spoolies$n$),
    ('qeelasee-lash-check-mirror', 0.075, $n$supplier 68 g + 10%$n$),
    ('lash-gel-remover-10g', 0.060, $n$estimate: gel bottle + box (photo says 15g)$n$),
    ('fadvan-lash-gel-remover-5g', 0.050, $n$Alibaba listing (0036)$n$),
    ('lash-gel-remover-5g', 0.050, $n$estimate: small gel bottle + box$n$),
    ('lash-glue-10ml', 0.080, $n$estimate: 10ml bottle + pouch$n$),
    ('lash-glue-5ml', 0.060, $n$estimate: 5ml bottle + pouch$n$),
    ('lash-serum', 0.050, $n$estimate: serum tube + box$n$),
    ('lash-shampoo-60ml', 0.100, $n$estimate: 60ml pump bottle$n$),
    ('lash-tape', 0.150, $n$estimate: pack of tape rolls (10 rolls of tape weigh 120 g)$n$),
    ('qeelasee-lower-flat-bottom-lashes', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-luxury-comic-spire-lashes', 0.050, $n$supplier 42 g + 10%$n$),
    ('qeelasee-m-curl-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-m-curl-lash-0-03mm', 0.045, $n$supplier 40 g + 10%$n$),
    ('makeup-box', 2.500, $n$estimate: hard makeup case; CHECK$n$),
    ('qeelasee-mascara-wands', 0.075, $n$supplier 68 g + 10%$n$),
    ('qeelasee-micro-brushes', 0.125, $n$supplier 110 g + 10%$n$),
    ('microbrush', 0.110, $n$same as the 100pc micro brush tub (110 g)$n$),
    ('qeelasee-mild-glue-0507', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-mini-air-blower', 0.065, $n$supplier 55 g + 10%$n$),
    ('mirror', 0.070, $n$same as the lash check mirror (68 g)$n$),
    ('moonlight', 9.000, $n$estimate: floor half-moon lamp, boxed; CHECK$n$),
    ('qeelasee-premade-fans-6d-short-stem', 0.045, $n$supplier 40 g + 10%$n$),
    ('primer', 0.050, $n$estimate: 15ml bottle + pouch$n$),
    ('qeelasee-protein-remover', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-rainbow-lash', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-remover-brush-pen', 0.040, $n$supplier 34 g + 10%$n$),
    ('qeelasee-spike-3d-w-lash-brown', 0.065, $n$supplier 55 g + 10%$n$),
    ('qeelasee-spikes-lashes', 0.045, $n$supplier 40 g + 10% (supplier lists 40000 g (typo); 40 g like every other tray)$n$),
    ('qeelasee-spire-anime-lashes', 0.050, $n$supplier 45 g + 10%$n$),
    ('qeelasee-strong-glue-0505', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-surgical-tape', 0.135, $n$supplier 120 g + 10%$n$),
    ('qeelasee-pe-tape', 0.135, $n$supplier 120 g + 10%$n$),
    ('tweezers', 0.050, $n$estimate: tweezer + case$n$),
    ('qeelasee-ultra-glue-0506', 0.060, $n$supplier 50 g + 10%$n$),
    ('fadvan-ventilador-premade-fans-3d-20d', 0.045, $n$Alibaba listing (0036)$n$),
    ('vetus-golden-feather-dolphin-tweezers', 0.060, $n$supplier 52 g + 10%$n$),
    ('vetus-tweezers-esd', 0.055, $n$supplier 46 g + 10%$n$),
    ('vetus-tweezers-msa', 0.065, $n$supplier 58 g + 10%$n$),
    ('vetus-tweezers-st', 0.040, $n$supplier 36 g + 10%$n$),
    ('qeelasee-volume-lash-0-02-0-03mm', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-volume-lash-0-05-0-07mm', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-w-shape-lash-6d-black', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-w-shape-lash-6d-brown', 0.065, $n$supplier 55 g + 10%$n$),
    ('qeelasee-wings-anime-lashes', 0.045, $n$supplier 40 g + 10%$n$),
    ('qeelasee-yy-shape-lash-black', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-yy-shape-lash-dark-brown', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-yy-shape-lash-light-brown', 0.060, $n$supplier 50 g + 10%$n$),
    ('qeelasee-yy-w-glue-0607', 0.045, $n$supplier 40 g + 10%$n$),
    ('fadvan-8d-w-shape-lash', 0.040, $n$Alibaba listing (0036)$n$),
    ('fadvan-diy-lash-glue-wand', 0.040, $n$estimate: wand tube$n$),
    ('fadvan-fadvan-eyelash-tweezers', 0.050, $n$estimate: tweezer + case$n$),
    ('fadvan-lash-cleaning-shampoo-60ml', 0.100, $n$estimate: 60ml pump bottle$n$),
    ('fadvan-sky-glue', 0.060, $n$estimate: glue bottle + box$n$);

update public.products p
   set weight_kg = greatest(coalesce(p.weight_kg, 0), w.kg),
       updated_at = now()
  from _w w
 where p.slug = w.slug
   and coalesce(p.weight_kg, 0) < w.kg;

-- Safety net: never ship a product at 0 kg. Same as 0029, plus a 0.1 kg fallback when no weight is set.
create or replace function public._line_weight(p public.products, p_opts jsonb)
returns numeric
language sql
stable
as $$
  select coalesce(
    nullif((
      select max((v->>'weight_kg')::numeric)
        from jsonb_array_elements(coalesce(p.options, '[]'::jsonb)) d
        cross join lateral jsonb_array_elements(d->'values') v
       where p_opts is not null
         and lower(btrim(v->>'value')) = lower(btrim(p_opts->>(d->>'name')))
         and coalesce((v->>'weight_kg')::numeric, 0) > 0
    ), 0),
    nullif(p.weight_kg, 0),
    0.1);
$$;
revoke all on function public._line_weight(public.products, jsonb) from public, anon, authenticated;

-- Check: weight per unit, weight and shipping at the MOQ.
select p.status, p.slug, p.name, p.weight_kg, p.moq,
       round(p.weight_kg * p.moq, 3) as kg_at_moq,
       public._shipping_fee(p.weight_kg * p.moq) as shipping_at_moq
  from public.products p
 order by p.weight_kg desc, p.name;
