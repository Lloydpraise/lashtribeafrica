-- 0013_preorder_batches.sql
-- Preorder batching: suppliers, shipment batches, and batch assignment at checkout.
--
-- Run AFTER 0012. Safe to re-run.
--
-- How it works
--   * Suppliers ship twice a month (mid-month and month-end). Each shipment date is a
--     row in BATCHES. Admin generates them in Site Settings, and can edit any date.
--   * Every product belongs to a SUPPLIER, so a batch can be split per supplier.
--   * When an order with products is placed, place_order() assigns it to the first
--     OPEN batch whose ship date is MORE than `batch_cutoff_days` (default 7) days
--     away. A batch exactly 7 days away is already too late. The assignment is stored
--     on the order (orders.batch_id), so editing dates later never moves old orders.
--   * Course-only orders have no batch. If no open batch exists the order is saved
--     unassigned and shows up in admin under "Unassigned" for you to place by hand.
--   * Dates are Nairobi dates (Africa/Nairobi).
--
-- Security: suppliers and all batch writes are admin-only. Batch dates are public
-- (the hero and checkout show them). Nothing here exposes customer data.

-- ---------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists suppliers_name_key on public.suppliers (lower(name));

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
create index if not exists products_supplier_idx on public.products (supplier_id);

-- ---------------------------------------------------------------------
-- batches
-- ---------------------------------------------------------------------
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  ship_date date not null unique,
  status text not null default 'open' check (status in ('open', 'closed', 'ordered', 'shipped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists batches_ship_date_idx on public.batches (ship_date);

drop trigger if exists batches_set_updated_at on public.batches;
create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

alter table public.site_settings
  add column if not exists batch_cutoff_days integer not null default 7 check (batch_cutoff_days >= 0);

alter table public.orders
  add column if not exists batch_id uuid references public.batches(id) on delete set null;
create index if not exists orders_batch_idx on public.orders (batch_id);

-- ---------------------------------------------------------------------
-- batch assignment
-- ---------------------------------------------------------------------
-- First open batch that is MORE than the cutoff away (Nairobi date).
create or replace function public.next_open_batch()
returns table (id uuid, ship_date date)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.ship_date
  from public.batches b
  where b.status = 'open'
    and b.ship_date - (now() at time zone 'Africa/Nairobi')::date >
        coalesce((select s.batch_cutoff_days from public.site_settings s limit 1), 7)
  order by b.ship_date
  limit 1;
$$;
grant execute on function public.next_open_batch() to anon, authenticated;

-- Creates the 15th and the last day of each month for the next p_months months
-- (skipping dates already passed or already present). Admin only.
create or replace function public.generate_batches(p_months integer default 6)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_first date := date_trunc('month', v_today)::date;
  v_m integer;
  v_d date;
  v_added integer := 0;
  v_rows integer;
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  for v_m in 0 .. greatest(1, least(coalesce(p_months, 6), 24)) - 1 loop
    foreach v_d in array array[
      (v_first + make_interval(months => v_m))::date + 14,
      ((v_first + make_interval(months => v_m + 1))::date - 1)
    ] loop
      if v_d >= v_today then
        insert into public.batches (ship_date) values (v_d) on conflict (ship_date) do nothing;
        get diagnostics v_rows = row_count;
        v_added := v_added + v_rows;
      end if;
    end loop;
  end loop;
  return v_added;
end;
$$;
grant execute on function public.generate_batches(integer) to authenticated;

-- Moves one order to another batch (or to none). Admin only.
create or replace function public.admin_move_order_batch(p_order uuid, p_batch uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.orders;
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  if p_batch is not null and not exists (select 1 from public.batches where id = p_batch) then
    raise exception 'Batch not found';
  end if;
  update public.orders set batch_id = p_batch where id = p_order returning * into v_row;
  if not found then raise exception 'Order not found'; end if;
  return v_row;
end;
$$;
grant execute on function public.admin_move_order_batch(uuid, uuid) to authenticated;

-- What to order from each supplier for a batch: product quantities by supplier.
-- Cancelled and refunded orders never count; unpaid (pending) orders only when asked.
create or replace function public.batch_supplier_lines(p_batch uuid, p_include_unpaid boolean default false)
returns table (
  supplier_id uuid, supplier_name text, product_id uuid, sku text, product_name text,
  quantity bigint, orders_count bigint
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
         sum(oi.quantity)::bigint, count(distinct o.id)::bigint
  from public.orders o
  join public.order_items oi on oi.order_id = o.id and oi.item_type = 'product'
  left join public.products p on p.id = oi.product_id
  left join public.suppliers s on s.id = p.supplier_id
  where o.batch_id = p_batch
    and (o.status in ('paid', 'fulfilled') or (p_include_unpaid and o.status = 'pending'))
  group by s.id, s.name, p.id, p.sku, oi.name
  order by coalesce(s.name, 'zzz'), oi.name;
end;
$$;
grant execute on function public.batch_supplier_lines(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- place_order: same as 0011, plus batch assignment (see next_open_batch)
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
    v_qty := greatest(1, coalesce((v_item->>'qty')::integer, 1));

    if v_type = 'product' then
      select * into v_prod from public.products where id = v_id and status = 'active';
      if not found then raise exception 'One of the products in your cart is no longer available'; end if;
      v_qty := greatest(v_qty, coalesce(v_prod.moq, 1));

      select coalesce(max(o.value), 0) into v_pct
      from public.offers o
      where o.is_active and o.type = 'percentage_off'
        and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at is null or o.ends_at >= now())
        and (o.scope = 'all'
             or (o.scope = 'products' and v_prod.id = any (o.product_ids))
             or (o.scope = 'categories' and v_prod.category_id is not null and v_prod.category_id = any (o.category_ids)));

      v_unit := greatest(0, round(v_prod.now_price * (1 - v_pct / 100)));
      insert into public.order_items (order_id, item_type, product_id, name, unit_price, market_price, quantity, line_total)
      values (v_order, 'product', v_prod.id, v_prod.name, v_unit, v_prod.market_price, v_qty, v_unit * v_qty);
      v_subtotal := v_subtotal + v_prod.now_price * v_qty;
      v_discount := v_discount + (v_prod.now_price - v_unit) * v_qty;
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
-- Row level security
-- ---------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.batches   enable row level security;

drop policy if exists "suppliers_admin_all" on public.suppliers;
create policy "suppliers_admin_all" on public.suppliers
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "batches_public_read" on public.batches;
create policy "batches_public_read" on public.batches
  for select using (true);
drop policy if exists "batches_admin_all" on public.batches;
create policy "batches_admin_all" on public.batches
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- First batches, so the hero and checkout have dates straight away.
-- (Admin can regenerate or edit them in Site Settings. Runs as the SQL editor user.)
do $$
declare
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_first date := date_trunc('month', v_today)::date;
  v_m integer;
  v_d date;
begin
  for v_m in 0 .. 5 loop
    foreach v_d in array array[
      (v_first + make_interval(months => v_m))::date + 14,
      ((v_first + make_interval(months => v_m + 1))::date - 1)
    ] loop
      if v_d >= v_today then
        insert into public.batches (ship_date) values (v_d) on conflict (ship_date) do nothing;
      end if;
    end loop;
  end loop;
end $$;
