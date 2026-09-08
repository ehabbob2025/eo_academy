-- Let a signed-in student create or update only their own profile.
grant insert (id, full_name, phone, contact_email) on table public.profiles to authenticated;

drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles
  for insert with check (id = auth.uid());

-- Backfill any existing anonymous accounts that were created without a profile.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;
