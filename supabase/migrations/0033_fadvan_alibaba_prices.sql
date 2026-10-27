-- 0033_fadvan_alibaba_prices.sql
-- Supplier (base) prices for the Fadvan products, taken from Qingdao Fadvan Cosmetics' Alibaba listings
-- (https://fadvanhair.en.alibaba.com). The price used is the SMALLEST-ORDER tier (the highest per-unit price),
-- because we buy small quantities. Prices were read on 2026-10-26 from public Alibaba listings; check them
-- against your Alibaba account before a big order and change any of them in Admin -> Products.
--
-- What it does, per product below:
--   * saves the USD price in product_costs.cost_usd (private, admin only)
--   * applies the price formula: wholesale = supplier x 1.30, retail = x 1.70, market = retail + random 30-45%
--     (multipliers come from Site Settings -> Pricing formula when 0029 has been run, otherwise 1.30 / 1.70)
--   * sets price_mode = 'formula' and, when "activate" is true, publishes the product (status = active)
-- Products with no Alibaba price (Sky Glue, DIY Lash Glue wand, Eyelash Tweezers) are NOT touched.
--
-- Run after 0016 (and ideally 0029). Safe to re-run, but each run draws a new random market price.

drop table if exists _fadvan_prices;
create temp table _fadvan_prices (slug text primary key, cost_usd numeric, activate boolean, source text);
insert into _fadvan_prices values
  -- black fast-drying glue, 5ml/10ml, 0.5-3s: $9.52 for 2-49 pcs ($8.06 at 500+)
  ('fadvan-fast-drying-black-glue',          9.52, true,  'alibaba.com/product-detail/_1600137107635.html'),
  -- custom 0.5 / 1 second lash glue: $4.50-5.90, top of range used
  ('fadvan-eyelash-extension-glue-a-01-10ml', 5.90, true,  'alibaba.com/product-detail/_62413481356.html'),
  -- lash glue remover: $7.04 for 2-199 pcs ($2.99 at 1000+)
  ('fadvan-lash-gel-remover-5g',             7.04, true,  'alibaba.com/product-detail/_1600166318957.html'),
  -- 12-line premade fans 3D-20D: $5.19 per tray for 2-99 trays ($4.89 at 1000+)
  ('fadvan-ventilador-premade-fans-3d-20d',  5.19, true,  'alibaba.com/product-detail/_1600140029220.html'),
  -- 0.07 W shape lash tray: $1.75-2.10, top of range used. Supplier MOQ 20 (> our limit of 10), so it stays draft
  ('fadvan-8d-w-shape-lash',                 2.10, false, 'alibaba.com/product-detail/_1601102522204.html'),
  -- DIY lash kit 20D-40D segments: $1.39-1.89, top of range used
  ('fadvan-diy-cluster-lashes',              1.89, true,  'fadvanhair.en.alibaba.com store page'),
  -- 60ml foam lash shampoo: listing shows $0.40-0.99 but also $5.94; NOT sure it is Fadvan's, so left as draft
  ('fadvan-lash-cleaning-shampoo-60ml',      0.99, false, 'alibaba.com/product-detail/_1601754556677.html (unconfirmed)');

drop table if exists _fadvan_report;
create temp table _fadvan_report (slug text, name text, cost_usd numeric, supplier_ksh numeric,
  wholesale numeric, retail numeric, market numeric, status_after text, note text);

do $$
declare
  s jsonb;
  v_fx numeric; v_wm numeric; v_rm numeric; v_umin numeric; v_umax numeric; v_step numeric;
  r record;
  v_kes numeric; v_w numeric; v_r numeric; v_m numeric;
begin
  -- read settings as json so this works whether or not 0029's columns exist
  select to_jsonb(p) into s from public.pricing_settings p where id = 1;
  v_fx   := coalesce((s->>'fx_rate_kes_per_usd')::numeric, 130);
  v_wm   := coalesce((s->>'wholesale_multiplier')::numeric, 1.30);
  v_rm   := coalesce((s->>'retail_multiplier')::numeric, 1.70);
  v_umin := coalesce((s->>'market_uplift_min_pct')::numeric, 30);
  v_umax := coalesce((s->>'market_uplift_max_pct')::numeric, 45);
  v_step := greatest(1, coalesce((s->>'rounding_step')::numeric, 10));

  for r in
    select p.id, p.slug, p.name, p.status, f.cost_usd, f.activate
      from _fadvan_prices f
      join public.products p on p.slug = f.slug
     where p.status <> 'archived'
  loop
    insert into public.product_costs (product_id, cost_usd)
    values (r.id, r.cost_usd)
    on conflict (product_id) do update set cost_usd = excluded.cost_usd;

    v_kes := r.cost_usd * v_fx;
    v_w := round(v_kes * v_wm / v_step) * v_step;
    v_r := round(v_kes * v_rm / v_step) * v_step;
    v_m := round(v_r * (1 + (v_umin + random() * (v_umax - v_umin)) / 100) / v_step) * v_step;

    update public.products
       set now_price = v_w, retail_price = v_r, market_price = v_m, price_mode = 'formula',
           status = case when r.activate then 'active' else status end
     where id = r.id;

    insert into _fadvan_report values (r.slug, r.name, r.cost_usd, round(v_kes), v_w, v_r, v_m,
      case when r.activate then 'active' else r.status end,
      case when r.activate then null else 'left as draft (see the comment above)' end);
  end loop;
end $$;

-- What happened (shown in the SQL editor's result grid). Missing slugs = product not in the database.
select f.slug, r.name, f.cost_usd, r.supplier_ksh, r.wholesale, r.retail, r.market, r.status_after,
       coalesce(r.note, case when r.slug is null then 'NOT FOUND in products' end) as note, f.source
  from _fadvan_prices f
  left join _fadvan_report r on r.slug = f.slug
 order by f.slug;
