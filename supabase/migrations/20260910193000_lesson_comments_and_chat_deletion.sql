-- EO Academy: per-lesson student comments and secure admin conversation deletion.

-- Keep existing registered students visible to the authenticated admin.
alter table public.profiles
  add column if not exists is_archived boolean not null default false;

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;

grant select on table public.profiles, public.enrollments to authenticated;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles_own_or_admin_select" on public.profiles;
create policy "profiles_own_or_admin_select"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "enrollments_own_select" on public.enrollments;
create policy "enrollments_own_select"
  on public.enrollments
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
  );

create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists lesson_comments_lesson_created_idx
  on public.lesson_comments (lesson_id, created_at desc);

create index if not exists lesson_comments_user_idx
  on public.lesson_comments (user_id);

alter table public.lesson_comments enable row level security;

revoke all on table public.lesson_comments from anon;
grant select, insert, delete on table public.lesson_comments to authenticated;

drop policy if exists "lesson_comments_enrolled_select" on public.lesson_comments;
drop policy if exists "lesson_comments_own_insert" on public.lesson_comments;
drop policy if exists "lesson_comments_own_or_admin_delete" on public.lesson_comments;

create policy "lesson_comments_enrolled_select"
  on public.lesson_comments
  for select
  to authenticated
  using (
    (select public.is_admin())
    or public.lesson_is_unlocked((select auth.uid()), lesson_id)
  );

create policy "lesson_comments_own_insert"
  on public.lesson_comments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and author_name = (
      select profile.full_name
      from public.profiles as profile
      where profile.id = (select auth.uid())
    )
    and public.lesson_is_unlocked((select auth.uid()), lesson_id)
  );

create policy "lesson_comments_own_or_admin_delete"
  on public.lesson_comments
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
  );

-- support_messages is deleted automatically by its existing ON DELETE CASCADE FK.
grant delete on table public.support_threads to authenticated;

drop policy if exists "threads_admin_delete" on public.support_threads;
create policy "threads_admin_delete"
  on public.support_threads
  for delete
  to authenticated
  using ((select public.is_admin()));

notify pgrst, 'reload schema';
