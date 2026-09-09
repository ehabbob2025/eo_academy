alter table public.profiles
  add column if not exists contact_email text not null default '';

create or replace function public.save_student_profile(
  p_full_name text,
  p_phone text,
  p_contact_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (id, full_name, phone, contact_email)
  values (auth.uid(), trim(p_full_name), trim(p_phone), lower(trim(p_contact_email)))
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    contact_email = excluded.contact_email,
    updated_at = now();
end;
$$;

grant execute on function public.save_student_profile(text, text, text) to authenticated;
