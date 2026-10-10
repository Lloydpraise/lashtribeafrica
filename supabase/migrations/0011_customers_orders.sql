-- 0011_customers_orders.sql
-- Customers, orders, order items, certificates, and the reporting views behind
-- the admin Customers screen and the student Profile page.
--
-- Run AFTER 0010. Safe to re-run.
--
-- Model
--   * A CUSTOMER is anyone who has placed an order (products and/or courses).
--     A customer can exist without a login (guest checkout). When the person
--     creates a profile (Supabase Auth user), the customer row is linked to it by
--     user_id, matched on email or phone, so their earlier guest orders follow them.
--   * A PROFILE is the Supabase Auth user. Academy access needs one (password).
--   * ORDERS + ORDER_ITEMS keep a snapshot of name and price at purchase time, so
--     later price edits never rewrite history.
--   * Course/bundle items create ENROLLMENTS when the order is marked paid.
--   * CERTIFICATES are issued by a database function that checks every published
--     lesson is complete. Each has a public verification code.
--   * Order value, repeat purchases and course progress are VIEWS, so there are no
--     counters that can drift out of sync.
--
-- Security
--   Customer data is personal (phones, addresses). Unlike the product tables, none
--   of these tables allow the anon role at all. Admin access needs a signed-in
--   Supabase user listed in public.academy_admins (see 0005). Students can only
--   read their own rows. Orders are created ONLY through public.place_order(),
--   which prices everything on the server.

create extension if not exists "pgcrypto";

create sequence if not exists public.order_number_seq start 1001;
create sequence if not exists public.certificate_number_seq start 1;

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
-- Kenyan-first phone normalisation: 0712 345 678 / 712345678 / +254712345678 -> +254712345678
create or replace function public.normalize_phone(p text)
returns text
language plpgsql
immutable
as $$
declare d text;
begin
  d := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
  if d = '' then return null; end if;
  if left(d, 3) = '254' and length(d) = 12 then return '+' || d; end if;
  if left(d, 1) = '0' and length(d) = 10 then return '+254' || substr(d, 2); end if;
  if length(d) = 9 and left(d, 1) in ('1', '7') then return '+254' || d; end if;
  if length(d) >= 10 then return '+' || d; end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null default '',
  email text,
  phone text,                                   -- normalised, see normalize_phone()
  delivery_area text,
  marketing_opt_in boolean not null default false,
  notes text,                                   -- admin-only
  tags text[] not null default '{}',            -- admin-only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_email_key on public.customers (lower(email)) where email is not null;
create unique index if not exists customers_phone_key on public.customers (phone) where phone is not null;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- orders + items
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('LT-' || nextval('public.order_number_seq')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  kind text not null default 'product' check (kind in ('product', 'course', 'mixed')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  payment_method text,                          -- e.g. mpesa, card, cash, manual
  payment_ref text,                             -- M-Pesa code / Pesapal tracking id
  subtotal numeric(12,2) not null default 0,    -- at list (now_price) before offers
  discount numeric(12,2) not null default 0,    -- offers applied
  shipping_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,       -- subtotal - discount + shipping_fee
  delivery_area text,
  delivery_notes text,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders(customer_id, placed_at desc);
create index if not exists orders_status_idx on public.orders(status, placed_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'course', 'bundle')),
  product_id uuid references public.products(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  bundle_id uuid references public.course_bundles(id) on delete set null,
  name text not null,                           -- snapshot
  unit_price numeric(12,2) not null,            -- price paid per unit (after offers)
  market_price numeric(12,2),                   -- snapshot, for "you saved"
  quantity integer not null default 1 check (quantity > 0),
  line_total numeric(12,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id) where product_id is not null;
create index if not exists order_items_course_idx on public.order_items(course_id) where course_id is not null;

-- enrollments remember which order granted them (revoked if the order is refunded)
alter table public.enrollments add column if not exists order_id uuid references public.orders(id) on delete set null;

-- ---------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------
create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text not null unique
    default ('LTA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 5, '0')),
  verify_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete cascade,
  holder_name text not null,                    -- snapshot printed on the PDF
  course_title text not null,                   -- snapshot
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index if not exists course_certificates_user_idx on public.course_certificates(user_id);

-- ---------------------------------------------------------------------
-- internal: find or create a customer, linking to a login when there is one
-- (not granted to API roles; called by place_order and the signup trigger)
-- ---------------------------------------------------------------------
create or replace function public._upsert_customer(
  p_name text, p_email text, p_phone text, p_area text, p_user uuid, p_opt_in boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if p_user is not null then
    select id into v_id from public.customers where user_id = p_user;
  end if;
  if v_id is null and v_email is not null then
    select id into v_id from public.customers
     where lower(email) = v_email and (p_user is null or user_id is null or user_id = p_user) limit 1;
  end if;
  if v_id is null and v_phone is not null then
    select id into v_id from public.customers
     where phone = v_phone and (p_user is null or user_id is null or user_id = p_user) limit 1;
  end if;

  if v_id is null then
    begin
      insert into public.customers (user_id, full_name, email, phone, delivery_area, marketing_opt_in)
      values (p_user, v_name, v_email, v_phone, nullif(btrim(coalesce(p_area, '')), ''), coalesce(p_opt_in, false))
      returning id into v_id;
    exception when unique_violation then
      -- email/phone belongs to someone else's record: keep this one without the clashing field
      insert into public.customers (user_id, full_name, delivery_area, marketing_opt_in)
      values (p_user, v_name, nullif(btrim(coalesce(p_area, '')), ''), coalesce(p_opt_in, false))
      returning id into v_id;
    end;
  else
    -- fill blanks only; a guest checkout never overwrites what the customer has on file
    update public.customers c set
      user_id = coalesce(c.user_id, p_user),
      full_name = case when c.full_name = '' then v_name else c.full_name end,
      email = coalesce(c.email, v_email),
      phone = coalesce(c.phone, v_phone),
      delivery_area = coalesce(c.delivery_area, nullif(btrim(coalesce(p_area, '')), '')),
      marketing_opt_in = c.marketing_opt_in or coalesce(p_opt_in, false)
    where c.id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public._upsert_customer(text, text, text, text, uuid, boolean) from public, anon, authenticated;

-- A new login (profile) automatically claims or creates its customer record.
create or replace function public.handle_new_user_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public._upsert_customer(
      new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone',
      null, new.id, false
    );
  exception when others then
    raise warning 'customer link failed for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_user_customer();

-- Backfill: give every existing login a customer record.
insert into public.customers (user_id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', ''), lower(u.email)
from auth.users u
where not exists (select 1 from public.customers c where c.user_id = u.id)
  and not exists (select 1 from public.customers c where lower(c.email) = lower(u.email))
on conflict do nothing;

-- ---------------------------------------------------------------------
-- place_order: the ONLY way an order is created.
--   p_customer: { full_name, email, phone, delivery_area, marketing_opt_in }
--   p_items:    [ { type: 'product'|'course'|'bundle', id: uuid, qty: int } ]
-- Prices are read from the database (with live % offers), never from the browser.
-- Course and bundle purchases require a signed-in profile.
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
  update public.orders set
    subtotal = v_subtotal,
    discount = v_discount,
    total = v_total,
    kind = case when v_has_product and v_has_course then 'mixed' when v_has_course then 'course' else 'product' end
  where id = v_order;

  return jsonb_build_object(
    'order_id', v_order, 'order_no', v_order_no, 'customer_id', v_customer,
    'total', v_total, 'status', 'pending'
  );
end;
$$;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- enrollments for course / bundle items (internal)
-- ---------------------------------------------------------------------
create or replace function public._grant_order_enrollments(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid; v_no text;
begin
  select c.user_id, o.order_no into v_user, v_no
  from public.orders o join public.customers c on c.id = o.customer_id where o.id = p_order;
  if v_user is null then
    raise warning 'order % has course items but the customer has no login yet', p_order;
    return;
  end if;

  insert into public.enrollments (user_id, course_id, source, order_ref, order_id)
  select v_user, x.course_id, 'purchase', v_no, p_order
  from (
    select oi.course_id from public.order_items oi
     where oi.order_id = p_order and oi.item_type = 'course' and oi.course_id is not null
    union
    select bi.course_id from public.order_items oi
      join public.course_bundle_items bi on bi.bundle_id = oi.bundle_id
     where oi.order_id = p_order and oi.item_type = 'bundle'
  ) x
  on conflict (user_id, course_id) do nothing;
end;
$$;
revoke all on function public._grant_order_enrollments(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- admin (and, later, the M-Pesa / Pesapal webhook via the service role)
-- ---------------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order uuid, p_status text, p_method text default null, p_ref text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.orders;
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  if p_status not in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded') then
    raise exception 'Unknown status %', p_status;
  end if;

  update public.orders set
    status = p_status,
    payment_method = coalesce(p_method, payment_method),
    payment_ref = coalesce(p_ref, payment_ref),
    paid_at = case when p_status in ('paid', 'fulfilled') then coalesce(paid_at, now()) else paid_at end,
    fulfilled_at = case when p_status = 'fulfilled' then coalesce(fulfilled_at, now()) else fulfilled_at end
  where id = p_order
  returning * into v_row;
  if not found then raise exception 'Order not found'; end if;

  if p_status in ('paid', 'fulfilled') then
    perform public._grant_order_enrollments(p_order);
  elsif p_status in ('cancelled', 'refunded') then
    delete from public.enrollments where order_id = p_order and source = 'purchase';
  end if;
  return v_row;
end;
$$;
grant execute on function public.admin_set_order_status(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- profile helpers
-- ---------------------------------------------------------------------
create or replace function public.update_my_profile(
  p_name text, p_phone text, p_area text, p_marketing boolean
) returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_row public.customers; v_phone text := public.normalize_phone(p_phone);
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select id into v_id from public.customers where user_id = v_uid;
  if v_id is null then
    v_id := public._upsert_customer(p_name, (select email from auth.users where id = v_uid), p_phone, p_area, v_uid, p_marketing);
  end if;
  if v_phone is not null and exists (select 1 from public.customers where phone = v_phone and id <> v_id) then
    raise exception 'That phone number is already on another profile';
  end if;
  update public.customers set
    full_name = coalesce(nullif(btrim(p_name), ''), full_name),
    phone = coalesce(v_phone, phone),
    delivery_area = nullif(btrim(coalesce(p_area, '')), ''),
    marketing_opt_in = coalesce(p_marketing, marketing_opt_in)
  where id = v_id
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.update_my_profile(text, text, text, boolean) to authenticated;

-- Issues (or returns) the certificate once every published lesson is complete.
create or replace function public.issue_certificate(p_course uuid)
returns public.course_certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses%rowtype;
  v_total integer;
  v_done integer;
  v_cust public.customers%rowtype;
  v_cert public.course_certificates;
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select * into v_course from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'Course not found'; end if;
  if not v_course.certificate_enabled then raise exception 'This course does not issue a certificate'; end if;
  if not public.has_course_access(p_course) then raise exception 'You do not have access to this course'; end if;

  select * into v_cert from public.course_certificates where user_id = v_uid and course_id = p_course;
  if found then return v_cert; end if;

  select count(*) into v_total from public.lessons where course_id = p_course and status = 'published';
  select count(*) into v_done
  from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
  where lp.user_id = v_uid and lp.course_id = p_course and lp.completed and l.status = 'published';
  if v_total = 0 or v_done < v_total then
    raise exception 'Finish every lesson to earn your certificate (% of % done)', v_done, v_total;
  end if;

  select * into v_cust from public.customers where user_id = v_uid;
  insert into public.course_certificates (user_id, customer_id, course_id, holder_name, course_title)
  values (
    v_uid, v_cust.id, p_course,
    coalesce(nullif(v_cust.full_name, ''), (select raw_user_meta_data->>'full_name' from auth.users where id = v_uid), 'Student'),
    v_course.title
  )
  returning * into v_cert;
  return v_cert;
end;
$$;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- Public: anyone with the code can check a certificate is genuine.
create or replace function public.verify_certificate(p_code text)
returns table (certificate_no text, holder_name text, course_title text, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.certificate_no, c.holder_name, c.course_title, c.issued_at
  from public.course_certificates c
  where lower(c.verify_code) = lower(btrim(p_code)) or upper(c.certificate_no) = upper(btrim(p_code))
  limit 1;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- reporting views (security_invoker: they obey the caller's row security,
-- so admins see everything and a student sees only their own rows)
-- ---------------------------------------------------------------------
create or replace view public.customer_stats with (security_invoker = true) as
select
  c.id as customer_id,
  count(o.id) filter (where o.status not in ('cancelled', 'refunded')) as orders_count,
  count(o.id) filter (where o.status in ('paid', 'fulfilled')) as paid_orders_count,
  coalesce(sum(o.total) filter (where o.status in ('paid', 'fulfilled')), 0) as lifetime_value,
  coalesce(sum(o.total) filter (where o.status = 'pending'), 0) as pending_value,
  coalesce(round(avg(o.total) filter (where o.status in ('paid', 'fulfilled'))), 0) as avg_order_value,
  min(o.placed_at) filter (where o.status not in ('cancelled', 'refunded')) as first_order_at,
  max(o.placed_at) filter (where o.status not in ('cancelled', 'refunded')) as last_order_at,
  coalesce(bool_or(o.kind in ('product', 'mixed')) filter (where o.status not in ('cancelled', 'refunded')), false) as bought_products,
  coalesce(bool_or(o.kind in ('course', 'mixed')) filter (where o.status not in ('cancelled', 'refunded')), false) as bought_courses
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

-- One row per customer + product. times_ordered counts SEPARATE orders, so a product
-- bought in 3 different orders is flagged as a repeat purchase.
create or replace view public.customer_product_stats with (security_invoker = true) as
select
  o.customer_id,
  oi.product_id,
  max(oi.name) as product_name,
  count(distinct o.id) as times_ordered,
  sum(oi.quantity) as total_qty,
  sum(oi.line_total) as total_spent,
  min(o.placed_at) as first_ordered_at,
  max(o.placed_at) as last_ordered_at,
  count(distinct o.id) > 1 as is_repeat
from public.order_items oi
join public.orders o on o.id = oi.order_id
where oi.item_type = 'product' and oi.product_id is not null
  and o.status not in ('cancelled', 'refunded')
group by o.customer_id, oi.product_id;

-- One row per customer + enrolled course, with progress and certificate.
create or replace view public.customer_course_progress with (security_invoker = true) as
select
  c.id as customer_id,
  e.user_id,
  e.course_id,
  co.slug as course_slug,
  co.title as course_title,
  co.cover_url,
  e.source,
  e.created_at as enrolled_at,
  (select count(*) from public.lessons l where l.course_id = e.course_id and l.status = 'published') as total_lessons,
  (select count(*) from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = e.user_id and lp.course_id = e.course_id and lp.completed and l.status = 'published') as completed_lessons,
  (select max(lp.updated_at) from public.lesson_progress lp
    where lp.user_id = e.user_id and lp.course_id = e.course_id) as last_activity_at,
  cert.id as certificate_id,
  cert.certificate_no,
  cert.verify_code,
  cert.issued_at as certificate_issued_at
from public.enrollments e
join public.customers c on c.user_id = e.user_id
join public.courses co on co.id = e.course_id
left join public.course_certificates cert on cert.user_id = e.user_id and cert.course_id = e.course_id;

grant select on public.customer_stats, public.customer_product_stats, public.customer_course_progress to authenticated;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.course_certificates enable row level security;

drop policy if exists "customers_own_read" on public.customers;
create policy "customers_own_read" on public.customers
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all" on public.customers
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "orders_own_read" on public.orders;
create policy "orders_own_read" on public.orders
  for select to authenticated
  using (customer_id in (select id from public.customers where user_id = auth.uid()));
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "order_items_own_read" on public.order_items;
create policy "order_items_own_read" on public.order_items
  for select to authenticated
  using (order_id in (
    select o.id from public.orders o join public.customers c on c.id = o.customer_id where c.user_id = auth.uid()
  ));
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

drop policy if exists "certificates_own_read" on public.course_certificates;
create policy "certificates_own_read" on public.course_certificates
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "certificates_admin_all" on public.course_certificates;
create policy "certificates_admin_all" on public.course_certificates
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- Admins need to see student progress on the customer screen.
drop policy if exists "progress_admin_read" on public.lesson_progress;
create policy "progress_admin_read" on public.lesson_progress
  for select to authenticated using (public.is_academy_admin());
