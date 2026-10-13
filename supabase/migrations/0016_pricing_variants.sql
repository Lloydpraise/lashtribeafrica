-- 0016_pricing_variants.sql
-- Price tiers, product options (variants), pricing formula, private costs, server-side cart pricing,
-- and real admin-only write access to the storefront tables.
--
-- Run AFTER 0015. Safe to re-run.
--
-- 1. PRICE TIERS (per product)
--      market_price  the crossed-out sticker price (unchanged)
--      now_price     the WHOLESALE price: charged when the quantity is at or above the MOQ (unchanged column,
--                    now labelled "Wholesale price" in admin)
--      retail_price  NEW. Charged when the quantity is BELOW the MOQ. Blank = same as the wholesale price.
--
-- 2. OPTIONS (variants), stored on the product as JSON so a product loads in one query:
--      [{"name":"Curl","values":[{"value":"C","price_delta":0},{"value":"D","price_delta":0}]},
--       {"name":"Length","values":[{"value":"12mm","price_delta":0},{"value":"15mm","price_delta":50}]}]
--    Option names and values are whatever you type in admin: nothing is hardcoded. price_delta is added
--    to the market, wholesale and retail price of that product (0 = same price). A customer must pick one
--    value of every option; place_order() checks the choice and saves it on the order line.
--
-- 3. PRICING FORMULA (admin only, edited in Site Settings -> Pricing formula)
--      landed  = supplier cost USD x exchange rate x (1 + FX buffer) x (1 + landed uplift)
--      wholesale = landed / (1 - margin)          retail = wholesale x (1 + retail markup)
--      market  = retail x (1 + market markup)     every price rounded to the rounding step
--    The formula only SUGGESTS prices. A product with price_mode 'manual' keeps whatever you typed;
--    'formula' products are repriced together by admin_reprice_formula_products().
--
-- 4. COSTS are private. They move out of the publicly readable products table into product_costs
--    (admin only). products.cost_price is emptied (the column is kept for now so an older admin build
--    does not break; drop it in a later migration).
--
-- 5. cart_quote(): the cart no longer needs the whole catalog in every page. It sends its lines and the
--    database answers with names, photos, MOQs and prices, using the SAME pricing code as place_order().
--
-- 6. SECURITY. products, categories, site_settings, kits and offers used to accept writes from the public
--    anon key (the admin sign-in only guarded the screen). Writes now need a signed-in admin
--    (public.academy_admins). Reading stays public.

-- ---------------------------------------------------------------------
-- 1 + 2. products: retail price, options, price mode
-- ---------------------------------------------------------------------
alter table public.products add column if not exists retail_price numeric(12,2) check (retail_price is null or retail_price >= 0);
alter table public.products add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists price_mode text not null default 'manual';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_price_mode_check') then
    alter table public.products add constraint products_price_mode_check check (price_mode in ('manual', 'formula'));
  end if;
end $$;

-- Shape check for the options JSON (admin validates too; this protects the database).
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
    end loop;
  end loop;
  return true;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_options_valid') then
    alter table public.products add constraint products_options_valid check (public._valid_product_options(options));
  end if;
end $$;

create index if not exists products_status_sort_idx on public.products (status, sort_order);

-- order lines remember the chosen options and which price tier applied
alter table public.order_items add column if not exists selected_options jsonb;
alter table public.order_items add column if not exists price_tier text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_price_tier_check') then
    alter table public.order_items add constraint order_items_price_tier_check
      check (price_tier is null or price_tier in ('wholesale', 'retail'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. pricing formula settings (admin only)
-- ---------------------------------------------------------------------
create table if not exists public.pricing_settings (
  id integer primary key default 1 check (id = 1),
  fx_rate_kes_per_usd numeric(10,2) not null default 130 check (fx_rate_kes_per_usd > 0),
  fx_buffer_pct numeric(6,2) not null default 3 check (fx_buffer_pct >= 0),
  landed_uplift_pct numeric(6,2) not null default 30 check (landed_uplift_pct >= 0),
  wholesale_margin_pct numeric(6,2) not null default 35 check (wholesale_margin_pct >= 0 and wholesale_margin_pct < 100),
  retail_markup_pct numeric(6,2) not null default 30 check (retail_markup_pct >= 0),
  market_markup_pct numeric(6,2) not null default 20 check (market_markup_pct >= 0),
  rounding_step integer not null default 10 check (rounding_step >= 1),
  updated_at timestamptz not null default now()
);
insert into public.pricing_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists pricing_settings_set_updated_at on public.pricing_settings;
create trigger pricing_settings_set_updated_at
  before update on public.pricing_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. private product costs
-- ---------------------------------------------------------------------
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_kes numeric(12,2) check (cost_kes is null or cost_kes >= 0),
  cost_usd numeric(12,4) check (cost_usd is null or cost_usd >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_costs_set_updated_at on public.product_costs;
create trigger product_costs_set_updated_at
  before update on public.product_costs
  for each row execute function public.set_updated_at();

-- Move any existing cost out of the public products table (copy first, then empty it).
insert into public.product_costs (product_id, cost_kes)
select id, cost_price from public.products where cost_price is not null
on conflict (product_id) do nothing;
update public.products set cost_price = null where cost_price is not null;

-- ---------------------------------------------------------------------
-- formula (single source of truth for suggested prices; the admin screen mirrors it for its live preview)
-- ---------------------------------------------------------------------
create or replace function public.formula_prices(p_cost_usd numeric)
returns table (wholesale numeric, retail numeric, market numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.pricing_settings%rowtype;
  v_landed numeric;
  v_w numeric; v_r numeric; v_m numeric;
begin
  select * into s from public.pricing_settings where id = 1;
  v_landed := p_cost_usd * s.fx_rate_kes_per_usd * (1 + s.fx_buffer_pct / 100) * (1 + s.landed_uplift_pct / 100);
  v_w := round(v_landed / (1 - s.wholesale_margin_pct / 100) / s.rounding_step) * s.rounding_step;
  v_r := round(v_w * (1 + s.retail_markup_pct / 100) / s.rounding_step) * s.rounding_step;
  v_m := round(v_r * (1 + s.market_markup_pct / 100) / s.rounding_step) * s.rounding_step;
  return query select v_w, v_r, v_m;
end;
$$;
revoke all on function public.formula_prices(numeric) from public, anon, authenticated;

-- Reprices every product set to "formula" that has a USD cost. Returns how many changed. Admin only.
create or replace function public.admin_reprice_formula_products()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_rows integer;
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  update public.products p
     set now_price = f.wholesale, retail_price = f.retail, market_price = f.market
    from public.product_costs c
    cross join lateral public.formula_prices(c.cost_usd) f
   where c.product_id = p.id and p.price_mode = 'formula' and c.cost_usd is not null;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke all on function public.admin_reprice_formula_products() from public, anon;
grant execute on function public.admin_reprice_formula_products() to authenticated;

-- ---------------------------------------------------------------------
-- pricing helpers (used by place_order and cart_quote; not callable from the API)
-- ---------------------------------------------------------------------
-- Checks a customer's choice against a product's options. Returns the price delta and the
-- normalised choice ({"Curl":"C"}, names and values spelled as the product defines them).
create or replace function public._resolve_options(p_defs jsonb, p_selected jsonb, p_label text default 'this product')
returns table (delta numeric, normalised jsonb)
language plpgsql
immutable
as $$
declare
  d jsonb; v jsonb; k text; chosen text; hit boolean;
begin
  delta := 0;
  normalised := '{}'::jsonb;
  if p_selected is null or jsonb_typeof(p_selected) <> 'object' then p_selected := '{}'::jsonb; end if;

  for k in select jsonb_object_keys(p_selected) loop
    if not exists (select 1 from jsonb_array_elements(coalesce(p_defs, '[]'::jsonb)) e
                    where lower(btrim(e->>'name')) = lower(btrim(k))) then
      raise exception 'Unknown option "%" for %', k, p_label;
    end if;
  end loop;

  for d in select * from jsonb_array_elements(coalesce(p_defs, '[]'::jsonb)) loop
    chosen := null;
    for k in select jsonb_object_keys(p_selected) loop
      if lower(btrim(k)) = lower(btrim(d->>'name')) then chosen := p_selected->>k; exit; end if;
    end loop;
    if chosen is null or btrim(chosen) = '' then
      raise exception 'Please choose % for %', d->>'name', p_label;
    end if;
    hit := false;
    for v in select * from jsonb_array_elements(d->'values') loop
      if lower(btrim(v->>'value')) = lower(btrim(chosen)) then
        hit := true;
        delta := delta + coalesce((v->>'price_delta')::numeric, 0);
        normalised := normalised || jsonb_build_object(d->>'name', v->>'value');
        exit;
      end if;
    end loop;
    if not hit then
      raise exception '"%" is not available for % on %', chosen, d->>'name', p_label;
    end if;
  end loop;
  return next;
end;
$$;
revoke all on function public._resolve_options(jsonb, jsonb, text) from public, anon, authenticated;

-- Best live percentage-off offer for a product (0 when none).
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
         or (o.scope = 'categories' and p.category_id is not null and p.category_id = any (o.category_ids)));
$$;
revoke all on function public._offer_pct(public.products) from public, anon, authenticated;

-- The three prices of one cart/order line BEFORE offers, and which tier the quantity falls in.
--   quantity >= MOQ  -> wholesale (now_price)      quantity < MOQ -> retail (retail_price, or now_price if blank)
-- Every price gets the chosen options' price_delta. A market price of 0 means "no sticker".
create or replace function public._line_pricing(p public.products, p_selected jsonb, p_qty integer)
returns table (opts jsonb, tier text, list_price numeric, market numeric, wholesale numeric, retail numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare r record;
begin
  select * into r from public._resolve_options(coalesce(p.options, '[]'::jsonb), p_selected, p.name);
  wholesale := greatest(0, p.now_price + r.delta);
  retail := greatest(0, coalesce(nullif(p.retail_price, 0), p.now_price) + r.delta);
  market := case when p.market_price > 0 then greatest(0, p.market_price + r.delta) else 0 end;
  tier := case when p_qty >= greatest(1, coalesce(p.moq, 1)) then 'wholesale' else 'retail' end;
  list_price := case when tier = 'wholesale' then wholesale else retail end;
  opts := r.normalised;
  return next;
end;
$$;
revoke all on function public._line_pricing(public.products, jsonb, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. cart_quote: priced cart lines straight from the database
--    p_items: [{ "key": "<cart line key>", "id": "<product uuid>", "qty": 5, "options": {"Curl":"C"} }]
--    A line whose options are missing/invalid comes back with needs_options = true (no price) so the cart
--    can send the customer to the product page; unknown or inactive products come back with missing = true.
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
  v_lines jsonb := '[]'::jsonb;
  v_fs jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('lines', '[]'::jsonb, 'free_shipping', null);
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

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'key', v_key, 'id', v_prod.id, 'slug', v_prod.slug, 'name', v_prod.name,
      'image', v_prod.images->0->>'url',
      'icon', case when v_prod.images->0->>'url' is null then v_prod.icon else null end,
      'moq', coalesce(v_prod.moq, 1), 'qty', v_qty,
      'options', v_pr.opts, 'tier', v_pr.tier, 'offer_pct', v_pct,
      'wholesale', v_w, 'retail', v_r, 'market', v_pr.market, 'unit', v_unit,
      'line_total', v_unit * v_qty,
      'line_market', case when v_pr.market > 0 then greatest(v_pr.market, v_unit) else v_unit end * v_qty));
  end loop;

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

  return jsonb_build_object('lines', v_lines, 'free_shipping', v_fs);
end;
$$;
grant execute on function public.cart_quote(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- place_order: as 0013, plus options, retail/wholesale tiers and no forced MOQ.
--   * quantity >= MOQ is charged the wholesale price, below the MOQ the retail price
--   * the chosen options are validated and saved on the order line (selected_options)
--   * subtotal is the tier price before offers; discount is what the percentage offer takes off
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

  v_total := v_subtotal - v_discount;

  -- Preorder batching: product orders join the first open batch that is more than
  -- the cutoff (default 7 days) away. Course-only orders have no shipment.
  if v_has_product then
    select b.id, b.ship_date into v_batch, v_ship from public.next_open_batch() b;
  end if;

  update public.orders set
    subtotal = v_subtotal,
    discount = v_discount,
    total = v_total,
    batch_id = v_batch,
    kind = case when v_has_product and v_has_course then 'mixed' when v_has_course then 'course' else 'product' end
  where id = v_order;

  return jsonb_build_object(
    'order_id', v_order, 'order_no', v_order_no, 'customer_id', v_customer,
    'total', v_total, 'status', 'pending',
    'batch_id', v_batch, 'ship_date', v_ship
  );
end;
$$;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- batch_supplier_lines: now splits a product by the options ordered (each curl / length is its own row)
-- ---------------------------------------------------------------------
drop function if exists public.batch_supplier_lines(uuid, boolean);
create or replace function public.batch_supplier_lines(p_batch uuid, p_include_unpaid boolean default false)
returns table (
  supplier_id uuid, supplier_name text, product_id uuid, sku text, product_name text,
  options jsonb, quantity bigint, orders_count bigint
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
  select s.id, coalesce(s.name, 'No supplier assigned'), p.id, p.sku, oi.name,
         oi.selected_options,
         sum(oi.quantity)::bigint, count(distinct o.id)::bigint
  from public.orders o
  join public.order_items oi on oi.order_id = o.id and oi.item_type = 'product'
  left join public.products p on p.id = oi.product_id
  left join public.suppliers s on s.id = p.supplier_id
  where o.batch_id = p_batch
    and (o.status in ('paid', 'fulfilled') or (p_include_unpaid and o.status = 'pending'))
  group by s.id, s.name, p.id, p.sku, oi.name, oi.selected_options
  order by coalesce(s.name, 'zzz'), oi.name, oi.selected_options::text;
end;
$$;
revoke all on function public.batch_supplier_lines(uuid, boolean) from public, anon;
grant execute on function public.batch_supplier_lines(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------------------
alter table public.pricing_settings enable row level security;
alter table public.product_costs enable row level security;

drop policy if exists "pricing_settings_admin_all" on public.pricing_settings;
create policy "pricing_settings_admin_all" on public.pricing_settings
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "product_costs_admin_all" on public.product_costs;
create policy "product_costs_admin_all" on public.product_costs
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- Storefront tables: reading stays public, writing needs a signed-in admin.
drop policy if exists "products_anon_write" on public.products;
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "categories_anon_write" on public.categories;
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "site_settings_anon_write" on public.site_settings;
drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "kits_anon_write" on public.kits;
drop policy if exists "kits_admin_write" on public.kits;
create policy "kits_admin_write" on public.kits
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "offers_anon_write" on public.offers;
drop policy if exists "offers_admin_write" on public.offers;
create policy "offers_admin_write" on public.offers
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- Product photos and videos: anyone can still see them, only an admin can upload, replace or delete.
-- (Only the admin screens write to this bucket, so nothing on the storefront changes.)
drop policy if exists "product_media_anon_write" on storage.objects;
drop policy if exists "product_media_anon_update" on storage.objects;
drop policy if exists "product_media_anon_delete" on storage.objects;
drop policy if exists "product_media_admin_insert" on storage.objects;
drop policy if exists "product_media_admin_update" on storage.objects;
drop policy if exists "product_media_admin_delete" on storage.objects;
create policy "product_media_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-media' and public.is_academy_admin());
create policy "product_media_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'product-media' and public.is_academy_admin());
create policy "product_media_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-media' and public.is_academy_admin());
