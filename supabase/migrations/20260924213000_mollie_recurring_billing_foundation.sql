alter table public.orders
  add column if not exists mollie_customer_id text,
  add column if not exists mollie_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists billing_interval text;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  customer_email text not null,
  mollie_customer_id text not null,
  mollie_subscription_id text unique,
  first_payment_id text,
  status text not null default 'PENDING'
    check (status in ('PENDING','ACTIVE','PAST_DUE','CANCELLED','COMPLETED','FAILED')),
  interval text not null
    check (interval in ('1 month','1 year')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  starts_on date,
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_subscriptions_status
  on public.billing_subscriptions(status);

create index if not exists idx_billing_subscriptions_customer_email
  on public.billing_subscriptions(lower(customer_email));

alter table public.billing_subscriptions enable row level security;

revoke all on table public.billing_subscriptions from anon;
revoke all on table public.billing_subscriptions from authenticated;
grant select on table public.billing_subscriptions to authenticated;

drop policy if exists billing_subscriptions_staff_select
  on public.billing_subscriptions;

create policy billing_subscriptions_staff_select
  on public.billing_subscriptions
  for select
  to authenticated
  using (public.is_staff_admin());

comment on table public.billing_subscriptions is
  'Canonical Mollie recurring billing records. Writes are server/service-role only; staff may read via RLS.';
