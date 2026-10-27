-- 0034_reprice_qeelasee_proposals.sql
-- Reprices the 38 products proposed in 0023 with the NEW formula (0029) and publishes them.
-- Lloyd, 2026-10-26: their supplier cost is the full Qeelasee international shop price (USD), not halved.
--
--   supplier (Ksh) = product_costs.cost_usd x exchange rate (130)
--   wholesale = supplier x 1.30     retail = supplier x 1.70     market = retail + random 30-45%
--   (all read from Site Settings -> Pricing formula when 0029 has been run, otherwise these defaults)
-- Variation surcharges (price_delta, e.g. bigger DIY cluster kits) are scaled by the same factor as the base price.
-- Archived products are not touched. Run once; a re-run draws new random market prices.

drop table if exists _proposal_report;
create temp table _proposal_report (slug text, name text, cost_usd numeric, supplier_ksh numeric,
  old_wholesale numeric, wholesale numeric, retail numeric, market numeric, status_before text, status_after text);

do $$
declare
  s jsonb;
  v_fx numeric; v_wm numeric; v_rm numeric; v_umin numeric; v_umax numeric; v_step numeric;
  r record;
  v_kes numeric; v_w numeric; v_r numeric; v_m numeric; v_scale numeric; v_opts jsonb;
  slugs text[] := array['qeelasee-luxury-comic-spire-lashes','qeelasee-heart-star-comic-spire-lashes','qeelasee-wings-anime-lashes','qeelasee-fairy-anime-lashes','qeelasee-spire-anime-lashes','qeelasee-diy-cluster-lash-120-200','qeelasee-diy-cluster-lash-240-30d-40d','qeelasee-diy-cluster-lash-50d-100d','qeelasee-lower-flat-bottom-lashes','qeelasee-bottom-volume-lashes','qeelasee-ultra-glue-0506','qeelasee-strong-glue-0505','qeelasee-mild-glue-0507','qeelasee-yy-w-glue-0607','qeelasee-expert-glue-0606','qeelasee-super-glue-0608','qeelasee-fast-volume-glue','qeelasee-fast-drying-glue-05s','qeelasee-protein-remover','qeelasee-glue-primer','qeelasee-clear-gel-remover','qeelasee-remover-brush-pen','qeelasee-fiber-tips-pink-tweezers','vetus-tweezers-msa','vetus-golden-feather-dolphin-tweezers','vetus-tweezers-esd','vetus-tweezers-st','qeelasee-as10-tweezers','qeelasee-as09-volume-tweezers','qeelasee-micro-brushes','qeelasee-lip-cleaning-brushes','qeelasee-mascara-wands','qeelasee-lash-check-mirror','qeelasee-surgical-tape','qeelasee-pe-tape','3m-micropore-tape','qeelasee-glue-rings','qeelasee-mini-air-blower'];
begin
  select to_jsonb(p) into s from public.pricing_settings p where id = 1;
  v_fx   := coalesce((s->>'fx_rate_kes_per_usd')::numeric, 130);
  v_wm   := coalesce((s->>'wholesale_multiplier')::numeric, 1.30);
  v_rm   := coalesce((s->>'retail_multiplier')::numeric, 1.70);
  v_umin := coalesce((s->>'market_uplift_min_pct')::numeric, 30);
  v_umax := coalesce((s->>'market_uplift_max_pct')::numeric, 45);
  v_step := greatest(1, coalesce((s->>'rounding_step')::numeric, 10));

  for r in
    select p.id, p.slug, p.name, p.status, p.now_price, p.options, c.cost_usd
      from public.products p
      join public.product_costs c on c.product_id = p.id
     where p.slug = any (slugs) and p.status <> 'archived' and coalesce(c.cost_usd, 0) > 0
  loop
    v_kes := r.cost_usd * v_fx;
    v_w := round(v_kes * v_wm / v_step) * v_step;
    v_r := round(v_kes * v_rm / v_step) * v_step;
    v_m := round(v_r * (1 + (v_umin + random() * (v_umax - v_umin)) / 100) / v_step) * v_step;

    -- scale any non-zero variation surcharge by new wholesale / old wholesale
    v_opts := r.options;
    if coalesce(r.now_price, 0) > 0 and jsonb_typeof(r.options) = 'array' then
      v_scale := v_w / r.now_price;
      select coalesce(jsonb_agg(
               case when jsonb_typeof(o->'values') = 'array' then jsonb_set(o, '{values}', (
                 select jsonb_agg(case when coalesce((v->>'price_delta')::numeric, 0) <> 0
                                       then jsonb_set(v, '{price_delta}', to_jsonb(round((v->>'price_delta')::numeric * v_scale / v_step) * v_step))
                                       else v end order by vo)
                   from jsonb_array_elements(o->'values') with ordinality as x(v, vo)))
               else o end order by oo), '[]'::jsonb)
        into v_opts
        from jsonb_array_elements(r.options) with ordinality as y(o, oo);
    end if;

    update public.products
       set now_price = v_w, retail_price = v_r, market_price = v_m, price_mode = 'formula',
           options = v_opts, status = 'active'
     where id = r.id;

    insert into _proposal_report values (r.slug, r.name, r.cost_usd, round(v_kes), r.now_price, v_w, v_r, v_m, r.status, 'active');
  end loop;
end $$;

select slug, name, cost_usd, supplier_ksh, old_wholesale, wholesale, retail, market, status_before, status_after
  from _proposal_report
 order by slug;
