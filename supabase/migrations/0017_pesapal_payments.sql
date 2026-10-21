-- 0017: online payments (Pesapal).
--
-- One row per payment attempt. An order can have several attempts (a customer cancels, then tries again);
-- the order becomes 'paid' as soon as one of them is confirmed by Pesapal. Rows are written only by the
-- Edge Functions (service role); admins can read them. Nothing here is readable by shoppers directly.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'pesapal',
  env text not null default 'live' check (env in ('live', 'sandbox')),
  merchant_reference text not null unique,      -- what we sent Pesapal as the order "id" (LT-1234-xxxxxx)
  order_tracking_id text unique,                -- Pesapal's id for the attempt
  amount numeric(12,2) not null,
  currency text not null default 'KES',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'reversed', 'mismatch')),
  payment_method text,                          -- as reported by Pesapal (e.g. MPESA, VISA)
  confirmation_code text,                       -- e.g. the M-Pesa receipt, as reported by Pesapal
  note text,                                    -- why a payment needs a human look (mismatch / reversed)
  raw_status jsonb,                             -- last GetTransactionStatus response, for support
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_order_idx on public.payments(order_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "Admins read payments" on public.payments;
create policy "Admins read payments" on public.payments
  for select using (public.is_academy_admin());

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
