-- 0025_category_tree.sql
-- Categories get subcategories (categories.parent_id) and an order (categories.sort_order), and the catalog
-- is sorted into a tree that is easy to browse:
--
--   Lash Extensions          Classic · Volume · YY & W Shape · Easy Fan · Flat (Ellipse) · L & M Curl ·
--                            Coloured & Brown · Spikes & Specialty · Bottom Lashes
--   Premade Fans & Clusters  Premade Volume Fans · DIY Clusters · Anime & Comic Lashes
--   Adhesives & Primers      Fast-Drying Glue (0.1-1s) · Medium & Slow-Drying Glue (1-4s) · DIY & Cluster Glue ·
--                            Primers & Prep
--   Removers & Aftercare     Glue Removers · Lash Shampoo & Cleansing
--   Tools                    Tweezers · Eye Pads & Tapes · Brushes & Applicators · Accessories
--
-- A product's category_id points at its subcategory. The shop groups products by main category, then by
-- subcategory. An offer on a main category also covers the products in its subcategories.
--
-- Run AFTER 0019 (and after 0023 if you ran it). Safe to re-run, and works without 0018. The script only
-- moves products that sit in a main category or in no category, so anything you put in a category
-- yourself stays where it is. Products from 0023 are placed too if they exist.

alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete set null;
alter table public.categories add column if not exists sort_order integer not null default 0;
create index if not exists categories_parent_id_idx on public.categories(parent_id);

-- a category can't be its own parent
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_not_own_parent') then
    alter table public.categories add constraint categories_not_own_parent check (parent_id is null or parent_id <> id);
  end if;
end $$;

-- main categories
insert into public.categories (name, slug) values
  ('Lash Extensions','lash-extensions'),('Premade Fans & Clusters','premade-fans'),
  ('Adhesives & Primers','adhesives-primers'),('Aftercare','aftercare'),('Tools','tools')
on conflict (slug) do nothing;
update public.categories set name = 'Removers & Aftercare' where slug = 'aftercare' and name = 'Aftercare';
update public.categories set sort_order = s.o
  from (values ('lash-extensions',10),('premade-fans',20),('adhesives-primers',30),('aftercare',40),('tools',50)) as s(slug, o)
 where categories.slug = s.slug;

-- subcategories (slug, name, parent slug, order)
create temp table _subs (slug text, name text, parent text, o int) on commit drop;
insert into _subs values
  ('classic-lashes','Classic Lashes','lash-extensions',1),
  ('volume-lashes','Volume Lashes','lash-extensions',2),
  ('yy-w-shape-lashes','YY & W Shape Lashes','lash-extensions',3),
  ('easy-fan-lashes','Easy Fan Lashes','lash-extensions',4),
  ('flat-ellipse-lashes','Flat (Ellipse) Lashes','lash-extensions',5),
  ('l-m-curl-lashes','L & M Curl Lashes','lash-extensions',6),
  ('coloured-brown-lashes','Coloured & Brown Lashes','lash-extensions',7),
  ('spikes-specialty-lashes','Spikes & Specialty Lashes','lash-extensions',8),
  ('bottom-lashes','Bottom Lashes','lash-extensions',9),
  ('premade-volume-fans','Premade Volume Fans','premade-fans',1),
  ('diy-clusters','DIY Clusters','premade-fans',2),
  ('anime-comic-lashes','Anime & Comic Lashes','premade-fans',3),
  ('fast-drying-glue','Fast-Drying Glue (0.1-1s)','adhesives-primers',1),
  ('slow-drying-glue','Medium & Slow-Drying Glue (1-4s)','adhesives-primers',2),
  ('diy-cluster-glue','DIY & Cluster Glue','adhesives-primers',3),
  ('primers-prep','Primers & Prep','adhesives-primers',4),
  ('glue-removers','Glue Removers','aftercare',1),
  ('lash-shampoo-cleansing','Lash Shampoo & Cleansing','aftercare',2),
  ('tweezers','Tweezers','tools',1),
  ('eye-pads-tapes','Eye Pads & Tapes','tools',2),
  ('brushes-applicators','Brushes & Applicators','tools',3),
  ('lash-accessories','Accessories','tools',4);

insert into public.categories (name, slug, parent_id, sort_order)
select s.name, s.slug, (select id from public.categories where slug = s.parent), s.o from _subs s
on conflict (slug) do nothing;

-- product -> subcategory
create temp table _place (product text, sub text) on commit drop;
insert into _place values
  ('qeelasee-classic-lash','classic-lashes'),
  ('qeelasee-volume-lash-0-02-0-03mm','volume-lashes'),('qeelasee-volume-lash-0-05-0-07mm','volume-lashes'),
  ('qeelasee-yy-shape-lash-black','yy-w-shape-lashes'),('qeelasee-yy-shape-lash-dark-brown','yy-w-shape-lashes'),
  ('qeelasee-yy-shape-lash-light-brown','yy-w-shape-lashes'),('qeelasee-3d-clover-lash-black','yy-w-shape-lashes'),
  ('qeelasee-4d-w-shape-lash-black','yy-w-shape-lashes'),('qeelasee-5d-w-shape-lash-black','yy-w-shape-lashes'),
  ('qeelasee-w-shape-lash-6d-black','yy-w-shape-lashes'),('qeelasee-3d-clover-lash-brown','yy-w-shape-lashes'),
  ('qeelasee-4d-w-shape-lash-brown','yy-w-shape-lashes'),('qeelasee-5d-w-shape-lash-brown','yy-w-shape-lashes'),
  ('qeelasee-w-shape-lash-6d-brown','yy-w-shape-lashes'),('qeelasee-spike-3d-w-lash-brown','yy-w-shape-lashes'),
  ('fadvan-8d-w-shape-lash','yy-w-shape-lashes'),
  ('qeelasee-easy-fanning-lash','easy-fan-lashes'),
  ('qeelasee-ellipse-flat-lash-black','flat-ellipse-lashes'),('qeelasee-ellipse-flat-lash-brown','flat-ellipse-lashes'),
  ('qeelasee-l-curl-lash','l-m-curl-lashes'),('qeelasee-l-curl-lash-0-03mm','l-m-curl-lashes'),
  ('qeelasee-m-curl-lash','l-m-curl-lashes'),('qeelasee-m-curl-lash-0-03mm','l-m-curl-lashes'),
  ('qeelasee-brown-lash','coloured-brown-lashes'),('qeelasee-color-lash','coloured-brown-lashes'),('qeelasee-rainbow-lash','coloured-brown-lashes'),
  ('qeelasee-spikes-lashes','spikes-specialty-lashes'),('qeelasee-camellia-lash','spikes-specialty-lashes'),
  ('qeelasee-lower-flat-bottom-lashes','bottom-lashes'),('qeelasee-bottom-volume-lashes','bottom-lashes'),
  ('qeelasee-premade-fans-6d-short-stem','premade-volume-fans'),('fadvan-ventilador-premade-fans-3d-20d','premade-volume-fans'),
  ('0-07-volume-fans-mixed-tray','premade-volume-fans'),('mega-volume-fans-0-05','premade-volume-fans'),
  ('fadvan-diy-cluster-lashes','diy-clusters'),('qeelasee-diy-cluster-lash-120-200','diy-clusters'),
  ('qeelasee-diy-cluster-lash-240-30d-40d','diy-clusters'),('qeelasee-diy-cluster-lash-50d-100d','diy-clusters'),
  ('qeelasee-luxury-comic-spire-lashes','anime-comic-lashes'),('qeelasee-heart-star-comic-spire-lashes','anime-comic-lashes'),
  ('qeelasee-wings-anime-lashes','anime-comic-lashes'),('qeelasee-fairy-anime-lashes','anime-comic-lashes'),('qeelasee-spire-anime-lashes','anime-comic-lashes'),
  -- glue by drying time (what lash techs pick by): <=1s for experienced artists, 1-4s for beginners / sensitive clients
  ('fadvan-sky-glue','fast-drying-glue'),('qeelasee-ultra-glue-0506','fast-drying-glue'),('qeelasee-strong-glue-0505','fast-drying-glue'),
  ('qeelasee-mild-glue-0507','fast-drying-glue'),('qeelasee-yy-w-glue-0607','fast-drying-glue'),('qeelasee-expert-glue-0606','fast-drying-glue'),
  ('qeelasee-super-glue-0608','fast-drying-glue'),('qeelasee-fast-volume-glue','fast-drying-glue'),('qeelasee-fast-drying-glue-05s','fast-drying-glue'),
  ('fadvan-fast-drying-black-glue','slow-drying-glue'),('fadvan-eyelash-extension-glue-a-01-10ml','slow-drying-glue'),('pro-bond-adhesive-5ml','slow-drying-glue'),
  ('fadvan-diy-lash-glue-wand','diy-cluster-glue'),
  ('qeelasee-protein-remover','primers-prep'),('qeelasee-glue-primer','primers-prep'),('low-fume-primer-10ml','primers-prep'),
  ('fadvan-lash-gel-remover-5g','glue-removers'),('qeelasee-clear-gel-remover','glue-removers'),('qeelasee-remover-brush-pen','glue-removers'),
  ('fadvan-lash-cleaning-shampoo-60ml','lash-shampoo-cleansing'),
  ('fadvan-fadvan-eyelash-tweezers','tweezers'),('isolation-tweezers-curved','tweezers'),('qeelasee-fiber-tips-pink-tweezers','tweezers'),
  ('vetus-tweezers-msa','tweezers'),('vetus-golden-feather-dolphin-tweezers','tweezers'),('vetus-tweezers-esd','tweezers'),
  ('vetus-tweezers-st','tweezers'),('qeelasee-as10-tweezers','tweezers'),('qeelasee-as09-volume-tweezers','tweezers'),
  ('under-eye-gel-patches-bulk','eye-pads-tapes'),('qeelasee-surgical-tape','eye-pads-tapes'),('qeelasee-pe-tape','eye-pads-tapes'),('3m-micropore-tape','eye-pads-tapes'),
  ('qeelasee-micro-brushes','brushes-applicators'),('qeelasee-lip-cleaning-brushes','brushes-applicators'),('qeelasee-mascara-wands','brushes-applicators'),
  ('qeelasee-glue-rings','lash-accessories'),('qeelasee-mini-air-blower','lash-accessories'),('qeelasee-lash-check-mirror','lash-accessories');

-- Only moves products that have no category, or sit in a main category / the old 0003 "Lash Fans" category.
update public.products p
   set category_id = c.id
  from _place x
  join public.categories c on c.slug = x.sub
 where p.slug = x.product
   and (p.category_id is null
        or p.category_id in (select id from public.categories
                              where slug in ('lash-extensions','premade-fans','adhesives-primers','aftercare','tools','lash-fans')));

-- The old 0003 "Lash Fans" category becomes a subcategory of Premade Fans & Clusters (it may now be empty;
-- delete it in Admin -> Products -> Categories if you don't need it).
update public.categories set parent_id = (select id from public.categories where slug = 'premade-fans'), sort_order = 9
 where slug = 'lash-fans' and parent_id is null;

-- Offers on a main category also apply to its subcategories (same function as 0016, one extra line).
create or replace function public._offer_pct(p public.products)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(o.value), 0)
  from public.offers o
  where o.is_active and o.type = 'percentage_off'
    and (o.starts_at is null or o.starts_at <= now())
    and (o.ends_at is null or o.ends_at >= now())
    and (o.scope = 'all'
         or (o.scope = 'products' and p.id = any (o.product_ids))
         or (o.scope = 'categories' and p.category_id is not null
             and (p.category_id = any (o.category_ids)
                  or (select c.parent_id from public.categories c where c.id = p.category_id) = any (o.category_ids))));
$$;
revoke all on function public._offer_pct(public.products) from public, anon, authenticated;

-- Check:
-- select coalesce(m.name, c.name) as main, case when m.id is null then '' else c.name end as sub, count(p.id)
--   from public.categories c left join public.categories m on m.id = c.parent_id left join public.products p on p.category_id = c.id
--  group by 1, 2, m.sort_order, c.sort_order order by m.sort_order nulls first, c.sort_order;
