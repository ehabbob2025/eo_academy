-- EO Academy — secure owner admin + internal student support chat

-- Make the chosen owner an admin now, and automatically when this email signs up later.
update public.profiles
set role = 'admin', updated_at = now()
where id = (select id from auth.users where lower(email) = 'bobhendam@gmail.com');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when lower(coalesce(new.email, '')) = 'bobhendam@gmail.com'
      then 'admin'::public.app_role else 'student'::public.app_role end
  )
  on conflict (id) do update
    set role = case when lower(coalesce(new.email, '')) = 'bobhendam@gmail.com'
      then 'admin'::public.app_role else public.profiles.role end;
  return new;
end;
$$;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_thread_created_idx
  on public.support_messages(thread_id, created_at);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy "threads_own_or_admin_select" on public.support_threads
  for select using (user_id = auth.uid() or public.is_admin());
create policy "threads_own_insert" on public.support_threads
  for insert with check (user_id = auth.uid());
create policy "threads_admin_update" on public.support_threads
  for update using (public.is_admin()) with check (public.is_admin());

create policy "messages_thread_member_select" on public.support_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );
create policy "messages_thread_member_insert" on public.support_messages
  for insert with check (
    sender_id = auth.uid() and (
      public.is_admin() or exists (
        select 1 from public.support_threads t
        where t.id = thread_id and t.user_id = auth.uid()
      )
    )
  );
create policy "messages_admin_update" on public.support_messages
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.support_threads to authenticated;
grant update (status, last_message_at) on public.support_threads to authenticated;
grant select, insert on public.support_messages to authenticated;
grant update (read_at) on public.support_messages to authenticated;

create or replace function public.touch_support_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_threads set last_message_at = now(), status = 'open' where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists support_message_touch_thread on public.support_messages;
create trigger support_message_touch_thread after insert on public.support_messages
for each row execute function public.touch_support_thread();

do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null; end $$;

