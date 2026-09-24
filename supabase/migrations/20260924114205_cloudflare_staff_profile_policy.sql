drop policy if exists "Staff can read profiles" on public.profiles;
create policy "Staff can read profiles"
on public.profiles for select to authenticated
using (public.is_staff_admin());
