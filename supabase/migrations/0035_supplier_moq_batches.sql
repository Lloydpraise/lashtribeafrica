-- 0035_supplier_moq_batches.sql
-- Supplier MOQ, pooled per batch, with a live "minimum for this shipment" (Lloyd, 2026-10-27).
--
--   products.supplier_moq = the supplier's own minimum (e.g. Alibaba MOQ). 1 = no minimum (the default).
--   Orders of a product are pooled per batch. Customers never see the supplier or the pool: the product's usual
--   MOQ simply shows the shipment minimum while that is larger:   min_qty = greatest(1, supplier_moq - units already PAID in the batch)
--   e.g. supplier MOQ 6 and nothing paid yet -> minimum 6; once 6 are paid, anyone can order 1.
--   Only paid (or fulfilled) orders count, so unpaid orders never lower the minimum.
--   Admin -> Orders -> Batches shows each product's pooled quantity against its supplier MOQ.
--   We only sell products with a supplier MOQ of 10 or less; section 6 takes the others off sale (draft).
--   products.moq is unchanged: it still only decides wholesale vs retail price.
--
--   1. products.supplier_moq
--   2. _shipment_min() + product_shipment_min() (the product page asks this)
--   3. cart_quote(): a line's moq is greatest(our MOQ, shipment minimum); min_qty = the hard minimum
--   4. place_order(): refuses a product below its shipment minimum
--   5. batch_supplier_pool(): the admin pool view
--   6. data: supplier MOQs found on Alibaba, I-G Tech Glue 10ml priced from Alibaba, MOQ > 10 -> draft
--
-- Run after 0029 and 0033. Safe to re-run except the random market price drawn for I-G Tech Glue 10ml.

-- ---------------------------------------------------------------------
-- 1. column
-- ---------------------------------------------------------------------
alter table public.products add column if not exists supplier_moq integer not null default 1 check (supplier_moq >= 1);

-- ---------------------------------------------------------------------
-- 2. helpers
-- ---------------------------------------------------------------------
-- {"min_qty": 4} for one product in one batch (null batch = nothing paid yet). Internal: it also knows the pool.
create or replace function public._shipment_min(p_product uuid, p_batch uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with m as (
    select greatest(1, coalesce((select supplier_moq from public.products where id = p_product), 1)) as smoq
  ), o as (
    select coalesce(sum(i.quantity), 0)::integer as paid
      from public.order_items i
      join public.orders o on o.id = i.order_id
     where p_batch is not null and o.batch_id = p_batch and i.product_id = p_product
       and o.status in ('paid', 'fulfilled')
  )
  select jsonb_build_object('min_qty', case when m.smoq <= 1 then 1 else greatest(1, m.smoq - o.paid) end)
    from m, o;
$$;
revoke all on function public._shipment_min(uuid, uuid) from public, anon, authenticated;

-- For the product page: {"min_qty": 4} for the batch a new order would join (null when the product is not on sale).
create or replace function public.product_shipment_min(p_product uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_batch uuid;
begin
  if not exists (select 1 from public.products where id = p_product and status = 'active') then return null; end if;
  select b.id into v_batch from public.next_open_batch() b;
  return public._shipment_min(p_product, v_batch);
end;
$$;
grant execute on function public.product_shipment_min(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. cart_quote: as 0029, plus the shipment minimum in each line's moq (and min_qty)
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
    v_weight := v_weight + v_unit_weight * v_qty;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'key', v_key, 'id', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
      'image', v_prod.images->0->>'url',
      'icon', case when v_prod.images->0->>'url' is null then v_prod.icon else null end,
      'moq', greatest(coalesce(v_prod.moq, 1), v_min), 'min_qty', v_min, 'qty', v_qty,
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
-- 5. admin pool view, per product (all variations together). Cancelled/refunded orders never count;
--    unpaid (pending) orders only when asked, like batch_supplier_lines().
-- ---------------------------------------------------------------------
create or replace function public.batch_supplier_pool(p_batch uuid, p_include_unpaid boolean default false)
returns table (
  product_id uuid, product_name text, supplier_name text,
  supplier_moq integer, quantity bigint, orders_count bigint, short_by bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  return query
  select p.id, coalesce(p.name, max(oi.name)), coalesce(s.name, 'No supplier assigned'),
         coalesce(p.supplier_moq, 1),
         sum(oi.quantity)::bigint, count(distinct o.id)::bigint,
         greatest(0, coalesce(p.supplier_moq, 1) - sum(oi.quantity))::bigint
    from public.orders o
    join public.order_items oi on oi.order_id = o.id and oi.item_type = 'product'
    left join public.products p on p.id = oi.product_id
    left join public.suppliers s on s.id = p.supplier_id
   where o.batch_id = p_batch
     and (o.status in ('paid', 'fulfilled') or (p_include_unpaid and o.status = 'pending'))
   group by p.id, p.name, p.supplier_moq, s.name
   order by greatest(0, coalesce(p.supplier_moq, 1) - sum(oi.quantity)) desc, coalesce(s.name, 'zzz'), coalesce(p.name, max(oi.name));
end;
$$;
revoke all on function public.batch_supplier_pool(uuid, boolean) from public, anon;
grant execute on function public.batch_supplier_pool(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 6. DATA
--    Supplier MOQs read from Fadvan's Alibaba listings (2026-10-26/27). Products not listed keep 1 (no limit):
--    set the others in Admin -> Products -> Supplier MOQ when you know them.
--    I-G Tech Glue is the same bottle as Fadvan's fast-drying black glue: MOQ 2, $9.52 for 2-49 pieces.
--    The listing gives one price for both sizes, so only the 10ml is repriced here; the 5ml keeps its price.
-- ---------------------------------------------------------------------
update public.products p
   set supplier_moq = v.smoq
  from (values
    ('fadvan-fast-drying-black-glue', 2),
    ('i-g-tech-glue-5ml', 2),
    ('i-g-tech-glue-10ml', 2),
    ('fadvan-lash-gel-remover-5g', 2),
    ('fadvan-ventilador-premade-fans-3d-20d', 2),
    ('fadvan-diy-cluster-lashes', 5),
    ('fadvan-8d-w-shape-lash', 20)
  ) as v(slug, smoq)
 where p.slug = v.slug;

do $$
declare
  s jsonb; v_id uuid;
  v_fx numeric; v_wm numeric; v_rm numeric; v_umin numeric; v_umax numeric; v_step numeric;
  v_kes numeric; v_r numeric;
begin
  select id into v_id from public.products where slug = 'i-g-tech-glue-10ml' and status <> 'archived';
  if v_id is null then return; end if;
  select to_jsonb(p) into s from public.pricing_settings p where id = 1;
  v_fx   := coalesce((s->>'fx_rate_kes_per_usd')::numeric, 130);
  v_wm   := coalesce((s->>'wholesale_multiplier')::numeric, 1.30);
  v_rm   := coalesce((s->>'retail_multiplier')::numeric, 1.70);
  v_umin := coalesce((s->>'market_uplift_min_pct')::numeric, 30);
  v_umax := coalesce((s->>'market_uplift_max_pct')::numeric, 45);
  v_step := greatest(1, coalesce((s->>'rounding_step')::numeric, 10));

  insert into public.product_costs (product_id, cost_usd) values (v_id, 9.52)
  on conflict (product_id) do update set cost_usd = excluded.cost_usd;
  v_kes := 9.52 * v_fx;
  v_r := round(v_kes * v_rm / v_step) * v_step;
  update public.products
     set now_price = round(v_kes * v_wm / v_step) * v_step,
         retail_price = v_r,
         market_price = round(v_r * (1 + (v_umin + random() * (v_umax - v_umin)) / 100) / v_step) * v_step,
         price_mode = 'formula'
   where id = v_id;
end $$;

-- We only sell what we can pool: a supplier MOQ above 10 takes the product off sale.
update public.products set status = 'draft' where supplier_moq > 10 and status = 'active';

select slug, name, status, supplier_moq, moq, now_price as wholesale, retail_price as retail, market_price as market
  from public.products
 where supplier_moq > 1 or slug like 'i-g-tech-glue%'
 order by slug;
