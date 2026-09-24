create table if not exists public.marketing_preferences (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid null references public.profiles(id) on delete set null,
  status text not null default 'OPTED_OUT'
    check (status in ('OPTED_IN','OPTED_OUT')),
  source text not null,
  locale text not null default 'nl'
    check (locale in ('nl','en')),
  consent_version text not null default 'marketing-v1',
  consented_at timestamptz,
  revoked_at timestamptz,
  resend_synced_at timestamptz,
  resend_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_preferences_email_lower_uq
  on public.marketing_preferences(lower(email));

create index if not exists marketing_preferences_user_id_idx
  on public.marketing_preferences(user_id);

alter table public.marketing_preferences enable row level security;

revoke all on table public.marketing_preferences from anon;
revoke all on table public.marketing_preferences from authenticated;

drop policy if exists marketing_preferences_self_select
  on public.marketing_preferences;
create policy marketing_preferences_self_select
  on public.marketing_preferences
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff_admin());

grant select on table public.marketing_preferences to authenticated;

comment on table public.marketing_preferences is
  'Explicit VDB newsletter/marketing preferences. Transactional email is independent.';
