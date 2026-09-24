-- Cloudflare-native public form ingress.
-- The Worker secret is provisioned out-of-band as PUBLIC_FORM_RPC_SECRET.
-- Only its SHA-256 hash is stored here; the actual secret never lives in Git or Postgres.

create table if not exists private.form_rpc_config (
  id text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

alter table private.form_rpc_config enable row level security;
revoke all on table private.form_rpc_config from public, anon, authenticated;

insert into private.form_rpc_config (id, secret_hash, updated_at)
values (
  'public_forms',
  '8b1925e3cc9cd9c533df6727c90ef4025805382e40721db4fd76e464cc530459',
  now()
)
on conflict (id) do update
set secret_hash = excluded.secret_hash,
    updated_at = excluded.updated_at;

create or replace function public.submit_vdb_public_form(
  p_secret text,
  p_kind text,
  p_rate_key text,
  p_payload jsonb
)
returns table(
  ok boolean,
  retry_after_seconds integer,
  record_id uuid,
  error_code text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected_hash text;
  v_actual_hash text;
  v_allowed boolean;
  v_retry integer;
  v_id uuid;
  v_limit integer;
  v_locale text;
  v_name text;
  v_email text;
begin
  select c.secret_hash into v_expected_hash
  from private.form_rpc_config c
  where c.id = 'public_forms';

  if v_expected_hash is null or p_secret is null or char_length(p_secret) < 32 then
    return query select false, 0, null::uuid, 'unauthorized';
    return;
  end if;

  v_actual_hash := encode(extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256'), 'hex');
  if v_actual_hash <> v_expected_hash then
    return query select false, 0, null::uuid, 'unauthorized';
    return;
  end if;

  if p_kind not in ('contact', 'quote', 'support') or p_payload is null then
    return query select false, 0, null::uuid, 'invalid_payload';
    return;
  end if;

  if (
    (p_kind = 'contact' and p_rate_key !~ '^rl:contact:[0-9a-f]{40}$')
    or (p_kind = 'quote' and p_rate_key !~ '^rl:quote:[0-9a-f]{40}$')
    or (p_kind = 'support' and p_rate_key !~ '^rl:support:[0-9a-f]{40}$')
  ) then
    return query select false, 0, null::uuid, 'invalid_rate_key';
    return;
  end if;

  v_limit := case p_kind when 'contact' then 5 when 'quote' then 3 when 'support' then 10 else 1 end;

  select r.allowed, r.retry_after_seconds
    into v_allowed, v_retry
  from public.check_rate_limit(p_rate_key, v_limit, 60) r;

  if coalesce(v_allowed, false) is not true then
    return query select false, greatest(coalesce(v_retry, 60), 1), null::uuid, 'rate_limited';
    return;
  end if;

  v_name := btrim(coalesce(p_payload->>'name', ''));
  v_email := lower(btrim(coalesce(p_payload->>'email', '')));
  v_locale := case when lower(coalesce(p_payload->>'locale', '')) = 'nl' then 'nl' else 'en' end;

  if char_length(v_name) < 2 or char_length(v_name) > 100
     or char_length(v_email) < 5 or char_length(v_email) > 254
     or position('@' in v_email) < 2 then
    return query select false, 0, null::uuid, 'invalid_payload';
    return;
  end if;

  if p_kind = 'contact' then
    if char_length(btrim(coalesce(p_payload->>'subject', ''))) < 3
       or char_length(p_payload->>'subject') > 200
       or char_length(btrim(coalesce(p_payload->>'message', ''))) < 10
       or char_length(p_payload->>'message') > 5000
       or char_length(coalesce(p_payload->>'company', '')) > 200
       or char_length(coalesce(p_payload->>'phone', '')) > 30 then
      return query select false, 0, null::uuid, 'invalid_payload';
      return;
    end if;

    insert into public.contact_submissions (name, email, company, phone, subject, message, locale)
    values (
      v_name, v_email,
      nullif(btrim(coalesce(p_payload->>'company', '')), ''),
      nullif(btrim(coalesce(p_payload->>'phone', '')), ''),
      btrim(p_payload->>'subject'),
      btrim(p_payload->>'message'),
      v_locale
    )
    returning id into v_id;

  elsif p_kind = 'quote' then
    if char_length(btrim(coalesce(p_payload->>'project_type', ''))) < 2
       or char_length(p_payload->>'project_type') > 200
       or char_length(btrim(coalesce(p_payload->>'description', ''))) < 20
       or char_length(p_payload->>'description') > 20000
       or char_length(coalesce(p_payload->>'company', '')) > 200
       or char_length(coalesce(p_payload->>'phone', '')) > 30
       or char_length(coalesce(p_payload->>'budget', '')) > 100
       or char_length(coalesce(p_payload->>'timeline', '')) > 200 then
      return query select false, 0, null::uuid, 'invalid_payload';
      return;
    end if;

    insert into public.quote_requests (
      name, email, company, phone, project_type, budget, timeline, description, status, locale
    )
    values (
      v_name, v_email,
      nullif(btrim(coalesce(p_payload->>'company', '')), ''),
      nullif(btrim(coalesce(p_payload->>'phone', '')), ''),
      btrim(p_payload->>'project_type'),
      nullif(btrim(coalesce(p_payload->>'budget', '')), ''),
      nullif(btrim(coalesce(p_payload->>'timeline', '')), ''),
      btrim(p_payload->>'description'),
      'NEW',
      v_locale
    )
    returning id into v_id;

  else
    if char_length(btrim(coalesce(p_payload->>'subject', ''))) < 3
       or char_length(p_payload->>'subject') > 200
       or char_length(btrim(coalesce(p_payload->>'message', ''))) < 10
       or char_length(p_payload->>'message') > 5000
       or coalesce(p_payload->>'priority', '') not in ('low', 'normal', 'high')
       or char_length(coalesce(p_payload->>'order_reference', '')) > 100 then
      return query select false, 0, null::uuid, 'invalid_payload';
      return;
    end if;

    insert into public.leads (type, name, email, subject, message, status, metadata)
    values (
      'SUPPORT', v_name, v_email,
      btrim(p_payload->>'subject'),
      btrim(p_payload->>'message'),
      'NEW',
      jsonb_build_object(
        'priority', p_payload->>'priority',
        'orderReference', nullif(btrim(coalesce(p_payload->>'order_reference', '')), ''),
        'locale', v_locale
      )
    )
    returning id into v_id;
  end if;

  return query select true, 0, v_id, null::text;
exception
  when others then
    return query select false, 0, null::uuid, 'storage_error';
end;
$function$;

revoke all on function public.submit_vdb_public_form(text, text, text, jsonb) from public;
grant execute on function public.submit_vdb_public_form(text, text, text, jsonb) to anon, authenticated;
