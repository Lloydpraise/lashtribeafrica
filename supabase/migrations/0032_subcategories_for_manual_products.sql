-- 0032_subcategories_for_manual_products.sql
-- Puts the 24 products added by hand in admin (which 0025 didn't know about) into subcategories, gives
-- "Kits & Equipment" its own subcategories, and makes Adhesives & Primers just two subcategories:
-- "Adhesives" and "Primers" (the old glue-by-drying-time subcategories are emptied into them and removed).
-- Safe to re-run. Run after 0025.
-- Only moves a product that still sits directly in a main category, so a subcategory you picked yourself is kept.

insert into public.categories (name, slug, parent_id, sort_order)
select s.name, s.slug, (select id from public.categories where slug = s.parent), s.o
  from (values
    ('Adhesives',             'adhesives',             'adhesives-primers', 1),
    ('Primers',               'primers',               'adhesives-primers', 2),
    ('Lash Serum & Care',     'lash-serum-care',       'aftercare',         3),
    ('Lash Kits',             'lash-kits',             'kits-equipment',    1),
    ('Salon Equipment',       'salon-equipment',       'kits-equipment',    2)
  ) as s(name, slug, parent, o)
 where exists (select 1 from public.categories where slug = s.parent)
on conflict (slug) do nothing;

update public.products p
   set category_id = c.id
  from (values
    ('i-g-tech-glue-5ml',             'adhesives'),
    ('i-g-tech-glue-10ml',            'adhesives'),
    ('fast-drying-infinity-glow-glue','adhesives'),
    ('lash-glue-5ml',                 'adhesives'),
    ('lash-glue-10ml',                'adhesives'),
    ('primer',                        'primers'),
    ('lash-gel-remover-5g',           'glue-removers'),
    ('lash-gel-remover-10g',          'glue-removers'),
    ('lash-shampoo-60ml',             'lash-shampoo-cleansing'),
    ('lash-serum',                    'lash-serum-care'),
    ('eye-mask',                      'lash-serum-care'),
    ('eyepads',                       'eye-pads-tapes'),
    ('eye-patch',                     'eye-pads-tapes'),
    ('lash-tape',                     'eye-pads-tapes'),
    ('lash-brush-spoolies',           'brushes-applicators'),
    ('microbrush',                    'brushes-applicators'),
    ('tweezers',                      'tweezers'),
    ('electric-fan',                  'lash-accessories'),
    ('mirror',                        'lash-accessories'),
    ('full-lash-kit-clear-bag',       'lash-kits'),
    ('i-g-tech-full-kit',             'lash-kits'),
    ('lash-bed',                      'salon-equipment'),
    ('moonlight',                     'salon-equipment'),
    ('makeup-box',                    'salon-equipment')
  ) as x(product, sub)
  join public.categories c on c.slug = x.sub
 where p.slug = x.product
   and (p.category_id is null or p.category_id in (select id from public.categories where parent_id is null));

-- Adhesives & Primers: everything in the old glue subcategories goes to "Adhesives", Primers & Prep to "Primers",
-- then the old subcategories (now empty) are removed. Offers that named them are pointed at the new ones.
update public.products set category_id = (select id from public.categories where slug = 'adhesives')
 where category_id in (select id from public.categories
                        where slug in ('fast-drying-glue', 'slow-drying-glue', 'diy-cluster-glue', 'infinity-glow-uv-glue'));
update public.products set category_id = (select id from public.categories where slug = 'primers')
 where category_id in (select id from public.categories where slug = 'primers-prep');

update public.offers o
   set category_ids = (select array_agg(distinct coalesce(n.id, c)) from unnest(o.category_ids) c
                         left join public.categories old on old.id = c
                         left join public.categories n on n.slug = case
                           when old.slug in ('fast-drying-glue', 'slow-drying-glue', 'diy-cluster-glue', 'infinity-glow-uv-glue') then 'adhesives'
                           when old.slug = 'primers-prep' then 'primers' end)
 where o.category_ids && (select array_agg(id) from public.categories
                           where slug in ('fast-drying-glue', 'slow-drying-glue', 'diy-cluster-glue', 'infinity-glow-uv-glue', 'primers-prep'));

delete from public.categories c
 where c.slug in ('fast-drying-glue', 'slow-drying-glue', 'diy-cluster-glue', 'infinity-glow-uv-glue', 'primers-prep')
   and not exists (select 1 from public.products p where p.category_id = c.id);

-- Anything still without a subcategory (should be none):
select p.status, p.slug, p.name, c.name as category
  from public.products p left join public.categories c on c.id = p.category_id
 where p.status <> 'archived' and (c.id is null or c.parent_id is null)
 order by p.status, p.name;
