do $$
begin
  alter type public.lead_status add value if not exists 'WON';
  alter type public.lead_status add value if not exists 'LOST';
exception when duplicate_object then null;
end $$;

alter table public.contact_submissions
  add column if not exists status public.lead_status not null default 'NEW',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists contact_submissions_status_created_idx
  on public.contact_submissions(status, created_at desc);

create index if not exists quote_requests_status_created_idx
  on public.quote_requests(status, created_at desc);

create index if not exists leads_status_created_idx
  on public.leads(status, created_at desc);
