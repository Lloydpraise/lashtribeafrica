-- 0001_products_schema.sql
-- Categories + Products tables for the ecommerce admin panel.
-- Run this in the Supabase SQL editor (or `supabase db push` if you use the CLI).

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  -- identity
  sku text unique,
  slug text not null unique,
  name text not null,

  -- copy
  description text,
  features jsonb not null default '[]'::jsonb,      -- string[]
  note text,                                          -- freeform highlight, e.g. "Save Ksh 3,250 on the tray!"
  badge text,                                          -- freeform tag, e.g. "Best Seller"
  icon text,                                            -- legacy inline SVG fallback, used when no photo exists yet

  -- organization
  category_id uuid references public.categories(id) on delete set null,
  complements uuid[] not null default '{}',           -- other product ids this one "goes with"
  featured_sections text[] not null default '{}',     -- e.g. {top_selling, new_in, kit_strip}

  -- pricing
  market_price numeric(10,2) not null default 0,
  now_price numeric(10,2) not null default 0,
  cost_price numeric(10,2),

  -- inventory
  moq integer not null default 1,
  stock_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,

  -- media (uploaded to the product-media storage bucket — see 0002)
  images jsonb not null default '[]'::jsonb,          -- [{ url, path, alt }]
  videos jsonb not null default '[]'::jsonb,          -- [{ url, path, title }]

  -- lifecycle
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_status_idx on public.products(status);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- IMPORTANT — read this before running:
-- The admin panel has no server-side auth of its own (it's a static site
-- gated by a client-side password only). It talks to Supabase with the
-- same public anon key the storefront uses. That means these policies
-- must let the anon role write to these tables, which means anyone who
-- extracts the anon key from the site's JS bundle could also write to
-- them directly. This is fine for a low-stakes internal catalog, but
-- don't treat it as a real security boundary. If that becomes a concern
-- later, the fix is real user auth (Supabase Auth) with policies scoped
-- to an authenticated admin role instead of anon.
-- ---------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

drop policy if exists "categories_anon_write" on public.categories;
create policy "categories_anon_write" on public.categories
  for all using (true) with check (true);

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (true);

drop policy if exists "products_anon_write" on public.products;
create policy "products_anon_write" on public.products
  for all using (true) with check (true);
