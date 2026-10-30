-- 0043_communications.sql
-- Automated email line: outbox, editable templates, consent, spacing rules, event triggers, abandoned carts.
--
-- Run AFTER 0042 (needs the batches, orders, enrollments and certificates tables). Safe to re-run.
-- Tolerates 0035/0040 not being run: it only touches columns that exist since 0013.
--
-- How it works (no polling sender)
--   * Something happens (order placed/paid, batch shipped, sign-in, certificate...) -> a trigger calls
--     queue_email(). queue_email() decides whether the person may get it (consent), when (spacing), and writes ONE
--     row in email_outbox.
--   * A due row immediately pings the send-emails edge function (pg_net, fire-and-forget). The function sends
--     through Brevo and records the result. Nothing runs on a timer to find work.
--   * Delayed messages (cart reminders, "ships in 2 days", nudges) are found by comms_tick(), ONE cheap
--     pg_cron job per hour that does no http call at all unless something is actually due.
--
-- Law by design (Kenya Data Protection Act s.37)
--   * service   order/course/account messages about something the person did. Sent to everyone.
--   * nudge     follow-ups about their own course. Skipped once they unsubscribe.
--   * marketing needs customers.marketing_opt_in = true (an unticked-by-default checkbox) and not email_opt_out.
--     Cart reminders, offers, newsletters and "learn more" are marketing.
--   * every marketing email carries a one-click unsubscribe (link + List-Unsubscribe header).
--   * spacing: marketing waits comms_settings.marketing_gap_hours after the person's previous marketing email,
--     so nobody gets many in one day; a campaign that would have to wait more than 3 days is dropped.
--   * master switch comms_settings.enabled is OFF until you turn it on in Admin > Communications.

-- ---------------------------------------------------------------------
-- extensions (Supabase: Database > Extensions). Failing here is not fatal: sending then needs them enabled.
-- ---------------------------------------------------------------------
do $$
begin
  begin create extension if not exists pg_net with schema extensions;
  exception when others then raise notice 'pg_net not available (%): enable it under Database > Extensions', sqlerrm; end;
  begin create extension if not exists pg_cron;
  exception when others then raise notice 'pg_cron not available (%): enable it under Database > Extensions', sqlerrm; end;
end $$;

-- ---------------------------------------------------------------------
-- customers: opt-out, consent record, private unsubscribe token
-- ---------------------------------------------------------------------
alter table public.customers add column if not exists email_opt_out boolean not null default false;
alter table public.customers add column if not exists marketing_consent_at timestamptz;
alter table public.customers add column if not exists unsub_token uuid not null default gen_random_uuid();
create unique index if not exists customers_unsub_token_key on public.customers (unsub_token);

-- existing opt-ins predate the record: date them from sign-up (best effort)
update public.customers set marketing_consent_at = created_at where marketing_opt_in and marketing_consent_at is null;

-- opting in (again) records when, and lifts an earlier opt-out; opting out is remembered too
create or replace function public._customers_consent_trg() returns trigger
language plpgsql as $$
begin
  if new.marketing_opt_in and not coalesce(old.marketing_opt_in, false) then
    new.marketing_consent_at := now();
    new.email_opt_out := false;
  elsif not new.marketing_opt_in and coalesce(old.marketing_opt_in, false) then
    new.marketing_consent_at := null;
  end if;
  return new;
end $$;
drop trigger if exists customers_consent on public.customers;
create trigger customers_consent before update of marketing_opt_in on public.customers
  for each row execute function public._customers_consent_trg();

-- batches get an "arrived" step (goods are at your office, ready to collect)
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.batches'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.batches drop constraint %I', c.conname);
  end loop;
  alter table public.batches add constraint batches_status_check
    check (status in ('open', 'closed', 'ordered', 'shipped', 'arrived'));
end $$;

alter table public.offers add column if not exists emailed_at timestamptz;   -- set when a campaign for it is sent

-- ---------------------------------------------------------------------
-- settings (one row)
-- ---------------------------------------------------------------------
create table if not exists public.comms_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,                 -- master switch
  sender_name text not null default 'Lashtribe Africa',
  sender_email text not null default 'hello@lashtribeafrica.com',
  reply_to text,
  site_url text not null default 'https://lashtribeafrica.com',
  daily_limit integer not null default 280 check (daily_limit between 1 and 100000),   -- Brevo free = 300 a day
  marketing_gap_hours integer not null default 72 check (marketing_gap_hours >= 0),
  quiet_from smallint not null default 20 check (quiet_from between 0 and 23),         -- Nairobi hour: no marketing/nudges from...
  quiet_to smallint not null default 8 check (quiet_to between 0 and 23),              -- ...until
  only_to text[] not null default '{}',                   -- test safety: when not empty, ONLY these addresses are emailed
  function_url text,                                      -- https://<project>.supabase.co/functions/v1/send-emails
  webhook_secret text,                                    -- shared with the function (secret COMMS_SECRET)
  updated_at timestamptz not null default now()
);
insert into public.comms_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- templates (editable in admin)
-- ---------------------------------------------------------------------
create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  description text,
  kind text not null check (kind in ('service', 'nudge', 'marketing')),
  enabled boolean not null default true,
  subject text not null,
  preheader text not null default '',
  body text not null,                    -- paragraphs split by a blank line; "- " bullets; **bold**; {{placeholders}}
  cta_label text,
  cta_url text,
  blocks text[] not null default '{}',   -- extra sections the sender appends: order, cart, offer, certificate
  delay_minutes integer not null default 0 check (delay_minutes >= 0),  -- wait after the event (cart: after leaving)
  priority smallint not null default 3,  -- 1 = sent first when the daily limit is tight
  respect_gap boolean not null default false,   -- wait out the per-person marketing gap
  respect_quiet boolean not null default false, -- hold until 08:00-20:00 Nairobi
  updated_at timestamptz not null default now()
);
drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- campaigns (one-off broadcasts, e.g. an offer or a newsletter)
-- ---------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  offer_id uuid references public.offers(id) on delete set null,
  subject text not null,
  preheader text not null default '',
  body text not null,
  cta_label text,
  cta_url text,
  blocks text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'queued')),
  queued_count integer not null default 0,
  skipped_count integer not null default 0,
  queued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists email_campaigns_set_updated_at on public.email_campaigns;
create trigger email_campaigns_set_updated_at before update on public.email_campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- outbox: one row per message, doubles as the send log
-- ---------------------------------------------------------------------
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template_key text not null references public.email_templates(key) on update cascade,
  kind text not null,
  customer_id uuid references public.customers(id) on delete set null,
  to_email text not null,
  to_name text,
  vars jsonb not null default '{}'::jsonb,    -- ids the sender needs (order_id, cart_id...), never secrets
  dedupe_key text not null unique,            -- the same event can never queue the same email twice
  priority smallint not null default 3,
  counts_toward_gap boolean not null default false,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  send_after timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'cancelled')),
  reason text,                                -- why skipped / failed
  attempts smallint not null default 0,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists email_outbox_due_idx on public.email_outbox (priority, send_after) where status = 'queued';
create index if not exists email_outbox_recipient_idx on public.email_outbox (lower(to_email), created_at desc);
create index if not exists email_outbox_sent_idx on public.email_outbox (sent_at) where status = 'sent';
create index if not exists email_outbox_customer_idx on public.email_outbox (customer_id);
drop trigger if exists email_outbox_set_updated_at on public.email_outbox;
create trigger email_outbox_set_updated_at before update on public.email_outbox
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- saved carts (signed-in shoppers only), for abandoned-cart reminders
-- ---------------------------------------------------------------------
create table if not exists public.saved_carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  items jsonb not null,                       -- the cart map { lineKey: qty }, see shared-cart.js
  item_count integer not null default 0,
  stage smallint not null default 0,          -- reminders already queued for this version of the cart (0, 1, 2)
  updated_at timestamptz not null default now()
);
create index if not exists saved_carts_stage_idx on public.saved_carts (stage, updated_at);

-- ---------------------------------------------------------------------
-- Row level security: admins only. The customer-facing bits are the RPCs further down.
-- ---------------------------------------------------------------------
alter table public.comms_settings enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_outbox enable row level security;
alter table public.saved_carts enable row level security;

drop policy if exists "Admins manage comms settings" on public.comms_settings;
create policy "Admins manage comms settings" on public.comms_settings
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());
drop policy if exists "Admins manage email templates" on public.email_templates;
create policy "Admins manage email templates" on public.email_templates
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());
drop policy if exists "Admins manage email campaigns" on public.email_campaigns;
create policy "Admins manage email campaigns" on public.email_campaigns
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());
drop policy if exists "Admins read outbox" on public.email_outbox;
create policy "Admins read outbox" on public.email_outbox
  for select to authenticated using (public.is_academy_admin());
-- saved_carts: no policy = no access through the API (the service role and the definer functions only)

revoke all on public.comms_settings, public.email_templates, public.email_campaigns, public.email_outbox, public.saved_carts from anon;
grant select, insert, update, delete on public.comms_settings, public.email_templates, public.email_campaigns to authenticated;
grant select on public.email_outbox to authenticated;

-- ---------------------------------------------------------------------
-- queue_email(): the single door every message goes through
-- ---------------------------------------------------------------------
create or replace function public._comms_kick(p_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s public.comms_settings;
begin
  select * into s from public.comms_settings where id;
  if not found or not s.enabled or coalesce(s.function_url, '') = '' or coalesce(s.webhook_secret, '') = '' then return; end if;
  begin
    perform net.http_post(
      url := s.function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-comms-secret', s.webhook_secret),
      body := case when p_id is null then jsonb_build_object('drain', true)
                   else jsonb_build_object('ids', jsonb_build_array(p_id)) end,
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'comms: could not call the send function: %', sqlerrm;   -- never block the order/enrolment that caused it
  end;
end $$;

create or replace function public.queue_email(
  p_template text, p_to text, p_name text, p_dedupe text,
  p_vars jsonb default '{}'::jsonb, p_delay interval default null,
  p_customer uuid default null, p_campaign uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.comms_settings;
  t public.email_templates;
  c public.customers;
  v_email text := lower(btrim(coalesce(p_to, '')));
  v_at timestamptz;
  v_last timestamptz;
  v_id uuid;
begin
  select * into s from public.comms_settings where id;
  if not found or not s.enabled then return null; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return null; end if;

  select * into t from public.email_templates where key = p_template and enabled;
  if t.key is null then return null; end if;

  if p_customer is not null then
    select * into c from public.customers where id = p_customer;
  else
    select * into c from public.customers where lower(email) = v_email limit 1;
  end if;

  -- consent, by design
  if t.kind = 'marketing' and (c.id is null or not c.marketing_opt_in or c.email_opt_out) then return null; end if;
  if t.kind = 'nudge' and c.id is not null and c.email_opt_out then return null; end if;

  v_at := now() + coalesce(p_delay, make_interval(mins => t.delay_minutes));

  -- spacing: marketing waits out the gap after this person's previous marketing email
  if t.respect_gap then
    select max(send_after) into v_last from public.email_outbox
      where lower(to_email) = v_email and counts_toward_gap and status in ('queued', 'sending', 'sent');
    if v_last is not null then v_at := greatest(v_at, v_last + make_interval(hours => s.marketing_gap_hours)); end if;
    if p_campaign is not null and v_at > now() + interval '3 days' then return null; end if;   -- too soon after another: skip
  end if;

  insert into public.email_outbox
    (template_key, kind, customer_id, to_email, to_name, vars, dedupe_key, priority, counts_toward_gap, campaign_id, send_after)
  values
    (t.key, t.kind, c.id, v_email, nullif(btrim(coalesce(p_name, '')), ''), coalesce(p_vars, '{}'::jsonb), p_dedupe,
     t.priority, t.kind = 'marketing', p_campaign, v_at)
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is not null and v_at <= now() + interval '1 minute' then perform public._comms_kick(v_id); end if;
  return v_id;
end $$;
revoke all on function public.queue_email(text, text, text, text, jsonb, interval, uuid, uuid) from public, anon, authenticated;
revoke all on function public._comms_kick(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- event triggers. Each one swallows its own errors: an email problem must never block an order.
-- ---------------------------------------------------------------------
create or replace function public._comms_order_insert_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.customers;
begin
  begin
    select * into c from public.customers where id = new.customer_id;
    if c.email is not null and new.status = 'pending' then
      perform public.queue_email('order_received', c.email, c.full_name, 'order_received:' || new.id, jsonb_build_object('order_id', new.id), null, c.id);
      perform public.queue_email('order_unpaid_1', c.email, c.full_name, 'order_unpaid_1:' || new.id, jsonb_build_object('order_id', new.id), null, c.id);
      perform public.queue_email('order_unpaid_2', c.email, c.full_name, 'order_unpaid_2:' || new.id, jsonb_build_object('order_id', new.id), null, c.id);
    end if;
  exception when others then raise warning 'comms order insert: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists comms_order_insert on public.orders;
create trigger comms_order_insert after insert on public.orders
  for each row execute function public._comms_order_insert_trg();

create or replace function public._comms_order_status_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.customers; v_vars jsonb := jsonb_build_object('order_id', new.id);
begin
  if new.status is not distinct from old.status then return new; end if;
  begin
    select * into c from public.customers where id = new.customer_id;
    if new.status in ('paid', 'cancelled', 'refunded') then   -- no more "please pay" reminders
      update public.email_outbox set status = 'cancelled', reason = 'order ' || new.status
        where status = 'queued' and dedupe_key in ('order_unpaid_1:' || new.id, 'order_unpaid_2:' || new.id);
    end if;
    if c.email is null then return new; end if;
    if new.status = 'paid' and old.status = 'pending' and new.kind in ('product', 'mixed') then
      perform public.queue_email('order_paid', c.email, c.full_name, 'order_paid:' || new.id, v_vars, null, c.id);
    elsif new.status = 'fulfilled' and new.kind in ('product', 'mixed') then
      perform public.queue_email('order_collected', c.email, c.full_name, 'order_collected:' || new.id, v_vars, null, c.id);
    elsif new.status in ('cancelled', 'refunded') and old.status <> 'pending' then
      perform public.queue_email('order_cancelled', c.email, c.full_name, 'order_cancelled:' || new.id || ':' || new.status, v_vars, null, c.id);
    elsif new.status = 'cancelled' and old.status = 'pending' then
      null;   -- never paid and now cancelled: nothing to tell them
    end if;
  exception when others then raise warning 'comms order status: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists comms_order_status on public.orders;
create trigger comms_order_status after update of status on public.orders
  for each row execute function public._comms_order_status_trg();

create or replace function public._comms_batch_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  begin
    if new.status is distinct from old.status and new.status in ('shipped', 'arrived') then
      for r in
        select o.id as order_id, c.id as customer_id, c.email, c.full_name
        from public.orders o join public.customers c on c.id = o.customer_id
        where o.batch_id = new.id and o.status = 'paid' and o.kind in ('product', 'mixed') and c.email is not null
      loop
        if new.status = 'shipped' then
          perform public.queue_email('batch_shipped', r.email, r.full_name, 'batch_shipped:' || r.order_id,
            jsonb_build_object('order_id', r.order_id), null, r.customer_id);
        else
          perform public.queue_email('batch_arrived', r.email, r.full_name, 'batch_arrived:' || r.order_id,
            jsonb_build_object('order_id', r.order_id), null, r.customer_id);
          perform public.queue_email('order_uncollected', r.email, r.full_name, 'order_uncollected:' || r.order_id,
            jsonb_build_object('order_id', r.order_id), null, r.customer_id);
        end if;
      end loop;
    end if;
    if new.ship_date is distinct from old.ship_date and new.status in ('open', 'closed', 'ordered') then
      for r in
        select o.id as order_id, c.id as customer_id, c.email, c.full_name
        from public.orders o join public.customers c on c.id = o.customer_id
        where o.batch_id = new.id and o.status in ('pending', 'paid') and o.kind in ('product', 'mixed') and c.email is not null
      loop
        perform public.queue_email('batch_date_changed', r.email, r.full_name, 'batch_date:' || r.order_id || ':' || new.ship_date,
          jsonb_build_object('order_id', r.order_id, 'old_date', old.ship_date), null, r.customer_id);
      end loop;
    end if;
  exception when others then raise warning 'comms batch: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists comms_batch_change on public.batches;
create trigger comms_batch_change after update of status, ship_date on public.batches
  for each row execute function public._comms_batch_trg();

create or replace function public._comms_enrollment_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare u record;
begin
  begin
    select au.email, coalesce(c.full_name, au.raw_user_meta_data ->> 'full_name') as full_name, c.id as cid
      into u from auth.users au left join public.customers c on c.user_id = au.id where au.id = new.user_id;
    if u.email is not null then
      perform public.queue_email('course_enrolled', u.email, u.full_name, 'course_enrolled:' || new.id,
        jsonb_build_object('enrollment_id', new.id, 'course_id', new.course_id, 'user_id', new.user_id), null, u.cid);
      perform public.queue_email('course_not_started', u.email, u.full_name, 'course_not_started:' || new.id,
        jsonb_build_object('enrollment_id', new.id, 'course_id', new.course_id, 'user_id', new.user_id), null, u.cid);
      perform public.queue_email('course_stalled', u.email, u.full_name, 'course_stalled:' || new.id,
        jsonb_build_object('enrollment_id', new.id, 'course_id', new.course_id, 'user_id', new.user_id), null, u.cid);
    end if;
  exception when others then raise warning 'comms enrollment: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists comms_enrollment on public.enrollments;
create trigger comms_enrollment after insert on public.enrollments
  for each row execute function public._comms_enrollment_trg();

create or replace function public._comms_certificate_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare u record;
begin
  begin
    select au.email, coalesce(c.full_name, au.raw_user_meta_data ->> 'full_name') as full_name, c.id as cid
      into u from auth.users au left join public.customers c on c.user_id = au.id where au.id = new.user_id;
    if u.email is not null then
      perform public.queue_email('certificate_ready', u.email, coalesce(new.holder_name, u.full_name), 'certificate_ready:' || new.id,
        jsonb_build_object('certificate_id', new.id, 'course_id', new.course_id), null, u.cid);
      perform public.queue_email('learn_more', u.email, coalesce(new.holder_name, u.full_name), 'learn_more:' || new.id,
        jsonb_build_object('certificate_id', new.id, 'course_id', new.course_id), null, u.cid);
    end if;
  exception when others then raise warning 'comms certificate: %', sqlerrm; end;
  return new;
end $$;
drop trigger if exists comms_certificate on public.course_certificates;
create trigger comms_certificate after insert on public.course_certificates
  for each row execute function public._comms_certificate_trg();

-- welcome: the first time a CONFIRMED account signs in (covers "Confirm email" on or off; the dedupe key makes it once)
create or replace function public._comms_auth_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  begin
    if new.email_confirmed_at is not null and new.email is not null
       and (tg_op = 'INSERT' or new.last_sign_in_at is not null or old.email_confirmed_at is null) then
      v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
      perform public.queue_email('welcome', new.email, v_name, 'welcome:' || new.id,
        jsonb_build_object('user_id', new.id), null, null);
    end if;
  exception when others then raise warning 'comms welcome: %', sqlerrm; end;
  return new;
end $$;
do $$
begin
  drop trigger if exists comms_auth_welcome_ins on auth.users;
  create trigger comms_auth_welcome_ins after insert on auth.users
    for each row execute function public._comms_auth_trg();
  drop trigger if exists comms_auth_welcome_upd on auth.users;
  create trigger comms_auth_welcome_upd after update of last_sign_in_at, email_confirmed_at on auth.users
    for each row execute function public._comms_auth_trg();
exception when others then
  raise notice 'Could not attach the welcome trigger to auth.users (%). Run this migration as the postgres role in the SQL editor.', sqlerrm;
end $$;

revoke all on function public._comms_order_insert_trg(), public._comms_order_status_trg(), public._comms_batch_trg(),
  public._comms_enrollment_trg(), public._comms_certificate_trg(), public._comms_auth_trg() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- saved cart (signed-in shoppers). Guests are never emailed about a cart: there is no consent to do so.
-- ---------------------------------------------------------------------
create or replace function public.save_cart(p_cart jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_cid uuid; v_n integer;
begin
  if auth.uid() is null then return; end if;
  select id into v_cid from public.customers where user_id = auth.uid();
  if v_cid is null then return; end if;
  if p_cart is null or jsonb_typeof(p_cart) <> 'object' or p_cart = '{}'::jsonb then
    delete from public.saved_carts where customer_id = v_cid;
    return;
  end if;
  select count(*) into v_n from jsonb_object_keys(p_cart);
  if v_n > 60 then raise exception 'That cart is too large'; end if;

  insert into public.saved_carts (customer_id, items, item_count)
  values (v_cid, p_cart, v_n)
  on conflict (customer_id) do update set
    stage = case when public.saved_carts.items = excluded.items then public.saved_carts.stage else 0 end,
    updated_at = case when public.saved_carts.items = excluded.items then public.saved_carts.updated_at else now() end,
    items = excluded.items,
    item_count = excluded.item_count;
end $$;
revoke all on function public.save_cart(jsonb) from public, anon;
grant execute on function public.save_cart(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- unsubscribe (the link in every marketing email)
-- ---------------------------------------------------------------------
create or replace function public.email_unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  update public.customers set email_opt_out = true, marketing_opt_in = false
    where unsub_token = p_token returning id into v_id;
  if v_id is null then return false; end if;
  update public.email_outbox set status = 'cancelled', reason = 'unsubscribed'
    where customer_id = v_id and status = 'queued' and kind in ('marketing', 'nudge');
  return true;
end $$;
grant execute on function public.email_unsubscribe(uuid) to anon, authenticated;

create or replace function public.email_resubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers set marketing_opt_in = true, email_opt_out = false where unsub_token = p_token;
  return found;
end $$;
grant execute on function public.email_resubscribe(uuid) to anon, authenticated;

-- a signed-in customer's own "email me" choice (the sign-up box, profile page)
create or replace function public.set_my_marketing(p_opt_in boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  update public.customers set marketing_opt_in = coalesce(p_opt_in, false) where user_id = auth.uid();
  return found;
end $$;
revoke all on function public.set_my_marketing(boolean) from public, anon;
grant execute on function public.set_my_marketing(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- scans for things that are about a DATE or about silence (run by comms_tick, once an hour)
-- ---------------------------------------------------------------------
create or replace function public.comms_scan()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.comms_settings;
  r record;
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_n integer := 0;
  v_mins1 integer; v_mins2 integer;
begin
  select * into s from public.comms_settings where id;
  if not found or not s.enabled then return 0; end if;

  -- "shipping in 2 days, get ready to collect"
  for r in
    select o.id as order_id, c.id as customer_id, c.email, c.full_name, b.ship_date
    from public.batches b
    join public.orders o on o.batch_id = b.id and o.status = 'paid' and o.kind in ('product', 'mixed')
    join public.customers c on c.id = o.customer_id and c.email is not null
    where b.ship_date = v_today + 2 and b.status in ('open', 'closed', 'ordered')
  loop
    if public.queue_email('shipping_soon', r.email, r.full_name, 'shipping_soon:' || r.order_id || ':' || r.ship_date,
         jsonb_build_object('order_id', r.order_id), null, r.customer_id) is not null then v_n := v_n + 1; end if;
  end loop;

  -- abandoned carts: stage 0 -> reminder 1, stage 1 -> reminder 2 (the template's delay_minutes is how long after leaving)
  select delay_minutes into v_mins1 from public.email_templates where key = 'cart_abandoned_1';
  select delay_minutes into v_mins2 from public.email_templates where key = 'cart_abandoned_2';
  for r in
    select sc.id, sc.customer_id, sc.stage, sc.updated_at, c.email, c.full_name
    from public.saved_carts sc join public.customers c on c.id = sc.customer_id
    where sc.item_count > 0 and sc.stage < 2
      and sc.updated_at < now() - make_interval(mins => case sc.stage when 0 then coalesce(v_mins1, 180) else coalesce(v_mins2, 2880) end)
      and not exists (select 1 from public.orders o where o.customer_id = sc.customer_id and o.placed_at > sc.updated_at)
    limit 500
  loop
    if r.email is not null then
      if public.queue_email(case r.stage when 0 then 'cart_abandoned_1' else 'cart_abandoned_2' end,
           r.email, r.full_name, 'cart' || (r.stage + 1) || ':' || r.id || ':' || extract(epoch from r.updated_at)::bigint,
           jsonb_build_object('cart_id', r.id), interval '0', r.customer_id) is not null then v_n := v_n + 1; end if;
    end if;
    update public.saved_carts set stage = r.stage + 1 where id = r.id;
  end loop;
  delete from public.saved_carts where updated_at < now() - interval '60 days';

  -- offer ends within a day: only for offers you emailed about
  for r in
    select c.id as customer_id, c.email, c.full_name, f.id as offer_id, f.ends_at
    from public.offers f
    join public.customers c on c.marketing_opt_in and not c.email_opt_out and c.email is not null
    where f.is_active and f.emailed_at is not null and f.ends_at is not null
      and f.ends_at > now() and f.ends_at <= now() + interval '30 hours'
    limit 5000
  loop
    if public.queue_email('offer_ending', r.email, r.full_name, 'offer_ending:' || r.offer_id || ':' || r.customer_id,
         jsonb_build_object('offer_id', r.offer_id), null, r.customer_id) is not null then v_n := v_n + 1; end if;
  end loop;

  return v_n;
end $$;
revoke all on function public.comms_scan() from public, anon, authenticated;

create or replace function public.comms_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s public.comms_settings; v_sent integer;
begin
  select * into s from public.comms_settings where id;
  if not found or not s.enabled then return; end if;
  update public.email_outbox set status = 'queued' where status = 'sending' and updated_at < now() - interval '15 minutes';   -- crashed sender
  perform public.comms_scan();
  select count(*) into v_sent from public.email_outbox where status = 'sent' and sent_at > date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  if v_sent < s.daily_limit and exists (select 1 from public.email_outbox where status = 'queued' and send_after <= now()) then
    perform public._comms_kick(null);   -- the ONLY http call the timer ever makes, and only when something is due
  end if;
end $$;
revoke all on function public.comms_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'lashtribe-comms-tick';
    perform cron.schedule('lashtribe-comms-tick', '7 * * * *', 'select public.comms_tick()');
  else
    raise notice 'pg_cron is not enabled: delayed emails (cart reminders, ships-in-2-days) need it. Enable it under Database > Extensions and re-run this file.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- admin actions
-- ---------------------------------------------------------------------
create or replace function public.admin_send_campaign(p_campaign uuid, p_start timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cp public.email_campaigns; r record; v_q integer := 0; v_s integer := 0; v_delay interval;
begin
  if not public.is_academy_admin() then raise exception 'Admins only'; end if;
  select * into cp from public.email_campaigns where id = p_campaign;
  if cp.id is null then raise exception 'Campaign not found'; end if;
  if cp.status = 'queued' then raise exception 'This campaign was already sent'; end if;
  if not exists (select 1 from public.comms_settings where enabled) then
    raise exception 'Turn on "Email sending" in Communications settings first';
  end if;
  v_delay := greatest(coalesce(p_start, now()) - now(), interval '0');

  for r in
    select id, email, full_name from public.customers
    where marketing_opt_in and not email_opt_out and email is not null
    order by created_at
  loop
    if public.queue_email('campaign', r.email, r.full_name, 'campaign:' || cp.id || ':' || r.id,
         jsonb_build_object('campaign_id', cp.id), v_delay, r.id, cp.id) is not null
    then v_q := v_q + 1; else v_s := v_s + 1; end if;
  end loop;

  update public.email_campaigns set status = 'queued', queued_count = v_q, skipped_count = v_s, queued_at = now() where id = cp.id;
  if cp.offer_id is not null then update public.offers set emailed_at = now() where id = cp.offer_id; end if;
  if v_delay = interval '0' then perform public._comms_kick(null); end if;
  return jsonb_build_object('queued', v_q, 'skipped', v_s);
end $$;
revoke all on function public.admin_send_campaign(uuid, timestamptz) from public, anon;
grant execute on function public.admin_send_campaign(uuid, timestamptz) to authenticated;

create or replace function public.admin_send_test_email(p_template text, p_to text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare t public.email_templates; v_id uuid;
begin
  if not public.is_academy_admin() then raise exception 'Admins only'; end if;
  if lower(btrim(p_to)) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That is not an email address'; end if;
  select * into t from public.email_templates where key = p_template;
  if t.key is null then raise exception 'Unknown template'; end if;
  insert into public.email_outbox (template_key, kind, to_email, to_name, vars, dedupe_key, priority, send_after)
  values (t.key, 'service', lower(btrim(p_to)), 'Test', jsonb_build_object('test', true), 'test:' || gen_random_uuid(), 1, now())
  returning id into v_id;
  perform public._comms_kick(v_id);
  return v_id;
end $$;
revoke all on function public.admin_send_test_email(text, text) from public, anon;
grant execute on function public.admin_send_test_email(text, text) to authenticated;

create or replace function public.admin_comms_requeue(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_academy_admin() then raise exception 'Admins only'; end if;
  if p_action = 'retry' then
    update public.email_outbox set status = 'queued', reason = null, attempts = 0, send_after = now()
      where id = p_id and status in ('failed', 'skipped', 'cancelled');
    perform public._comms_kick(p_id);
  elsif p_action = 'cancel' then
    update public.email_outbox set status = 'cancelled', reason = 'cancelled by admin' where id = p_id and status = 'queued';
  else
    raise exception 'Unknown action';
  end if;
end $$;
revoke all on function public.admin_comms_requeue(uuid, text) from public, anon;
grant execute on function public.admin_comms_requeue(uuid, text) to authenticated;

-- "Run checks now": the same work the hourly job does (queues cart reminders etc. and sends what is due)
create or replace function public.admin_comms_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_academy_admin() then raise exception 'Admins only'; end if;
  perform public.comms_tick();
end $$;
revoke all on function public.admin_comms_tick() from public, anon;
grant execute on function public.admin_comms_tick() to authenticated;

-- ---------------------------------------------------------------------
-- templates. Placeholders: {{first_name}} {{order_no}} {{ship_date}} {{site_url}} {{course_title}} ...
-- Edit any of them in Admin > Communications > Templates. Re-running this file never overwrites your edits.
-- ---------------------------------------------------------------------
insert into public.email_templates (key, name, description, kind, subject, preheader, body, cta_label, cta_url, blocks, delay_minutes, priority, respect_gap, respect_quiet) values
('welcome', 'Welcome', 'First time someone signs in to a confirmed account.', 'service',
 'Welcome to Lashtribe Africa, {{first_name}}', 'Your profile is ready.',
 E'Your profile is ready. Here is what you can do with it:\n\n- Pre-order lash supplies at wholesale prices, direct from source\n- Learn at Lashtribe Academy and earn certificates\n- Follow every order and every course in one place\n\nWe ship in two batches a month (the 15th and the last day), and we will email you at every step so you always know where your order is.',
 'Explore the shop', '{{site_url}}/ecommerce', '{}', 0, 2, false, false),
('order_received', 'Order received', 'Right after an order is placed, before payment.', 'service',
 'We have your order {{order_no}}', 'Pay to confirm your place in the next shipment.',
 E'Thank you for your order, {{first_name}}. It is saved and waiting for payment.\n\n**Pay to confirm your place** in the shipment leaving on {{ship_date}}.',
 'View my order', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('order_unpaid_1', 'Order unpaid, reminder 1', 'Sent only if the order is still unpaid after the delay.', 'service',
 'Your order {{order_no}} is waiting for payment', 'It only takes a minute to finish.',
 E'Hi {{first_name}}, you started order {{order_no}} but we have not received payment yet.\n\nOnce it is paid we can include it in the shipment leaving on {{ship_date}}.',
 'Finish my payment', '{{site_url}}/profile', '{order}', 180, 1, false, true),
('order_unpaid_2', 'Order unpaid, reminder 2', 'Last reminder, sent only if still unpaid.', 'service',
 'Still want {{order_no}}? It is not paid yet', 'Last reminder from us.',
 E'Hi {{first_name}}, order {{order_no}} is still unpaid. We will not message you about it again.\n\nIf you want it in the shipment leaving on {{ship_date}}, please pay before then. If something went wrong at checkout, just reply to this email and we will help.',
 'Finish my payment', '{{site_url}}/profile', '{order}', 1440, 1, false, true),
('order_paid', 'Payment confirmed', 'Order marked paid (Pesapal or by you).', 'service',
 'Payment received: order {{order_no}} is confirmed', 'Your order is in the next shipment.',
 E'Thank you, {{first_name}}. We have received your payment and order {{order_no}} is confirmed.\n\n**Your shipping date is {{ship_date}}.** We will email you again two days before, when it ships, and when your products are ready to collect.',
 'View my order', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('batch_date_changed', 'Shipping date changed', 'You edited the ship date of a batch with orders in it.', 'service',
 'Your shipping date has changed to {{ship_date}}', 'New date for order {{order_no}}.',
 E'Hi {{first_name}}, the shipping date for order {{order_no}} has moved to **{{ship_date}}**.\n\nNothing else changes and you do not need to do anything. Sorry for any inconvenience.',
 'View my order', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('shipping_soon', 'Shipping in 2 days', 'Two days before the batch ship date, for paid orders.', 'service',
 'Shipping in 2 days: get ready to collect, {{first_name}}', 'Order {{order_no}} ships on {{ship_date}}.',
 E'Your order {{order_no}} ships on **{{ship_date}}**, only two days away.\n\nPlease get ready to collect your products. Check that your phone number and delivery area are correct, and keep your phone close: we will email you the moment they are ready to collect.',
 'Check my details', '{{site_url}}/profile', '{order}', 0, 1, false, true),
('batch_shipped', 'Order shipped', 'The batch is set to Shipped.', 'service',
 'Your order {{order_no}} is on its way', 'Shipped today.',
 E'Good news, {{first_name}}: the shipment with your order {{order_no}} has left the supplier and is on its way to us.\n\nWe will email you again as soon as it has arrived and is ready to collect.',
 'View my order', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('batch_arrived', 'Ready to collect', 'The batch is set to Arrived.', 'service',
 'Your order {{order_no}} is ready to collect', 'It has arrived.',
 E'Your products have arrived, {{first_name}}! Order {{order_no}} is ready to collect.\n\nPlease arrange your pickup or delivery with us. Reply to this email or message us on WhatsApp and we will sort the details together.',
 'View my order', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('order_uncollected', 'Still waiting to be collected', 'Three days after arrival, only if not yet collected.', 'service',
 'Your order {{order_no}} is still waiting for you', 'A quick reminder.',
 E'Hi {{first_name}}, your order {{order_no}} arrived a few days ago and is still waiting to be collected.\n\nPlease let us know when you will pick it up. If something is in the way, reply to this email and we will help.',
 'View my order', '{{site_url}}/profile', '{order}', 4320, 2, false, true),
('order_collected', 'Thank you', 'Order marked fulfilled.', 'service',
 'Thank you, {{first_name}}!', 'Enjoy your products.',
 E'Order {{order_no}} is complete. Thank you for shopping with Lashtribe Africa!\n\nIf anything is not right, just reply to this email. If you love your products, tell a friend: that is how our community grows.',
 'Shop again', '{{site_url}}/ecommerce', '{}', 0, 2, false, false),
('order_cancelled', 'Order cancelled or refunded', 'A paid order was cancelled or refunded.', 'service',
 'Order {{order_no}} was {{order_status}}', 'Here is what that means.',
 E'Hi {{first_name}}, order {{order_no}} has been marked **{{order_status}}**.\n\nIf you did not expect this, or you have a question about a refund, reply to this email and we will sort it out quickly.',
 'View my orders', '{{site_url}}/profile', '{order}', 0, 1, false, false),
('course_enrolled', 'Course unlocked', 'Someone is enrolled in a course (purchase, free or by you).', 'service',
 'You are in: {{course_title}}', 'Your course is open.',
 E'Welcome to **{{course_title}}**, {{first_name}}. Your course is open and you can start right now.\n\nLearn at your own pace. Your progress is saved, and when you finish the lessons and pass the quizzes you earn a certificate you can share and employers can verify.',
 'Start learning', '{{course_url}}', '{}', 0, 1, false, false),
('course_not_started', 'Course not started', 'Three days after enrolling, only if no lesson was opened.', 'nudge',
 '{{course_title}} is waiting for you', 'The first lesson takes a few minutes.',
 E'Hi {{first_name}}, you enrolled in **{{course_title}}** but have not opened a lesson yet.\n\nThe first lesson only takes a few minutes. Starting small is the best way to keep going.',
 'Open my first lesson', '{{course_url}}', '{}', 4320, 3, false, true),
('course_stalled', 'Course stalled', 'Ten days after enrolling, if no progress for a week and not finished.', 'nudge',
 'Pick up where you left off, {{first_name}}', 'Your progress is saved.',
 E'Hi {{first_name}}, it has been a little while since your last lesson in **{{course_title}}**.\n\nYour progress is saved exactly where you left it. One lesson today keeps the momentum going.',
 'Continue my course', '{{course_url}}', '{}', 14400, 3, false, true),
('certificate_ready', 'Certificate ready', 'A certificate is issued.', 'service',
 'Congratulations {{first_name}}, your certificate is ready', 'You did it.',
 E'Congratulations, {{first_name}}! You completed **{{course_title}}** and your certificate is ready.\n\nAnyone can verify it at {{site_url}}/verify using the code **{{verify_code}}**. Certificate number: {{certificate_no}}.',
 'Get my certificate', '{{site_url}}/profile', '{}', 0, 1, false, false),
('cart_abandoned_1', 'Abandoned cart, reminder 1', 'Marketing. Signed-in shoppers who opted in, a few hours after leaving a cart.', 'marketing',
 'You left something in your cart, {{first_name}}', 'Your items are saved.',
 E'Hi {{first_name}}, your cart is saved and waiting for you.\n\nOur next shipment is on **{{next_ship_date}}**. Order by **{{order_by_date}}** to be in it.',
 'Return to my cart', '{{site_url}}/ecommerce/checkout', '{cart}', 180, 1, false, true),
('cart_abandoned_2', 'Abandoned cart, reminder 2', 'Marketing. Two days after leaving, only if still not ordered.', 'marketing',
 'Still thinking it over? Your cart is saved', 'We will not keep nudging you.',
 E'Hi {{first_name}}, we saved your cart in case you want to finish later. This is our last reminder about it.\n\nWe ship in batches, so the sooner you order the sooner your products are on the way. The next shipment leaves on **{{next_ship_date}}** (order by **{{order_by_date}}**).',
 'Finish my order', '{{site_url}}/ecommerce/checkout', '{cart}', 2880, 1, false, true),
('offer_ending', 'Offer ending soon', 'Marketing. About a day before an offer you emailed about ends.', 'marketing',
 'Ends soon: {{offer_title}}', 'Do not miss it.',
 E'Hi {{first_name}}, our offer **{{offer_title}}** ends {{offer_ends}}.\n\nIf you have been planning an order, now is the time.',
 'Shop the offer', '{{site_url}}/ecommerce', '{offer}', 0, 2, true, true),
('learn_more', 'Learn more after a certificate', 'Marketing. Three days after a certificate.', 'marketing',
 'What is next after {{course_title}}?', 'Keep growing your lash skills.',
 E'Congratulations again on finishing **{{course_title}}**, {{first_name}}.\n\nThe lash professionals who grow fastest keep learning and keep their kit stocked. Browse more Academy courses, and the products used in them, at wholesale prices.',
 'See more courses', '{{site_url}}/academy', '{}', 4320, 3, true, true),
('campaign', 'Campaign (broadcast)', 'The wrapper used by Campaigns. Its wording comes from each campaign.', 'marketing',
 '{{campaign_subject}}', '', '{{campaign_body}}', null, null, '{}', 0, 3, true, true)
on conflict (key) do nothing;
