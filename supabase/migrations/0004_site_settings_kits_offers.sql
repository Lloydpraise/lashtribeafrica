-- 0004_site_settings_kits_offers.sql
-- Adds three admin-editable pieces of storefront content:
--   1. site_settings  — a single row of hero/ticker/countdown/policy copy
--   2. kits           — "starter kit" bundles shown in the Kit Strip
--   3. offers         — % off / free shipping promotions
--
-- Run after 0001-0003. Safe to re-run (uses if not exists / on conflict).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- site_settings (singleton row — id is always fixed so upserts land on
-- the same row instead of the admin panel accidentally creating a second
-- settings row)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id boolean primary key default true,
  singleton boolean not null default true unique,

  -- hero
  hero_eyebrow text not null default 'Wholesale For Lashtechs',
  hero_phrases jsonb not null default '["Direct Sourcing", "No Gatekeeping", "Unbeatable Prices"]'::jsonb,
  hero_photo_tag text not null default 'Studio Lash Bed — Nairobi',
  hero_bg_image jsonb, -- { url, path } — falls back to the built-in line-art background when null
  hero_cta_primary_label text not null default 'Order Now',
  hero_cta_primary_link text not null default '#shop',
  hero_cta_secondary_label text not null default 'How It Works',
  hero_cta_secondary_link text not null default '#how-it-works',

  -- countdown / order cadence bar
  countdown_label text not null default 'Order Now',
  countdown_target timestamptz,             -- when the current ordering window closes
  countdown_window_days integer not null default 7, -- length of the window, for the progress bar
  countdown_opened_text text not null default 'Window opened Mon',
  countdown_next_text text not null default 'Next batch ships soon',

  -- announcement ticker
  ticker_enabled boolean not null default true,
  ticker_messages jsonb not null default
    '["WHOLESALE · DIRECT FROM SOURCE", "ORDER NOW — NEW BATCH SHIPS SOON", "MOQ 5 ON MOST PRODUCTS", "UNBEATABLE PRICES · UNMATCHED QUALITY"]'::jsonb,

  -- policy pages
  policy_privacy text not null default '',
  policy_shipping text not null default '',
  policy_terms text not null default '',

  updated_at timestamptz not null default now(),

  constraint site_settings_singleton check (id = true)
);

insert into public.site_settings (id) values (true)
on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- kits — "starter kit" bundles for the Kit Strip section. Several can
-- exist; only the one with is_active = true shows on the storefront.
-- ---------------------------------------------------------------------
create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'The starter set every lashtech reaches for.',
  eyebrow text not null default 'You Should Have',
  description text not null default '',
  cta_label text not null default 'Shop The Set',
  cta_link text not null default '#shop',
  product_ids uuid[] not null default '{}',
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists kits_set_updated_at on public.kits;
create trigger kits_set_updated_at
  before update on public.kits
  for each row execute function public.set_updated_at();

-- Only one kit can be active at a time.
create unique index if not exists kits_only_one_active
  on public.kits ((is_active))
  where is_active;

-- ---------------------------------------------------------------------
-- offers — % off and free-shipping promotions
-- ---------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  label text not null,                       -- internal name, e.g. "Black Friday 20%"
  badge_text text,                            -- shown on badges/ticker; auto-derived if left blank
  type text not null check (type in ('percentage_off', 'free_shipping')),
  scope text not null default 'all' check (scope in ('all', 'products', 'categories')),
  value numeric(5,2) not null default 0,      -- percentage for percentage_off; unused for free_shipping
  product_ids uuid[] not null default '{}',   -- used when scope = 'products'
  category_ids uuid[] not null default '{}',  -- used when scope = 'categories'
  min_order_value numeric(10,2) not null default 0, -- used for free_shipping
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_active_idx on public.offers(is_active);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — same anon-read/anon-write tradeoff as 0001/0002.
-- See the note at the top of 0001_products_schema.sql before running.
-- ---------------------------------------------------------------------
alter table public.site_settings enable row level security;
alter table public.kits enable row level security;
alter table public.offers enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
  for select using (true);
drop policy if exists "site_settings_anon_write" on public.site_settings;
create policy "site_settings_anon_write" on public.site_settings
  for all using (true) with check (true);

drop policy if exists "kits_public_read" on public.kits;
create policy "kits_public_read" on public.kits
  for select using (true);
drop policy if exists "kits_anon_write" on public.kits;
create policy "kits_anon_write" on public.kits
  for all using (true) with check (true);

drop policy if exists "offers_public_read" on public.offers;
create policy "offers_public_read" on public.offers
  for select using (true);
drop policy if exists "offers_anon_write" on public.offers;
create policy "offers_anon_write" on public.offers
  for all using (true) with check (true);
