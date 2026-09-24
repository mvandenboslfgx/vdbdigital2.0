-- Self-service customer onboarding.
-- Every authenticated non-staff user can idempotently receive a private customer workspace.
-- This function never grants admin/staff roles.

create or replace function public.ensure_customer_workspace()
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select u.email,
         coalesce(
           nullif(trim(p.full_name), ''),
           nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
           nullif(trim(split_part(u.email, '@', 1)), ''),
           'Klant'
         )
    into v_email, v_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_user_id;

  if v_email is null then
    raise exception 'authenticated user not found' using errcode = '42501';
  end if;

  insert into public.profiles (id, email, full_name, is_active)
  values (v_user_id, v_email, v_name, true)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        updated_at = now();

  if exists (
    select 1 from public.admin_roles ar where ar.user_id = v_user_id
  ) then
    return null;
  end if;

  select om.organization_id
    into v_org_id
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = v_user_id
    and om.status = 'ACTIVE'
    and o.status not in ('BLOCKED', 'ARCHIVED')
  order by om.created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  insert into public.organizations (
    type, legal_name, trade_name, contact_email, status, locale
  )
  values (
    'CONSUMER', v_name, null, v_email, 'ACTIVE', 'nl'
  )
  returning id into v_org_id;

  insert into public.organization_members (
    organization_id, user_id, customer_role, is_primary_contact, status, joined_at
  )
  values (
    v_org_id, v_user_id, 'PRIMARY', true, 'ACTIVE', now()
  );

  return v_org_id;
end;
$$;

revoke all on function public.ensure_customer_workspace() from public;
revoke all on function public.ensure_customer_workspace() from anon;
grant execute on function public.ensure_customer_workspace() to authenticated;

comment on function public.ensure_customer_workspace() is
  'Idempotently provisions a private customer workspace for the currently authenticated non-staff user.';
