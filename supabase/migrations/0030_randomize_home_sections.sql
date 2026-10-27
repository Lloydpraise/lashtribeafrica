-- 0030_randomize_home_sections.sql
-- Fills the home page's "Top Selling" and "New In" rows (the home page shows 4 of each) with randomly picked
-- ACTIVE products that have a photo and a price. The two rows never share a product.
-- Existing "kit_strip" tags are kept. Re-running picks a new random set.
-- Run in the Supabase SQL editor after 0029 (so prices are in).

update public.products
   set featured_sections = array_remove(array_remove(featured_sections, 'top_selling'), 'new_in')
 where featured_sections && array['top_selling', 'new_in'];

with picked as (
  select id, row_number() over (order by random()) as n
    from public.products
   where status = 'active'
     and now_price > 0
     and jsonb_typeof(images) = 'array' and jsonb_array_length(images) > 0
   limit 8
)
update public.products p
   set featured_sections = array_append(p.featured_sections, case when picked.n <= 4 then 'top_selling' else 'new_in' end)
  from picked
 where p.id = picked.id;

select featured_sections, name from public.products
 where featured_sections && array['top_selling', 'new_in'] order by featured_sections, name;
