-- 0040_offers_black_friday.sql
-- Offers grow up (Lloyd, 2026-10-27): a Black Friday style campaign with three kinds of deal per product.
--
--   1. offers: new type 'reduced_moq' (wholesale price from a lower quantity), plus campaign / banner columns
--        moq_value     the reduced MOQ (used by reduced_moq offers)
--        campaign      null, or 'black_friday': the homepage marquee + product strip, the black
--                      "BLACK FRIDAY DEAL" badge on cards and product pages
--        banner_text   text of the moving homepage banner (falls back to the offer label)
--   2. helpers _offer_applies / _offer_pct / _offer_moq / _offer_free_ship (one place that decides what an offer covers)
--   3. cart_quote() and place_order(): as 0035, plus
--        * reduced MOQ lowers the wholesale threshold of the product (the supplier shipment minimum still applies)
--        * free shipping leaves the product's weight out of the shipping fee
--        * percentage off works as before
--      The browser never decides a price: checkout is charged exactly what these two functions compute.
--   4. a TEST offer set "Black Friday Sale (TEST)" on a few active products (toggle it off in Admin -> Offers).
--
-- Run AFTER 0035 (this file replaces its cart_quote/place_order). Safe to re-run.
-- Note: free-shipping offers with a "minimum order value" are still ignored when charging (as since 0029);
-- only free-shipping offers with no minimum remove a product's shipping weight.

do $$
begin
  if to_regprocedure('public._shipment_min(uuid,uuid)') is null then
    raise exception 'Run 0035_supplier_moq_batches.sql first (0040 builds on it).';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. columns
-- ---------------------------------------------------------------------
alter table public.offers add column if not exists moq_value integer check (moq_value is null or moq_value >= 1);
alter table public.offers add column if not exists campaign text check (campaign is null or campaign in ('black_friday'));
alter table public.offers add column if not exists banner_text text;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.offers'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%percentage_off%' and pg_get_constraintdef(oid) ilike '%free_shipping%'
  loop
    execute format('alter table public.offers drop constraint %I', c.conname);
  end loop;
  alter table public.offers add constraint offers_type_check
    check (type in ('percentage_off', 'free_shipping', 'reduced_moq'));
end $$;

-- ---------------------------------------------------------------------
-- 2. helpers
-- ---------------------------------------------------------------------
create or replace function public._offer_applies(o public.offers, p public.products)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select o.is_active
     and (o.starts_at is null or o.starts_at <= now())
     and (o.ends_at is null or o.ends_at >= now())
     and (o.scope = 'all'
          or (o.scope = 'products' and p.id = any (o.product_ids))
          or (o.scope = 'categories' and p.category_id is not null
              and (p.category_id = any (o.category_ids)
                   or (select c.parent_id from public.categories c where c.id = p.category_id) = any (o.category_ids))));
$$;
revoke all on function public._offer_applies(public.offers, public.products) from public, anon, authenticated;

create or replace function public._offer_pct(p public.products)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(o.value), 0)
    from public.offers o
   where o.type = 'percentage_off' and public._offer_applies(o, p);
$$;
revoke all on function public._offer_pct(public.products) from public, anon, authenticated;

-- the lowest reduced MOQ any live offer gives this product (null = no reduced-MOQ offer)
create or replace function public._offer_moq(p public.products)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select min(o.moq_value)
    from public.offers o
   where o.type = 'reduced_moq' and o.moq_value >= 1 and public._offer_applies(o, p);
$$;
revoke all on function public._offer_moq(public.products) from public, anon, authenticated;

create or replace function public._offer_free_ship(p public.products)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.offers o
     where o.type = 'free_shipping' and coalesce(o.min_order_value, 0) = 0 and public._offer_applies(o, p));
$$;
revoke all on function public._offer_free_ship(public.products) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. cart_quote + place_order (0035 versions with offers applied)
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
  v_free boolean;
  v_omoq integer;
  v_ok boolean;
  v_w numeric; v_r numeric; v_unit numeric;
  v_unit_weight numeric;
  v_weight numeric := 0;
  v_lines jsonb := '[]'::jsonb;
  v_fs jsonb;
  v_batch uuid;
  v_min integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('lines', '[]'::jsonb, 'free_shipping', null,
                              'shipping_fee', 0, 'shipping_rate', public._shipping_rate(), 'total_weight_kg', 0);
  end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Too many items in the cart'; end if;

  -- the batch a new order would join: the shipment minimum is counted per batch
  select b.id into v_batch from public.next_open_batch() b;

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

    -- shown to the buyer as the product's MOQ: what this shipment still needs, or our own MOQ when larger
    v_min := (public._shipment_min(v_prod.id, v_batch)->>'min_qty')::integer;
    v_pct := public._offer_pct(v_prod);
    v_free := public._offer_free_ship(v_prod);
    v_omoq := public._offer_moq(v_prod);
    -- a reduced-MOQ offer lowers the wholesale threshold (the shipment minimum above still applies)
    if v_omoq is not null and v_omoq < greatest(1, coalesce(v_prod.moq, 1)) then v_prod.moq := v_omoq; end if;
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
        'moq', greatest(coalesce(v_prod.moq, 1), v_min), 'min_qty', v_min, 'qty', v_qty, 'needs_options', true));
      continue;
    end if;

    v_w := greatest(0, round(v_pr.wholesale * (1 - v_pct / 100)));
    v_r := greatest(0, round(v_pr.retail * (1 - v_pct / 100)));
    v_unit := case when v_pr.tier = 'wholesale' then v_w else v_r end;
    v_unit_weight := public._line_weight(v_prod, v_pr.opts);
    if not v_free then v_weight := v_weight + v_unit_weight * v_qty; end if;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'key', v_key, 'id', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
      'image', v_prod.images->0->>'url',
      'icon', case when v_prod.images->0->>'url' is null then v_prod.icon else null end,
      'moq', greatest(coalesce(v_prod.moq, 1), v_min), 'min_qty', v_min, 'qty', v_qty,
      'options', v_pr.opts, 'tier', v_pr.tier, 'offer_pct', v_pct, 'free_shipping_item', v_free,
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
-- 4. place_order: as 0029, plus the shipment minimum check before anything is saved
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
  v_free boolean;
  v_omoq integer;
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
  v_chk record;
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

  -- Shipment minimum (0035): until this batch has the supplier MOQ of a product PAID, an order must bring at
  -- least what is still missing. Counted per product, all variations together.
  if exists (select 1 from jsonb_array_elements(p_items) i where i->>'type' = 'product') then
    select b.id into v_batch from public.next_open_batch() b;
    for v_chk in
      select p.name, s.qty, (public._shipment_min(p.id, v_batch)->>'min_qty')::integer as min_qty
        from (select nullif(i->>'id', '')::uuid as id,
                     sum(least(100000, greatest(1, coalesce((i->>'qty')::integer, 1)))) as qty
                from jsonb_array_elements(p_items) i
               where i->>'type' = 'product'
               group by 1) s
        join public.products p on p.id = s.id and p.status = 'active'
    loop
      if v_chk.qty < v_chk.min_qty then
        raise exception '%: the minimum order for this shipment is % (all options together).', v_chk.name, v_chk.min_qty;
      end if;
    end loop;
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

      -- offers: a reduced MOQ lowers the wholesale threshold; a free-shipping offer leaves the item out of the weight
      v_omoq := public._offer_moq(v_prod);
      if v_omoq is not null and v_omoq < greatest(1, coalesce(v_prod.moq, 1)) then v_prod.moq := v_omoq; end if;
      v_free := public._offer_free_ship(v_prod);

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
      if not v_free then v_weight := v_weight + public._line_weight(v_prod, v_pr.opts) * v_qty; end if;
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
-- 4. TEST DATA: "Black Friday Sale (TEST)"
--    4 products 15% off, 2 products order from a lower MOQ, 2 products ship free. Pick different products or
--    switch it off in Admin -> Offers. Only created once (matched by label).
-- ---------------------------------------------------------------------
do $$
declare
  v_pct uuid[]; v_moq uuid[]; v_ship uuid[];
begin
  if exists (select 1 from public.offers where label like 'Black Friday Sale (TEST)%') then return; end if;

  select coalesce(array_agg(id), '{}') into v_pct from (
    select id from public.products where status = 'active' order by sort_order, created_at limit 4) s;
  select coalesce(array_agg(id), '{}') into v_moq from (
    select id from public.products where status = 'active' and moq > 2 and id <> all (v_pct)
     order by sort_order, created_at limit 2) s;
  select coalesce(array_agg(id), '{}') into v_ship from (
    select id from public.products where status = 'active' and id <> all (v_pct) and id <> all (v_moq)
     order by sort_order, created_at limit 2) s;

  insert into public.offers (label, badge_text, type, scope, value, product_ids, campaign, banner_text, is_active)
  values ('Black Friday Sale (TEST) 15% off', '15% OFF', 'percentage_off', 'products', 15, v_pct, 'black_friday',
          'BLACK FRIDAY SALE · UP TO 15% OFF · LOWER MOQ · FREE SHIPPING ON SELECTED LASH ESSENTIALS', true);
  if cardinality(v_moq) > 0 then
    insert into public.offers (label, badge_text, type, scope, value, moq_value, product_ids, campaign, is_active)
    values ('Black Friday Sale (TEST) lower MOQ', 'MOQ 2', 'reduced_moq', 'products', 0, 2, v_moq, 'black_friday', true);
  end if;
  if cardinality(v_ship) > 0 then
    insert into public.offers (label, badge_text, type, scope, value, product_ids, campaign, is_active)
    values ('Black Friday Sale (TEST) free shipping', 'FREE SHIPPING', 'free_shipping', 'products', 0, v_ship, 'black_friday', true);
  end if;
end $$;

select o.label, o.type, o.campaign, o.is_active, o.value, o.moq_value,
       (select string_agg(p.name, ', ') from public.products p where p.id = any (o.product_ids)) as products
  from public.offers o order by o.created_at desc;
