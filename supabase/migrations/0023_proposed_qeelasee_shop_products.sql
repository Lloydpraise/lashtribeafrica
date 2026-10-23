-- 0023_proposed_qeelasee_shop_products.sql   (PROPOSAL: review before running; nothing here changes 0019)
-- Extra products, prices and variations found on the Qeelasee shop (https://qeelasee.com, checked 2026-10-22).
-- Run AFTER 0019 and 0022 in the Supabase SQL editor. Safe to re-run. Works without 0018.
--
-- About the prices:
--   * qeelasee.com is Qeelasee's RETAIL shop (single tray / single item, USD). The 0019 costs come from their OEM
--     price list (bulk, private label), which is cheaper. Retail is used here as the cost for the new products, so
--     the formula prices are on the safe (high) side. Ask Qeelasee for OEM/bulk prices and update product_costs.
--   * Where the shop charges more for one choice (DIY cluster kits, remover pen 10ml) the USD difference is turned
--     into a KES price_delta with the same pricing formula as the base price.
--
-- Section 1 adds 38 new products as DRAFTS (lashes, DIY clusters, glues, primers, removers, tweezers, tools).
--   Their photos are already in public/products/<slug>/1.webp. Existing slugs are left untouched.
-- Section 2 (optional) adds the variations the shop sells that 0019 is missing. Run it only if you stock them.

-- ===== Section 1: new products =====
create or replace function pg_temp.kes_options(p_opts jsonb, p_cost numeric) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', o->>'name', 'values', (
           select jsonb_agg(jsonb_build_object('value', v->>'value', 'price_delta',
                    case when coalesce((v->>'price_delta')::numeric, 0) = 0 then 0
                         else round((select wholesale from public.formula_prices(p_cost + (v->>'price_delta')::numeric))
                                  - (select wholesale from public.formula_prices(p_cost))) end) order by vo)
             from jsonb_array_elements(o->'values') with ordinality as x(v, vo))) order by oo), '[]'::jsonb)
    from jsonb_array_elements(p_opts) with ordinality as y(o, oo);
$$;

create temp table _shop (slug text, sku text, name text, description text, category text, cost_usd numeric, options_usd jsonb, images jsonb, sort int, source_url text) on commit drop;
insert into _shop values
  ('qeelasee-luxury-comic-spire-lashes','QL-COMIC-LUX','Luxury Comic Spire Lashes','Anime/comic-effect spire lashes, 0.05mm, mixed 8-15mm in one tray.','premade-fans',5.99,'[{"name": "Curl", "values": [{"value": "C", "price_delta": 0}, {"value": "D", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-luxury-comic-spire-lashes/1.webp"]'::jsonb,200,'https://qeelasee.com/products/luxury-comic-spire-eyelashes'),
  ('qeelasee-heart-star-comic-spire-lashes','QL-COMIC-HS','Heart & Star Comic Spire Lashes','Comic spire lashes with heart and star shapes, 0.05mm, mixed 8-15mm in one tray.','premade-fans',5.99,'[{"name": "Curl", "values": [{"value": "C", "price_delta": 0}, {"value": "CC", "price_delta": 0}, {"value": "D", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-heart-star-comic-spire-lashes/1.webp"]'::jsonb,201,'https://qeelasee.com/products/heart-and-star-comic-spire-eyelash-extensions'),
  ('qeelasee-wings-anime-lashes','QL-COMIC-WING','Wings Anime Effect Lashes','Premade wings (pteris) anime-effect lashes, 0.05mm, mixed 8-13mm in one tray.','premade-fans',5.99,'[{"name": "Curl", "values": [{"value": "C", "price_delta": 0}, {"value": "D", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-wings-anime-lashes/1.webp"]'::jsonb,202,'https://qeelasee.com/products/wings-pteris-eyelash-anime-effect-soft-plume-fluttering-eyelash-extensions-comic'),
  ('qeelasee-fairy-anime-lashes','QL-COMIC-FAIRY','Fairy Anime Effect Lashes','Premade fairy/elf anime-effect lashes in Korean PBT, 0.05mm, mixed 8-13mm in one tray.','premade-fans',5.99,'[{"name": "Curl", "values": [{"value": "C", "price_delta": 0}, {"value": "D", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-fairy-anime-lashes/1.webp"]'::jsonb,203,'https://qeelasee.com/products/fairy-eyelash-anime-effect-soft-plume-fluttering-eyelash-extensions-comic'),
  ('qeelasee-spire-anime-lashes','QL-COMIC-SPIRE','Spire Anime Effect Lashes','Premade spire anime-effect lashes in Korean PBT, 0.05mm, mixed 8-15mm in one tray.','premade-fans',5.99,'[{"name": "Curl", "values": [{"value": "C", "price_delta": 0}, {"value": "D", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-spire-anime-lashes/1.webp"]'::jsonb,204,'https://qeelasee.com/products/premade-spire-eyelash-anime-effect-soft-plume-fluttering-eyelash-extensions-comic'),
  ('qeelasee-diy-cluster-lash-120-200','QL-DIY-120','DIY Cluster Lash 120/200pcs','DIY cluster lashes, 0.07mm D curl, mixed 8-16mm. Glue and tweezer sold as add-ons.','premade-fans',5.68,'[{"name": "Style", "values": [{"value": "40P", "price_delta": 0.87}, {"value": "S06", "price_delta": 0.87}, {"value": "W51", "price_delta": 0.87}, {"value": "Glue", "price_delta": 0.2}, {"value": "Tweezer", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-diy-cluster-lash-120-200/1.webp"]'::jsonb,205,'https://qeelasee.com/products/diy-cluster-lash-120-200pcs-kit'),
  ('qeelasee-diy-cluster-lash-240-30d-40d','QL-DIY-240','DIY Cluster Lash 240pcs 30D/40D','240 DIY clusters, 0.07mm D curl, mixed 9-16mm. Kit version adds glue and tweezer.','premade-fans',7.98,'[{"name": "Style", "values": [{"value": "30D 240pcs", "price_delta": 0}, {"value": "40D 240pcs", "price_delta": 0}, {"value": "30D 240pcs + kit", "price_delta": 2}, {"value": "40D 240pcs + kit", "price_delta": 2}]}]'::jsonb,'["/products/qeelasee-diy-cluster-lash-240-30d-40d/1.webp"]'::jsonb,206,'https://qeelasee.com/products/diy-cluster-lash-240pcs-30d-40d'),
  ('qeelasee-diy-cluster-lash-50d-100d','QL-DIY-50D','DIY Cluster Lash 50D/80D/100D','Dense DIY clusters, 0.07mm D curl, mixed 8-18mm. Kit version adds glue and tweezer.','premade-fans',7.98,'[{"name": "Style", "values": [{"value": "50D 144pcs", "price_delta": 0}, {"value": "80D 144pcs", "price_delta": 0}, {"value": "100D 108pcs", "price_delta": 0}, {"value": "50D 144pcs + kit", "price_delta": 2}, {"value": "80D 144pcs + kit", "price_delta": 2}, {"value": "100D 108pcs + kit", "price_delta": 2}]}]'::jsonb,'["/products/qeelasee-diy-cluster-lash-50d-100d/1.webp"]'::jsonb,207,'https://qeelasee.com/products/diy-individual-cluster-lash-0-07d-50d-80d-100d'),
  ('qeelasee-lower-flat-bottom-lashes','QL-BOTTOM-FLAT','Lower Flat Bottom Lashes','Short flat lashes for the lower lash line.','lash-extensions',7.99,'[{"name": "Thickness", "values": [{"value": "0.15mm", "price_delta": 0}, {"value": "0.20mm", "price_delta": 0}]}, {"name": "Curl", "values": [{"value": "J", "price_delta": 0}, {"value": "C", "price_delta": 0}]}, {"name": "Length", "values": [{"value": "6mm", "price_delta": 0}, {"value": "7mm", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-lower-flat-bottom-lashes/1.webp"]'::jsonb,208,'https://qeelasee.com/products/lower-flat-bottom-lashes-0-15-0-20-5-6-7mm'),
  ('qeelasee-bottom-volume-lashes','QL-BOTTOM-VOL','Bottom Volume Lashes 5-7mm','Short lashes for under-eye (bottom) extensions.','lash-extensions',7.99,'[{"name": "Thickness", "values": [{"value": "0.05mm", "price_delta": 0}, {"value": "0.07mm", "price_delta": 0}, {"value": "0.10mm", "price_delta": 0}, {"value": "0.15mm", "price_delta": 0}, {"value": "0.20mm", "price_delta": 0}]}, {"name": "Curl", "values": [{"value": "J", "price_delta": 0}, {"value": "B", "price_delta": 0}, {"value": "C", "price_delta": 0}]}, {"name": "Length", "values": [{"value": "5mm", "price_delta": 0}, {"value": "6mm", "price_delta": 0}, {"value": "7mm", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-bottom-volume-lashes/1.webp"]'::jsonb,209,'https://qeelasee.com/products/bottom-volume-lashes-under-eyelash-extensions-5-6-7mm'),
  ('qeelasee-ultra-glue-0506','QL-GLUE-0506','Ultra Glue 0506 (1s, low irritation)','1 second dry time, 8-9 weeks retention, low irritation. Shelf life 1 year unopened, 1-3 months after opening.','adhesives-primers',13.9,'[]'::jsonb,'["/products/qeelasee-ultra-glue-0506/1.webp"]'::jsonb,210,'https://qeelasee.com/products/10ml-1s-low-irritation-ultra-glue-0506'),
  ('qeelasee-strong-glue-0505','QL-GLUE-0505','Strong Viscosity Glue 0505 (1s)','1 second dry time, 8-9 weeks retention, strong viscosity. Shelf life 1 year unopened, 1-3 months after opening.','adhesives-primers',13.7,'[]'::jsonb,'["/products/qeelasee-strong-glue-0505/1.webp"]'::jsonb,211,'https://qeelasee.com/products/10ml-1s-strong-viscosity-lash-glue-0505'),
  ('qeelasee-mild-glue-0507','QL-GLUE-0507','Mild Glue 0507 (0.5s, long lasting)','0.5 second dry time, 8-9 weeks retention, mild formula.','adhesives-primers',13.5,'[]'::jsonb,'["/products/qeelasee-mild-glue-0507/1.webp"]'::jsonb,212,'https://qeelasee.com/products/10ml-0-5s-long-lasting-eyelash-mild-glue-0507'),
  ('qeelasee-yy-w-glue-0607','QL-GLUE-0607','YY/W Lash Glue 0607 (0.5s)','0.5 second glue made for YY and W lashes, 8-9 weeks retention, 5ml.','adhesives-primers',10.5,'[]'::jsonb,'["/products/qeelasee-yy-w-glue-0607/1.webp"]'::jsonb,213,'https://qeelasee.com/products/0-5s-yy-w-eyelash-glue-0607'),
  ('qeelasee-expert-glue-0606','QL-GLUE-0606','Expert Glue 0606 (0.5s)','Professional level 0.5 second adhesive, 8-9 weeks retention, 5ml.','adhesives-primers',11.5,'[]'::jsonb,'["/products/qeelasee-expert-glue-0606/1.webp"]'::jsonb,214,'https://qeelasee.com/products/0-5s-expert-glue-0606'),
  ('qeelasee-super-glue-0608','QL-GLUE-0608','Fast Drying Super Glue 0608 (0.3-0.5s)','0.3-0.5 second dry time, 8-9 weeks retention, 5ml.','adhesives-primers',10.59,'[]'::jsonb,'["/products/qeelasee-super-glue-0608/1.webp"]'::jsonb,215,'https://qeelasee.com/products/2s-low-irritation-low-smell-long-lasting-waterproof-glue'),
  ('qeelasee-fast-volume-glue','QL-GLUE-01S','0.1-0.3s Fast Glue for Volume Lashes','0.1 second dry time for volume work, 8-9 weeks retention, 5ml.','adhesives-primers',26.9,'[{"name": "Type", "values": [{"value": "Volume lash glue", "price_delta": 0}, {"value": "Master glue 0609", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-fast-volume-glue/1.webp"]'::jsonb,216,'https://qeelasee.com/products/0-1s-fast-glue-for-volume-eyelash'),
  ('qeelasee-fast-drying-glue-05s','QL-GLUE-05S','0.5s Fast Drying Eyelash Glue','0.5 second dry time, 7-8 weeks retention, 5ml.','adhesives-primers',10.59,'[]'::jsonb,'["/products/qeelasee-fast-drying-glue-05s/1.webp"]'::jsonb,217,'https://qeelasee.com/products/0-5s-fast-drying-eyelash-glue'),
  ('qeelasee-protein-remover','QL-PROTEIN','Protein Remover / Lash Primer (Green Tea)','Cleans oils and protein from natural lashes before application. 15ml.','adhesives-primers',9.59,'[]'::jsonb,'["/products/qeelasee-protein-remover/1.webp"]'::jsonb,218,'https://qeelasee.com/products/protein-remover-lash-primer'),
  ('qeelasee-glue-primer','QL-PRIMER','Glue Primer','Helps glue cure faster and stronger so lashes last longer. 15ml.','adhesives-primers',9.59,'[]'::jsonb,'["/products/qeelasee-glue-primer/1.webp"]'::jsonb,219,'https://qeelasee.com/products/glue-primer'),
  ('qeelasee-clear-gel-remover','QL-GEL-REM','Clear Gel Remover 15g','Clear, odourless gel remover for lash extension glue. Good for sensitive eyes.','aftercare',9.59,'[]'::jsonb,'["/products/qeelasee-clear-gel-remover/1.webp"]'::jsonb,220,'https://qeelasee.com/products/clear-gel-remover'),
  ('qeelasee-remover-brush-pen','QL-REM-PEN','Remover Brush Pen','Pen-style lash glue remover with a thick texture that does not run into the eyes.','aftercare',6.89,'[{"name": "Size", "values": [{"value": "5ml", "price_delta": 0}, {"value": "10ml", "price_delta": 1}]}]'::jsonb,'["/products/qeelasee-remover-brush-pen/1.webp"]'::jsonb,221,'https://qeelasee.com/products/qeelasee-5ml-10ml-remover-brush-pen'),
  ('qeelasee-fiber-tips-pink-tweezers','QL-TWZ-LF','Fiber Tips Pink Tweezers','Stainless steel tweezers with fiber tips and non-slip diamond grip, for fanning, isolating and placing.','tools',9.99,'[{"name": "Model", "values": [{"value": "LF01", "price_delta": 0}, {"value": "LF02", "price_delta": 0}, {"value": "LF03", "price_delta": 0}, {"value": "LF04", "price_delta": 0}, {"value": "LF05", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-fiber-tips-pink-tweezers/1.webp"]'::jsonb,222,'https://qeelasee.com/products/fiber-tips-pink-tweezers'),
  ('vetus-tweezers-msa','QL-VETUS-MSA','VETUS Tweezers MSA-18 / MSA-19','Genuine VETUS volume tweezers.','tools',10.54,'[{"name": "Model", "values": [{"value": "MSA-18", "price_delta": 0}, {"value": "MSA-19", "price_delta": 0}]}]'::jsonb,'["/products/vetus-tweezers-msa/1.webp"]'::jsonb,223,'https://qeelasee.com/products/vetus-tweezer-msa-18-msa-19'),
  ('vetus-golden-feather-dolphin-tweezers','QL-VETUS-GF','VETUS Golden Feather / Dolphin Tweezers','Genuine VETUS volume tweezers with anti-static coating.','tools',9.59,'[{"name": "Model", "values": [{"value": "Dolphin", "price_delta": 0}, {"value": "Golden Feather", "price_delta": 0}]}]'::jsonb,'["/products/vetus-golden-feather-dolphin-tweezers/1.webp"]'::jsonb,224,'https://qeelasee.com/products/vetus-golden-feather-and-dolphin-tweezers'),
  ('vetus-tweezers-esd','QL-VETUS-ESD','VETUS Tweezers ESD Series','Black anti-static VETUS tweezers.','tools',7.69,'[{"name": "Model", "values": [{"value": "ESD-11", "price_delta": 0}, {"value": "ESD-12", "price_delta": 0}, {"value": "ESD-15", "price_delta": 0}, {"value": "ESD-17", "price_delta": 0}]}]'::jsonb,'["/products/vetus-tweezers-esd/1.webp"]'::jsonb,225,'https://qeelasee.com/products/vetus-tweezers-esd-11-esd-12-esd-15-esd-17'),
  ('vetus-tweezers-st','QL-VETUS-ST','VETUS Tweezers ST Series','Stainless VETUS tweezers, straight and curved.','tools',7.69,'[{"name": "Model", "values": [{"value": "ST-11", "price_delta": 0}, {"value": "ST-12", "price_delta": 0}, {"value": "ST-15", "price_delta": 0}, {"value": "ST-17", "price_delta": 0}]}]'::jsonb,'["/products/vetus-tweezers-st/1.webp"]'::jsonb,226,'https://qeelasee.com/products/vetus-tweezers-st-11-st-12-st-15-st-17'),
  ('qeelasee-as10-tweezers','QL-TWZ-AS10','AS10 Eyelash Tweezers','Premium lash tweezers.','tools',17.99,'[]'::jsonb,'["/products/qeelasee-as10-tweezers/1.webp"]'::jsonb,227,'https://qeelasee.com/products/as10-eyelash-tweezers'),
  ('qeelasee-as09-volume-tweezers','QL-TWZ-AS09','AS09 Volume Tweezers (3D-6D)','Sharp, perfectly closing tweezers for 3D-6D volume fans. 11.3cm.','tools',9.49,'[]'::jsonb,'["/products/qeelasee-as09-volume-tweezers/1.webp"]'::jsonb,228,'https://qeelasee.com/products/as09-eyelash-tweezer-for-3d-6d-volume-lash'),
  ('qeelasee-micro-brushes','QL-MICRO','Micro Brushes (100pcs)','Disposable micro applicators, 100 per bottle.','tools',5.53,'[{"name": "Colour", "values": [{"value": "Purple", "price_delta": 0}, {"value": "Blue", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-micro-brushes/1.webp"]'::jsonb,229,'https://qeelasee.com/products/eyelash-extension-micro-brushes-disposable-individual-applicators-mascara'),
  ('qeelasee-lip-cleaning-brushes','QL-LIPBR','Cleaning / Lip Brushes (100pcs)','Disposable cleaning brushes, 100 per bag.','tools',8.79,'[{"name": "Colour", "values": [{"value": "Black", "price_delta": 0}, {"value": "Clear", "price_delta": 0}, {"value": "Golden", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-lip-cleaning-brushes/1.webp"]'::jsonb,230,'https://qeelasee.com/products/lip-brushes-cleaning-cosmetic-brush'),
  ('qeelasee-mascara-wands','QL-WAND','Mascara Wands (2 bags, 100pcs)','Disposable lash spoolies.','tools',8.79,'[{"name": "Colour", "values": [{"value": "Black", "price_delta": 0}, {"value": "Pink", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-mascara-wands/1.webp"]'::jsonb,231,'https://qeelasee.com/products/eyelash-brush-mascara'),
  ('qeelasee-lash-check-mirror','QL-MIRROR','Lash Check Mirror (2pcs)','Stainless steel dental mirror for checking lash isolation.','tools',7.87,'[]'::jsonb,'["/products/qeelasee-lash-check-mirror/1.webp"]'::jsonb,232,'https://qeelasee.com/products/stainless-steel-dental-mirror-for-checking-eyelash'),
  ('qeelasee-surgical-tape','QL-TAPE-SURG','Surgical Tape (10 rolls)','Soft tape to hold down lower lashes during application.','tools',11.76,'[]'::jsonb,'["/products/qeelasee-surgical-tape/1.webp"]'::jsonb,233,'https://qeelasee.com/products/surgical-tape-protect-under-eyelash'),
  ('qeelasee-pe-tape','QL-TAPE-PE','Transparent PE Tape (10 rolls)','Breathable, easy-tear transparent tape.','tools',9.07,'[]'::jsonb,'["/products/qeelasee-pe-tape/1.webp"]'::jsonb,234,'https://qeelasee.com/products/transparent-medical-pe-adhesive-tape'),
  ('3m-micropore-tape','QL-TAPE-3M','3M Micropore Tape (10 rolls)','Thin, soft 3M micropore tape.','tools',14.34,'[]'::jsonb,'["/products/3m-micropore-tape/1.webp"]'::jsonb,235,'https://qeelasee.com/products/3m-micropore-surgical-tape'),
  ('qeelasee-glue-rings','QL-RINGS','Glue Holder Rings (100pcs)','Disposable glue rings, 100 per pack.','tools',10.34,'[{"name": "Type", "values": [{"value": "1 Big, divided", "price_delta": 0}, {"value": "2 Big", "price_delta": 0}, {"value": "3 Medium", "price_delta": 0}, {"value": "4 Small", "price_delta": 0}, {"value": "5", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-glue-rings/1.webp"]'::jsonb,236,'https://qeelasee.com/products/glue-holder-ring-for-eyelash-extension-tattoo-pigment'),
  ('qeelasee-mini-air-blower','QL-BLOWER','Mini Air Blower','Silicone hand blower to dry lash glue faster.','tools',4.84,'[{"name": "Colour", "values": [{"value": "Pink", "price_delta": 0}, {"value": "Black", "price_delta": 0}, {"value": "Red", "price_delta": 0}]}]'::jsonb,'["/products/qeelasee-mini-air-blower/1.webp"]'::jsonb,237,'https://qeelasee.com/products/mini-air-blower-for-faster-drying-lash');

insert into public.products (slug, sku, name, description, category_id, supplier_id, options, price_mode, status, moq, sort_order, market_price, now_price, images)
select s.slug, s.sku, s.name, s.description,
       (select id from public.categories where slug = s.category),
       (select id from public.suppliers where lower(name) = 'qeelasee'),
       pg_temp.kes_options(s.options_usd, s.cost_usd), 'formula', 'draft', 10, s.sort, 0, 0,
       (select jsonb_agg(jsonb_build_object('url', u, 'path', null, 'alt', s.name)) from jsonb_array_elements_text(s.images) u)
  from _shop s
on conflict (slug) do nothing;

insert into public.product_costs (product_id, cost_usd)
select p.id, s.cost_usd from _shop s join public.products p on p.slug = s.slug
on conflict (product_id) do nothing;

-- Price the new drafts with the pricing formula (only ones still at 0, so prices you typed are kept).
update public.products p
   set now_price = f.wholesale, retail_price = f.retail, market_price = f.market
  from _shop s
  join public.product_costs c on c.product_id = (select id from public.products where slug = s.slug)
  cross join lateral public.formula_prices(c.cost_usd) f
 where p.slug = s.slug and p.now_price = 0;

-- ===== Section 2 (optional): variations the shop sells that 0019 lacks =====
-- 2a. Mixed-length trays "Mix 8-15mm" (one tray with 8 to 15mm). Adds the value to the Length option, same price.
update public.products p
   set options = (
     select jsonb_agg(case when o->>'name' = 'Length'
                           and not exists (select 1 from jsonb_array_elements(o->'values') v where v->>'value' = 'Mix 8-15mm')
                      then jsonb_set(o, '{values}', (o->'values') || '[{"value":"Mix 8-15mm","price_delta":0}]'::jsonb)
                      else o end order by oo)
       from jsonb_array_elements(p.options) with ordinality as x(o, oo))
 where p.slug in ('qeelasee-volume-lash-0-02-0-03mm','qeelasee-volume-lash-0-05-0-07mm','qeelasee-brown-lash','qeelasee-classic-lash',
                  'qeelasee-l-curl-lash','qeelasee-l-curl-lash-0-03mm','qeelasee-m-curl-lash','qeelasee-m-curl-lash-0-03mm',
                  'qeelasee-ellipse-flat-lash-black','qeelasee-ellipse-flat-lash-brown',
                  'qeelasee-yy-shape-lash-black','qeelasee-yy-shape-lash-dark-brown','qeelasee-yy-shape-lash-light-brown',
                  'qeelasee-easy-fanning-lash','qeelasee-3d-clover-lash-black','qeelasee-4d-w-shape-lash-black',
                  'qeelasee-5d-w-shape-lash-black','qeelasee-w-shape-lash-6d-black','qeelasee-3d-clover-lash-brown',
                  'qeelasee-4d-w-shape-lash-brown','qeelasee-5d-w-shape-lash-brown','qeelasee-w-shape-lash-6d-brown',
                  'qeelasee-spike-3d-w-lash-brown','qeelasee-spikes-lashes','qeelasee-premade-fans-6d-short-stem')
   and jsonb_typeof(p.options) = 'array'
   and exists (select 1 from jsonb_array_elements(p.options) o where o->>'name' = 'Length');

-- 2b. Color Lash: the shop sells it as two-tone ombre trays. Adds a Colour option if the product has none.
update public.products
   set options = options || '[{"name":"Colour","values":[{"value":"Purple + White","price_delta":0},{"value":"Yellow + Blue","price_delta":0},{"value":"Pink + Brown","price_delta":0},{"value":"Blue + Red","price_delta":0}]}]'::jsonb
 where slug = 'qeelasee-color-lash'
   and not exists (select 1 from jsonb_array_elements(options) o where o->>'name' = 'Colour');

-- When reviewed, publish the new products:
--   update public.products set status = 'active' where sku like 'QL-%' and sort_order between 200 and 299;
--   (or activate them one by one in Admin -> Products)
