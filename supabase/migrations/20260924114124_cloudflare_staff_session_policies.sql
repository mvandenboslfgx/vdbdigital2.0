drop policy if exists "Staff can read contact submissions" on public.contact_submissions;
create policy "Staff can read contact submissions"
on public.contact_submissions for select to authenticated
using (public.is_staff_admin());

drop policy if exists "Staff can read quote requests" on public.quote_requests;
create policy "Staff can read quote requests"
on public.quote_requests for select to authenticated
using (public.is_staff_admin());

drop policy if exists "Staff can read leads" on public.leads;
create policy "Staff can read leads"
on public.leads for select to authenticated
using (public.is_staff_admin());

drop policy if exists "Staff can manage organizations" on public.organizations;
create policy "Staff can manage organizations"
on public.organizations for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());
