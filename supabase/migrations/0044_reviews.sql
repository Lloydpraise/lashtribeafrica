-- 0044_reviews.sql
-- Customer reviews for products and courses.
--
-- Run AFTER 0043_communications.sql. Safe to re-run.
--
-- How it works
--   * When an order is FULFILLED (products) or PAID (course-only orders) a one-time review link is created
--     (review_requests) and the "review_request" email is queued by queue_email(): 24 hours later for products,
--     3 days later for courses. Nothing polls; this is the same event-driven door as every other email.
--   * The link is /review?t=<token>. The token is the only key: one order, one review, used once.
--   * The review attaches to the products and courses on that order (the customer can untick some).
--     If they bought 5 products the review shows on all 5.
--   * Only people who bought can review, because only a fulfilled / paid order creates a link.
--   * Product and course pages read published reviews through get_reviews() (anon can call it; it returns
--     only the first name + initial, the stars, the text and the date).
--   * Admin can hide or delete any review (Admin > Reviews).
--   * The email is a "nudge": skipped for anyone who has unsubscribed, held outside 08:00-20:00 Nairobi.

do $$ begin
  if to_regprocedure('public.queue_email(text,text,text,text,jsonb,interval,uuid,uuid)') is null then
    raise exception 'Run 0043_communications.sql first (this file uses its email door, queue_email).';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.review_requests(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  display_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table if not exists public.review_targets (
  review_id uuid not null references public.reviews(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  check (num_nonnulls(product_id, course_id) = 1)
);
create unique index if not exists review_targets_product_key on public.review_targets (review_id, product_id) where product_id is not null;
create unique index if not exists review_targets_course_key on public.review_targets (review_id, course_id) where course_id is not null;
create index if not exists review_targets_product_idx on public.review_targets (product_id) where product_id is not null;
create index if not exists review_targets_course_idx on public.review_targets (course_id) where course_id is not null;

-- ---------------------------------------------------------------------
-- security: nothing is open to the API directly. Public reads go through get_reviews(),
-- the customer writes through submit_review(), admins manage through these policies.
-- ---------------------------------------------------------------------
alter table public.review_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.review_targets enable row level security;

drop policy if exists "Admins read review requests" on public.review_requests;
create policy "Admins read review requests" on public.review_requests
  for select to authenticated using (public.is_academy_admin());
drop policy if exists "Admins manage reviews" on public.reviews;
create policy "Admins manage reviews" on public.reviews
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());
drop policy if exists "Admins read review targets" on public.review_targets;
create policy "Admins read review targets" on public.review_targets
  for select to authenticated using (public.is_academy_admin());

-- ---------------------------------------------------------------------
-- event: an order is delivered -> create the one-time link and queue the email
-- ---------------------------------------------------------------------
create or replace function public._reviews_order_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.customers; v_delay interval;
begin
  if new.status is not distinct from old.status then return new; end if;
  begin
    if (new.status = 'fulfilled' and new.kind in ('product', 'mixed'))
       or (new.status = 'paid' and new.kind = 'course') then
      select * into c from public.customers where id = new.customer_id;
      if c.id is null then return new; end if;
      insert into public.review_requests (order_id, customer_id) values (new.id, c.id) on conflict (order_id) do nothing;
      if c.email is not null then
        v_delay := case when new.kind = 'course' then interval '72 hours' else null end;   -- null = the template's own 24 h
        perform public.queue_email('review_request', c.email, c.full_name, 'review_request:' || new.id,
                                   jsonb_build_object('order_id', new.id), v_delay, c.id);
      end if;
    end if;
  exception when others then raise warning 'reviews order trigger: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists reviews_order_status on public.orders;
create trigger reviews_order_status after update of status on public.orders
  for each row execute function public._reviews_order_trg();

-- ---------------------------------------------------------------------
-- the /review page: what is this link for?
-- ---------------------------------------------------------------------
create or replace function public.review_request_info(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.review_requests; o public.orders; c public.customers; v_items jsonb;
begin
  select * into r from public.review_requests where token = p_token;
  if r.id is null then return jsonb_build_object('state', 'invalid'); end if;
  if r.used_at is not null then return jsonb_build_object('state', 'used'); end if;
  select * into o from public.orders where id = r.order_id;
  if o.status in ('cancelled', 'refunded') then return jsonb_build_object('state', 'invalid'); end if;
  select * into c from public.customers where id = r.customer_id;

  select coalesce(jsonb_agg(x order by x->>'name'), '[]'::jsonb) into v_items from (
    select distinct on (coalesce(oi.product_id, oi.course_id))
      jsonb_build_object(
        'kind', case when oi.product_id is not null then 'product' else 'course' end,
        'id', coalesce(oi.product_id, oi.course_id),
        'name', oi.name,
        'slug', case when oi.product_id is not null then (select p.slug from public.products p where p.id = oi.product_id)
                     else (select co.slug from public.courses co where co.id = oi.course_id) end,
        'image', case when oi.product_id is not null then (select p.images -> 0 ->> 'url' from public.products p where p.id = oi.product_id) end
      ) as x
    from public.order_items oi
    where oi.order_id = o.id and (oi.product_id is not null or oi.course_id is not null)
    order by coalesce(oi.product_id, oi.course_id)
  ) s;

  return jsonb_build_object(
    'state', 'open',
    'order_no', o.order_no,
    'first_name', split_part(btrim(coalesce(c.full_name, '')), ' ', 1),
    'suggested_name', case
      when btrim(coalesce(c.full_name, '')) = '' then ''
      when position(' ' in btrim(c.full_name)) = 0 then btrim(c.full_name)
      else split_part(btrim(c.full_name), ' ', 1) || ' ' || upper(left(split_part(btrim(c.full_name), ' ', 2), 1)) || '.'
    end,
    'items', v_items
  );
end $$;
revoke all on function public.review_request_info(uuid) from public;
grant execute on function public.review_request_info(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- the customer sends the review. p_targets = [{"kind":"product","id":"..."}, ...]
-- ---------------------------------------------------------------------
create or replace function public.submit_review(p_token uuid, p_rating integer, p_body text, p_name text, p_targets jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.review_requests; o public.orders;
  v_id uuid; v_name text; v_body text; t jsonb; n integer := 0;
begin
  select * into r from public.review_requests where token = p_token for update;
  if r.id is null then raise exception 'This review link is not valid.'; end if;
  if r.used_at is not null then raise exception 'You have already reviewed this order. Thank you!'; end if;
  select * into o from public.orders where id = r.order_id;
  if o.status in ('cancelled', 'refunded') then raise exception 'This review link is not valid.'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Please choose 1 to 5 stars.'; end if;

  v_body := btrim(coalesce(p_body, ''));
  if char_length(v_body) > 2000 then raise exception 'Please keep your review under 2000 characters.'; end if;
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if v_name = '' then v_name := 'Verified buyer'; end if;
  v_name := left(v_name, 40);

  if p_targets is null or jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) = 0 then
    raise exception 'Pick at least one product or course this review is about.';
  end if;

  insert into public.reviews (request_id, customer_id, display_name, rating, body)
  values (r.id, r.customer_id, v_name, p_rating, v_body)
  returning id into v_id;

  for t in select * from jsonb_array_elements(p_targets) loop
    if t ->> 'kind' = 'product' and exists (
         select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = (t ->> 'id')::uuid) then
      insert into public.review_targets (review_id, product_id) values (v_id, (t ->> 'id')::uuid) on conflict do nothing;
      n := n + 1;
    elsif t ->> 'kind' = 'course' and exists (
         select 1 from public.order_items oi where oi.order_id = o.id and oi.course_id = (t ->> 'id')::uuid) then
      insert into public.review_targets (review_id, course_id) values (v_id, (t ->> 'id')::uuid) on conflict do nothing;
      n := n + 1;
    end if;
  end loop;

  if n = 0 then raise exception 'Pick at least one product or course from your order.'; end if;

  update public.review_requests set used_at = now() where id = r.id;
  return jsonb_build_object('ok', true, 'review_id', v_id, 'name', v_name, 'rating', p_rating, 'body', v_body);
end $$;
revoke all on function public.submit_review(uuid, integer, text, text, jsonb) from public;
grant execute on function public.submit_review(uuid, integer, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- product and course pages read published reviews here
-- ---------------------------------------------------------------------
create or replace function public.get_reviews(p_kind text, p_id uuid, p_limit integer default 12)
returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (
    select rv.rating, rv.body, rv.display_name, rv.created_at
    from public.reviews rv
    join public.review_targets t on t.review_id = rv.id
    where rv.status = 'published'
      and ((p_kind = 'product' and t.product_id = p_id) or (p_kind = 'course' and t.course_id = p_id))
  ), top as (
    select * from r order by created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 50)
  )
  select jsonb_build_object(
    'count', (select count(*) from r),
    'avg', (select round(avg(rating)::numeric, 1) from r),
    'items', coalesce((select jsonb_agg(jsonb_build_object('rating', rating, 'body', body, 'name', display_name, 'at', created_at) order by created_at desc) from top), '[]'::jsonb)
  );
$$;
revoke all on function public.get_reviews(text, uuid, integer) from public;
grant execute on function public.get_reviews(text, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- admin: hide / show / delete
-- ---------------------------------------------------------------------
create or replace function public.admin_set_review_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_academy_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('published', 'hidden') then raise exception 'Unknown status'; end if;
  update public.reviews set status = p_status where id = p_id;
end $$;
revoke all on function public.admin_set_review_status(uuid, text) from public, anon;
grant execute on function public.admin_set_review_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- the review request email (editable in Admin > Communications > Automatic emails)
-- ---------------------------------------------------------------------
insert into public.email_templates (key, name, description, kind, subject, preheader, body, cta_label, cta_url, blocks, delay_minutes, priority, respect_gap, respect_quiet) values
('review_request', 'Ask for a review', '24 hours after an order is delivered (courses: 3 days after payment).', 'nudge',
 'How was your order, {{first_name}}?', 'It takes a minute and helps other lash artists choose.',
 E'Your order {{order_no}} should be with you by now. We would love to hear how it went.\n\nTap the button, give us your stars and a line or two. Your review will show on the product pages of everything you bought, so other lash artists can buy with confidence.\n\nIt only takes a minute, and it helps a small business more than you know.',
 'Leave my review', '{{review_url}}', '{}', 1440, 4, false, true)
on conflict (key) do nothing;
