-- 0029_pricing_shipping_formula.sql
-- New price formula + weight-based shipping.
--
-- Run AFTER 0016 (0018 is not needed). Safe to re-run EXCEPT the repricing in section 6, which draws new random
-- market prices every time it runs (see the note there).
--
--   Wholesale = supplier price x 1.30         Retail = supplier price x 1.70
--   Market (crossed-out "was" price) = retail x a random 30-45% uplift, different for every product
--   Shipping  = weight (kg) x Ksh 1,700 per kg = the cost of getting the goods to our offices.
--               It is added to the order total at checkout, computed in the database (place_order / cart_quote).
--
-- Every number above lives in Site Settings -> Pricing formula (table pricing_settings).
--
--   1. pricing_settings: multipliers, shipping rate, market uplift range
--   2. products.weight_kg, and a per-variation weight (options[].values[].weight_kg)
--   3. formula_prices() uses the new formula
--   4. shipping helpers
--   5. place_order() and cart_quote() add the shipping
--   6. data: reprice products that have a supplier price, fill missing prices on the rest, activate

-- ---------------------------------------------------------------------
-- 1. settings
-- ---------------------------------------------------------------------
alter table public.pricing_settings add column if not exists wholesale_multiplier numeric(6,3) not null default 1.30 check (wholesale_multiplier > 0);
alter table public.pricing_settings add column if not exists retail_multiplier numeric(6,3) not null default 1.70 check (retail_multiplier > 0);
alter table public.pricing_settings add column if not exists shipping_rate_per_kg numeric(10,2) not null default 1700 check (shipping_rate_per_kg >= 0);
alter table public.pricing_settings add column if not exists market_uplift_min_pct numeric(6,2) not null default 30 check (market_uplift_min_pct >= 0);
alter table public.pricing_settings add column if not exists market_uplift_max_pct numeric(6,2) not null default 45 check (market_uplift_max_pct >= 0);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pricing_settings_uplift_range') then
    alter table public.pricing_settings add constraint pricing_settings_uplift_range
      check (market_uplift_min_pct <= market_uplift_max_pct);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. weights (estimates are fine). A variation's weight, when filled in, replaces the product's weight.
-- ---------------------------------------------------------------------
alter table public.products add column if not exists weight_kg numeric(8,3) not null default 0 check (weight_kg >= 0);

-- same as 0016, plus: a value's weight_kg (when present) must be a number >= 0
create or replace function public._valid_product_options(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  o jsonb; v jsonb;
  names text[] := '{}';
  vals text[];
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 6 then return false; end if;
  for o in select * from jsonb_array_elements(p) loop
    if jsonb_typeof(o) <> 'object' or coalesce(btrim(o->>'name'), '') = '' then return false; end if;
    if lower(btrim(o->>'name')) = any (names) then return false; end if;
    names := names || lower(btrim(o->>'name'));
    if jsonb_typeof(o->'values') <> 'array' or jsonb_array_length(o->'values') = 0
       or jsonb_array_length(o->'values') > 100 then return false; end if;
    vals := '{}';
    for v in select * from jsonb_array_elements(o->'values') loop
      if jsonb_typeof(v) <> 'object' or coalesce(btrim(v->>'value'), '') = '' then return false; end if;
      if lower(btrim(v->>'value')) = any (vals) then return false; end if;
      vals := vals || lower(btrim(v->>'value'));
      if v ? 'price_delta' and jsonb_typeof(v->'price_delta') <> 'number' then return false; end if;
      if v ? 'weight_kg' and (jsonb_typeof(v->'weight_kg') <> 'number' or (v->>'weight_kg')::numeric < 0) then return false; end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. the formula
--    supplier price (KES) = cost in USD x exchange rate
--    wholesale = supplier x wholesale multiplier        retail = supplier x retail multiplier
--    market    = retail x (1 + a random % between the min and max uplift)
--    each rounded to the rounding step. Volatile on purpose: every call draws its own random uplift.
-- ---------------------------------------------------------------------
create or replace function public.formula_prices(p_cost_usd numeric)
returns table (wholesale numeric, retail numeric, market numeric)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s public.pricing_settings%rowtype;
  v_kes numeric; v_w numeric; v_r numeric; v_m numeric; v_up numeric;
begin
  select * into s from public.pricing_settings where id = 1;
  v_kes := p_cost_usd * s.fx_rate_kes_per_usd;
  v_w := round(v_kes * s.wholesale_multiplier / s.rounding_step) * s.rounding_step;
  v_r := round(v_kes * s.retail_multiplier / s.rounding_step) * s.rounding_step;
  v_up := s.market_uplift_min_pct + random() * (s.market_uplift_max_pct - s.market_uplift_min_pct);
  v_m := round(v_r * (1 + v_up / 100) / s.rounding_step) * s.rounding_step;
  return query select v_w, v_r, v_m;
end;
$$;
revoke all on function public.formula_prices(numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. shipping helpers (not callable from the API)
-- ---------------------------------------------------------------------
create or replace function public._shipping_rate()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select shipping_rate_per_kg from public.pricing_settings where id = 1), 1700);
$$;
revoke all on function public._shipping_rate() from public, anon, authenticated;

-- Weight of ONE unit of a line: the product's weight, or (when a chosen variation has its own weight_kg)
-- the heaviest of the chosen variations' weights. p_opts is the normalised choice, e.g. {"Size":"10ml"}.
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
    p.weight_kg, 0);
$$;
revoke all on function public._line_weight(public.products, jsonb) from public, anon, authenticated;

-- total weight -> shipping fee, rounded up to a whole shilling
create or replace function public._shipping_fee(p_weight numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select ceil(greatest(0, coalesce(p_weight, 0)) * public._shipping_rate());
$$;
revoke all on function public._shipping_fee(numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5a. cart_quote: as 0016, plus weight_kg on each line and shipping_fee / shipping_rate / total_weight_kg
-- ---------------------------------------------------------------------
create or replace function public.cart_quote(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_key text;
  v_id uuid;
  v_qty integer;
  v_prod public.products%rowtype;
  v_pr record;
  v_pct numeric;
  v_ok boolean;
  v_w numeric; v_r numeric; v_unit numeric;
  v_unit_weight numeric;
  v_weight numeric := 0;
  v_lines jsonb := '[]'::jsonb;
  v_fs jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('lines', '[]'::jsonb, 'free_shipping', null,
                              'shipping_fee', 0, 'shipping_rate', public._shipping_rate(), 'total_weight_kg', 0);
  end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Too many items in the cart'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_key := v_item->>'key';
    v_id := null;
    v_qty := 1;
    begin v_id := nullif(v_item->>'id', '')::uuid; exception when others then v_id := null; end;
    begin v_qty := least(100000, greatest(1, coalesce(nullif(v_item->>'qty', '')::integer, 1))); exception when others then v_qty := 1; end;

    v_prod := null;
    if v_id is not null then
      select * into v_prod from public.products where id = v_id and status = 'active';
    end if;
    if v_id is null or v_prod.id is null then
      v_lines := v_lines || jsonb_build_array(jsonb_build_object('key', v_key, 'missing', true));
      continue;
    end if;

    v_pct := public._offer_pct(v_prod);
    v_ok := true;
    begin
      select * into v_pr from public._line_pricing(v_prod, v_item->'options', v_qty);
    exception when others then
      v_ok := false;
    end;

    if not v_ok then
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'key', v_key, 'id', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
        'image', v_prod.images->0->>'url',
        'icon', case when v_prod.images->0->>'url' is null then v_prod.icon else null end,
        'moq', coalesce(v_prod.moq, 1), 'qty', v_qty, 'needs_options', true));
      continue;
    end if;

    v_w := greatest(0, round(v_pr.wholesale * (1 - v_pct / 100)));
    v_r := greatest(0, round(v_pr.retail * (1 - v_pct / 100)));
    v_unit := case when v_pr.tier = 'wholesale' then v_w else v_r end;
    v_unit_weight := public._line_weight(v_prod, v_pr.opts);
    v_weight := v_weight + v_unit_weight * v_qty;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'key', v_key, 'id', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
      'image', v_prod.images->0->>'url',
      'icon', case when v_prod.images->0->>'url' is null then v_prod.icon else null end,
      'moq', coalesce(v_prod.moq, 1), 'qty', v_qty,
      'options', v_pr.opts, 'tier', v_pr.tier, 'offer_pct', v_pct,
      'wholesale', v_w, 'retail', v_r, 'market', v_pr.market, 'unit', v_unit,
      'weight_kg', v_unit_weight,
      'line_total', v_unit * v_qty,
      'line_market', case when v_pr.market > 0 then greatest(v_pr.market, v_unit) else v_unit end * v_qty));
  end loop;

  -- kept for older pages; shipping is now charged by weight whatever the cart value
  select jsonb_build_object(
           'min_order_value', o.min_order_value,
           'badge_text', coalesce(nullif(o.badge_text, ''), 'FREE SHIPPING'),
           'label', o.label)
    into v_fs
    from public.offers o
   where o.is_active and o.type = 'free_shipping'
     and (o.starts_at is null or o.starts_at <= now())
     and (o.ends_at is null or o.ends_at >= now())
   order by o.created_at desc
   limit 1;

  return jsonb_build_object(
    'lines', v_lines, 'free_shipping', v_fs,
    'shipping_fee', public._shipping_fee(v_weight),
    'shipping_rate', public._shipping_rate(),
    'total_weight_kg', round(v_weight, 3));
end;
$$;
grant execute on function public.cart_quote(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5b. place_order: as 0016, plus the shipping fee (product weight x rate) added to the order total.
--     The fee is computed here from the database's own weights and rate, never from the page.
--     Course-only orders have no weight, so no shipping. Pesapal charges orders.total, which now includes it.
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_customer jsonb,
  p_items jsonb,
  p_notes text default null,
  p_payment_method text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_customer uuid;
  v_order uuid;
  v_order_no text;
  v_item jsonb;
  v_type text;
  v_id uuid;
  v_qty integer;
  v_pct numeric;
  v_prod public.products%rowtype;
  v_pr record;
  v_course public.courses%rowtype;
  v_bundle public.course_bundles%rowtype;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_weight numeric := 0;
  v_shipping numeric := 0;
  v_has_product boolean := false;
  v_has_course boolean := false;
  v_name text := btrim(coalesce(p_customer->>'full_name', ''));
  v_email text := nullif(btrim(coalesce(p_customer->>'email', '')), '');
  v_phone text := public.normalize_phone(p_customer->>'phone');
  v_area text := nullif(btrim(coalesce(p_customer->>'delivery_area', '')), '');
  v_total numeric;
  v_batch uuid;
  v_ship date;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many items in one order';
  end if;
  if v_name = '' then raise exception 'Please enter your full name'; end if;
  if v_phone is null and v_email is null then
    raise exception 'Please enter a phone number or email so we can reach you';
  end if;

  -- any course/bundle needs a login
  if exists (select 1 from jsonb_array_elements(p_items) i where i->>'type' in ('course', 'bundle')) and v_uid is null then
    raise exception 'Please sign in or create a profile to buy a course';
  end if;

  v_customer := public._upsert_customer(
    v_name, v_email, v_phone, v_area, v_uid, coalesce((p_customer->>'marketing_opt_in')::boolean, false)
  );

  insert into public.orders (customer_id, kind, payment_method, delivery_area, delivery_notes)
  values (v_customer, 'product', p_payment_method, v_area, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id, order_no into v_order, v_order_no;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_type := v_item->>'type';
    v_id := nullif(v_item->>'id', '')::uuid;
    v_qty := least(100000, greatest(1, coalesce((v_item->>'qty')::integer, 1)));

    if v_type = 'product' then
      select * into v_prod from public.products where id = v_id and status = 'active';
      if not found then raise exception 'One of the products in your cart is no longer available'; end if;

      -- tier + options (raises a readable message when a required option is missing)
      select * into v_pr from public._line_pricing(v_prod, v_item->'options', v_qty);
      v_pct := public._offer_pct(v_prod);
      v_unit := greatest(0, round(v_pr.list_price * (1 - v_pct / 100)));

      insert into public.order_items
        (order_id, item_type, product_id, name, unit_price, market_price, quantity, line_total, selected_options, price_tier)
      values
        (v_order, 'product', v_prod.id, v_prod.name, v_unit,
         nullif(v_pr.market, 0), v_qty, v_unit * v_qty,
         nullif(v_pr.opts, '{}'::jsonb), v_pr.tier);
      v_subtotal := v_subtotal + v_pr.list_price * v_qty;
      v_discount := v_discount + (v_pr.list_price - v_unit) * v_qty;
      v_weight := v_weight + public._line_weight(v_prod, v_pr.opts) * v_qty;
      v_has_product := true;

    elsif v_type = 'course' then
      select * into v_course from public.courses where id = v_id and status = 'published';
      if not found then raise exception 'That course is not available'; end if;
      if v_course.is_free then raise exception '% is free: open it from the Academy', v_course.title; end if;
      if exists (select 1 from public.enrollments e where e.user_id = v_uid and e.course_id = v_course.id) then
        raise exception 'You already own %', v_course.title;
      end if;
      insert into public.order_items (order_id, item_type, course_id, name, unit_price, market_price, quantity, line_total)
      values (v_order, 'course', v_course.id, v_course.title, v_course.price, v_course.compare_price, 1, v_course.price);
      v_subtotal := v_subtotal + v_course.price;
      v_has_course := true;

    elsif v_type = 'bundle' then
      select * into v_bundle from public.course_bundles where id = v_id and status = 'published';
      if not found then raise exception 'That bundle is not available'; end if;
      insert into public.order_items (order_id, item_type, bundle_id, name, unit_price, market_price, quantity, line_total)
      values (v_order, 'bundle', v_bundle.id, v_bundle.title, v_bundle.price, v_bundle.compare_price, 1, v_bundle.price);
      v_subtotal := v_subtotal + v_bundle.price;
      v_has_course := true;

    else
      raise exception 'Unknown item type';
    end if;
  end loop;

  if v_has_product then
    v_shipping := public._shipping_fee(v_weight);
  end if;
  v_total := v_subtotal - v_discount + v_shipping;

  -- Preorder batching: product orders join the first open batch that is more than
  -- the cutoff (default 7 days) away. Course-only orders have no shipment.
  if v_has_product then
    select b.id, b.ship_date into v_batch, v_ship from public.next_open_batch() b;
  end if;

  update public.orders set
    subtotal = v_subtotal,
    discount = v_discount,
    shipping_fee = v_shipping,
    total = v_total,
    batch_id = v_batch,
    kind = case when v_has_product and v_has_course then 'mixed' when v_has_course then 'course' else 'product' end
  where id = v_order;

  return jsonb_build_object(
    'order_id', v_order, 'order_no', v_order_no, 'customer_id', v_customer,
    'subtotal', v_subtotal, 'discount', v_discount, 'shipping_fee', v_shipping,
    'total', v_total, 'status', 'pending',
    'batch_id', v_batch, 'ship_date', v_ship
  );
end;
$$;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. DATA: apply the new prices.
--    A. Products with a supplier price (product_costs.cost_usd, or cost_kes when there is no USD cost):
--         wholesale = supplier x 1.30, retail = supplier x 1.70, market = retail x random 30-45%, then ACTIVE.
--         EXCEPT the 38 products proposed in 0023: their "cost" is Qeelasee's retail shop price (about 2x the
--         OEM list), so 130% of it would overprice them. They are left exactly as they are (draft) until you
--         have OEM prices for them.
--    B. Everything else that already has a wholesale price (now_price > 0): that price is assumed to be
--         WHOLESALE. A missing retail = wholesale / 1.30 x 1.70; a missing (or below-retail) market price =
--         retail x random 30-45%. Prices that are already filled in are kept. Then ACTIVE.
--    C. Products with no price at all (Fadvan: no supplier prices yet) stay as they are (draft).
--    Archived products are never touched.
--
--    NOTE: section 6 draws fresh random market prices. Run the whole file once; if you must re-run it, only
--    run sections 1-5 (everything above this banner) so today's prices are not re-drawn.
-- ---------------------------------------------------------------------
drop table if exists _report;
create temp table _report (
  slug text, name text, treatment text, supplier_kes numeric,
  wholesale numeric, retail numeric, market numeric, status_before text, status_after text, note text
);

do $$
declare
  s public.pricing_settings%rowtype;
  r record;
  v_kes numeric; v_w numeric; v_r numeric; v_m numeric; v_up numeric;
  v_status text;
  v_note text;
  v_step numeric;
  skip_slugs text[] := array['qeelasee-luxury-comic-spire-lashes','qeelasee-heart-star-comic-spire-lashes','qeelasee-wings-anime-lashes','qeelasee-fairy-anime-lashes','qeelasee-spire-anime-lashes','qeelasee-diy-cluster-lash-120-200','qeelasee-diy-cluster-lash-240-30d-40d','qeelasee-diy-cluster-lash-50d-100d','qeelasee-lower-flat-bottom-lashes','qeelasee-bottom-volume-lashes','qeelasee-ultra-glue-0506','qeelasee-strong-glue-0505','qeelasee-mild-glue-0507','qeelasee-yy-w-glue-0607','qeelasee-expert-glue-0606','qeelasee-super-glue-0608','qeelasee-fast-volume-glue','qeelasee-fast-drying-glue-05s','qeelasee-protein-remover','qeelasee-glue-primer','qeelasee-clear-gel-remover','qeelasee-remover-brush-pen','qeelasee-fiber-tips-pink-tweezers','vetus-tweezers-msa','vetus-golden-feather-dolphin-tweezers','vetus-tweezers-esd','vetus-tweezers-st','qeelasee-as10-tweezers','qeelasee-as09-volume-tweezers','qeelasee-micro-brushes','qeelasee-lip-cleaning-brushes','qeelasee-mascara-wands','qeelasee-lash-check-mirror','qeelasee-surgical-tape','qeelasee-pe-tape','3m-micropore-tape','qeelasee-glue-rings','qeelasee-mini-air-blower'];
begin
  select * into s from public.pricing_settings where id = 1;
  v_step := greatest(1, s.rounding_step);

  for r in
    select p.id, p.slug, p.name, p.status, p.now_price, p.retail_price, p.market_price, p.images,
           c.cost_usd, c.cost_kes
      from public.products p
      left join public.product_costs c on c.product_id = p.id
     where p.status <> 'archived'
     order by p.sort_order, p.name
  loop
    v_status := r.status;
    v_note := null;

    -- A. supplier price known
    if (coalesce(r.cost_usd, 0) > 0 or coalesce(r.cost_kes, 0) > 0) and not (r.slug = any (skip_slugs)) then
      v_kes := case when coalesce(r.cost_usd, 0) > 0 then r.cost_usd * s.fx_rate_kes_per_usd else r.cost_kes end;
      v_w := round(v_kes * s.wholesale_multiplier / v_step) * v_step;
      v_r := round(v_kes * s.retail_multiplier / v_step) * v_step;
      v_up := s.market_uplift_min_pct + random() * (s.market_uplift_max_pct - s.market_uplift_min_pct);
      v_m := round(v_r * (1 + v_up / 100) / v_step) * v_step;
      update public.products
         set now_price = v_w, retail_price = v_r, market_price = v_m,
             price_mode = case when coalesce(r.cost_usd, 0) > 0 then 'formula' else price_mode end,
             status = 'active'
       where id = r.id;
      if coalesce(jsonb_array_length(r.images), 0) = 0 then v_note := 'no photos yet'; end if;
      insert into _report values (r.slug, r.name, 'A: from supplier price', round(v_kes), v_w, v_r, v_m, r.status, 'active', v_note);

    elsif r.slug = any (skip_slugs) then
      insert into _report values (r.slug, r.name, 'left alone (0023 proposal, cost is Qeelasee retail)', null,
                                  r.now_price, r.retail_price, r.market_price, r.status, r.status, 'needs OEM price');

    -- B. no supplier price, but a price was typed in: treat it as wholesale
    elsif coalesce(r.now_price, 0) > 0 then
      v_w := r.now_price;
      v_r := case when coalesce(r.retail_price, 0) > 0 then r.retail_price
                  else round(v_w / s.wholesale_multiplier * s.retail_multiplier / v_step) * v_step end;
      -- retail can never be below wholesale
      v_r := greatest(v_r, v_w);
      v_m := r.market_price;
      if coalesce(v_m, 0) <= v_r then
        v_up := s.market_uplift_min_pct + random() * (s.market_uplift_max_pct - s.market_uplift_min_pct);
        v_m := round(v_r * (1 + v_up / 100) / v_step) * v_step;
      end if;
      update public.products set retail_price = v_r, market_price = v_m, status = 'active' where id = r.id;
      v_note := concat_ws(', ',
        case when coalesce(r.retail_price, 0) <= 0 then 'retail was missing' end,
        case when coalesce(r.market_price, 0) <= 0 or r.market_price <= v_r then 'market was missing' end,
        case when coalesce(jsonb_array_length(r.images), 0) = 0 then 'no photos yet' end);
      insert into _report values (r.slug, r.name, 'B: existing price assumed wholesale', null, v_w, v_r, v_m, r.status, 'active', v_note);

    -- C. no price at all
    else
      insert into _report values (r.slug, r.name, 'C: no price, stays as is', null, r.now_price, r.retail_price, r.market_price, r.status, r.status, 'needs a price');
    end if;
  end loop;
end $$;

-- What happened, product by product (shown in the SQL editor's result grid).
select treatment, slug, name, supplier_kes as supplier_ksh, wholesale, retail, market,
       status_before, status_after, note
  from _report
 order by treatment, slug;
