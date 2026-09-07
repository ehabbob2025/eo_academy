-- EO Academy Learning Engine — initial schema
-- Run this file in Supabase SQL Editor once on a new project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('student', 'reviewer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('active', 'completed', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('submitted', 'needs_changes', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  audience_role text not null default '',
  goal text not null default '',
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  pass_score smallint not null default 70 check (pass_score between 1 and 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position smallint not null check (position > 0),
  title text not null,
  description text not null default '',
  duration_minutes smallint not null default 0 check (duration_minutes >= 0),
  release_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, position)
);

-- Sensitive media is isolated from public lesson metadata.
create table if not exists public.lesson_media (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  youtube_video_id text not null check (char_length(youtube_video_id) between 6 and 32),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  source text not null default '',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, course_id)
);

create table if not exists public.social_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'facebook', 'tiktok')),
  action text not null check (action in ('clicked', 'self_confirmed')),
  created_at timestamptz not null default now(),
  unique(user_id, course_id, platform, action)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  position smallint not null check (position > 0),
  prompt text not null,
  explanation text not null default '',
  is_published boolean not null default true,
  unique(lesson_id, position)
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  position smallint not null check (position > 0),
  label text not null,
  unique(question_id, position)
);

-- Never expose this table to students. Scoring happens inside submit_quiz().
create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_option_id uuid not null references public.quiz_options(id) on delete cascade
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_at timestamptz,
  quiz_passed boolean not null default false,
  best_score numeric(5,2) not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  correct_count integer not null,
  total_count integer not null,
  score numeric(5,2) not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  storage_path text not null,
  student_note text not null default '',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_note text not null default '',
  score numeric(5,2),
  status public.project_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_number text unique not null,
  verification_token uuid unique not null default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, course_id)
);

create table if not exists public.event_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  course_id uuid references public.courses(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();
drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.lesson_is_unlocked(p_user_id uuid, p_lesson_id uuid)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_position integer;
  v_release_at timestamptz;
begin
  if p_user_id is null then return false; end if;
  select course_id, position, release_at into v_course_id, v_position, v_release_at
  from public.lessons where id = p_lesson_id and is_published = true;
  if v_course_id is null then return false; end if;
  if v_release_at is not null and v_release_at > now() then return false; end if;
  if not exists (
    select 1 from public.enrollments
    where user_id = p_user_id and course_id = v_course_id and status in ('active', 'completed')
  ) then return false; end if;
  return not exists (
    select 1
    from public.lessons previous
    where previous.course_id = v_course_id
      and previous.is_published = true
      and previous.position < v_position
      and not exists (
        select 1 from public.lesson_progress progress
        where progress.user_id = p_user_id
          and progress.lesson_id = previous.id
          and progress.quiz_passed = true
      )
  );
end;
$$;

create or replace function public.course_is_complete(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists(select 1 from public.enrollments where user_id = p_user_id and course_id = p_course_id)
    and not exists (
      select 1 from public.lessons lesson
      where lesson.course_id = p_course_id and lesson.is_published = true
        and not exists (
          select 1 from public.lesson_progress progress
          where progress.user_id = p_user_id and progress.lesson_id = lesson.id and progress.quiz_passed = true
        )
    );
$$;

create or replace function public.mark_lesson_watched(p_lesson_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.lesson_is_unlocked(auth.uid(), p_lesson_id) then raise exception 'lesson_locked'; end if;
  insert into public.lesson_progress (user_id, lesson_id, watched_at)
  values (auth.uid(), p_lesson_id, now())
  on conflict (user_id, lesson_id) do update set watched_at = coalesce(public.lesson_progress.watched_at, excluded.watched_at), updated_at = now();
end;
$$;

create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer;
  v_correct integer;
  v_score numeric(5,2);
  v_pass_score integer;
  v_passed boolean;
begin
  if not public.lesson_is_unlocked(auth.uid(), p_lesson_id) then raise exception 'lesson_locked'; end if;
  if not exists (select 1 from public.lesson_progress where user_id = auth.uid() and lesson_id = p_lesson_id and watched_at is not null) then raise exception 'watch_required'; end if;

  select count(*) into v_total from public.quiz_questions where lesson_id = p_lesson_id and is_published = true;
  if v_total = 0 then raise exception 'quiz_empty'; end if;

  select count(*) into v_correct
  from public.quiz_questions question
  join public.quiz_answer_keys answer_key on answer_key.question_id = question.id
  where question.lesson_id = p_lesson_id and question.is_published = true
    and p_answers ->> question.id::text = answer_key.correct_option_id::text;

  select course.pass_score into v_pass_score
  from public.lessons lesson join public.courses course on course.id = lesson.course_id
  where lesson.id = p_lesson_id;

  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);
  v_passed := v_score >= v_pass_score;

  insert into public.quiz_attempts (user_id, lesson_id, answers, correct_count, total_count, score, passed)
  values (auth.uid(), p_lesson_id, p_answers, v_correct, v_total, v_score, v_passed);

  insert into public.lesson_progress (user_id, lesson_id, quiz_passed, best_score, completed_at)
  values (auth.uid(), p_lesson_id, v_passed, v_score, case when v_passed then now() end)
  on conflict (user_id, lesson_id) do update set
    quiz_passed = public.lesson_progress.quiz_passed or excluded.quiz_passed,
    best_score = greatest(public.lesson_progress.best_score, excluded.best_score),
    completed_at = coalesce(public.lesson_progress.completed_at, excluded.completed_at),
    updated_at = now();

  return jsonb_build_object('score', v_score, 'passed', v_passed, 'correctCount', v_correct, 'totalCount', v_total);
end;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_media enable row level security;
alter table public.enrollments enable row level security;
alter table public.social_actions enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.project_submissions enable row level security;
alter table public.certificates enable row level security;
alter table public.event_log enable row level security;

create policy "profiles_own_or_admin_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_own_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "courses_public_or_admin_select" on public.courses for select using (is_published or public.is_admin());
create policy "courses_admin_manage" on public.courses for all using (public.is_admin()) with check (public.is_admin());
create policy "lessons_published_select" on public.lessons for select using (is_published or public.is_admin());
create policy "lessons_admin_manage" on public.lessons for all using (public.is_admin()) with check (public.is_admin());
create policy "media_unlocked_select" on public.lesson_media for select using (public.is_admin() or public.lesson_is_unlocked(auth.uid(), lesson_id));
create policy "media_admin_manage" on public.lesson_media for all using (public.is_admin()) with check (public.is_admin());
create policy "enrollments_own_select" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
create policy "enrollments_own_insert" on public.enrollments for insert with check (user_id = auth.uid());
create policy "enrollments_admin_manage" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy "social_actions_own_select" on public.social_actions for select using (user_id = auth.uid() or public.is_admin());
create policy "social_actions_own_insert" on public.social_actions for insert with check (user_id = auth.uid());
create policy "questions_unlocked_select" on public.quiz_questions for select using (public.is_admin() or public.lesson_is_unlocked(auth.uid(), lesson_id));
create policy "questions_admin_manage" on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "options_unlocked_select" on public.quiz_options for select using (public.is_admin() or exists(select 1 from public.quiz_questions q where q.id = question_id and public.lesson_is_unlocked(auth.uid(), q.lesson_id)));
create policy "options_admin_manage" on public.quiz_options for all using (public.is_admin()) with check (public.is_admin());
create policy "answer_keys_admin_only" on public.quiz_answer_keys for all using (public.is_admin()) with check (public.is_admin());
create policy "progress_own_select" on public.lesson_progress for select using (user_id = auth.uid() or public.is_admin());
create policy "attempts_own_select" on public.quiz_attempts for select using (user_id = auth.uid() or public.is_admin());
create policy "projects_own_select" on public.project_submissions for select using (user_id = auth.uid() or public.is_admin());
create policy "projects_after_completion_insert" on public.project_submissions for insert with check (user_id = auth.uid() and public.course_is_complete(auth.uid(), course_id));
create policy "projects_admin_update" on public.project_submissions for update using (public.is_admin()) with check (public.is_admin());
create policy "certificates_own_select" on public.certificates for select using (user_id = auth.uid() or public.is_admin());
create policy "certificates_admin_manage" on public.certificates for all using (public.is_admin()) with check (public.is_admin());
create policy "events_own_insert" on public.event_log for insert with check (user_id = auth.uid());
create policy "events_admin_select" on public.event_log for select using (public.is_admin());

grant select on public.courses to anon, authenticated;
grant all on public.courses, public.lessons, public.lesson_media, public.quiz_questions, public.quiz_options, public.quiz_answer_keys, public.project_submissions, public.certificates to authenticated;
grant select on public.lesson_progress, public.quiz_attempts to authenticated;
grant select, insert on public.enrollments, public.social_actions, public.event_log to authenticated;
grant usage, select on sequence public.event_log_id_seq to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, audience_role, goal, updated_at) on public.profiles to authenticated;
grant insert on public.project_submissions to authenticated;
grant execute on function public.mark_lesson_watched(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-projects', 'course-projects', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "students_upload_own_projects" on storage.objects for insert to authenticated
with check (bucket_id = 'course-projects' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "students_read_own_projects" on storage.objects for select to authenticated
using (bucket_id = 'course-projects' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "admins_manage_projects" on storage.objects for all to authenticated
using (bucket_id = 'course-projects' and public.is_admin())
with check (bucket_id = 'course-projects' and public.is_admin());

-- Seed one dynamic course with five placeholder lessons.
insert into public.courses (id, slug, title, subtitle, description, pass_score, is_published)
values (
  '11111111-1111-4111-8111-111111111111',
  'free-nutrition-course',
  'الكورس المجاني في أساسيات التغذية',
  '٥ محاضرات + اختبارات + مشروع تخرج + شهادة إتمام',
  'استبدل الوصف والمحتوى من لوحة الأدمن.',
  70,
  true
)
on conflict (id) do update set updated_at = now();

insert into public.lessons (id, course_id, position, title, description, duration_minutes, is_published)
values
  ('21111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',1,'المحاضرة الأولى','أضف العنوان والوصف من لوحة الأدمن.',25,true),
  ('21111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',2,'المحاضرة الثانية','تُفتح بعد اجتياز اختبار المحاضرة السابقة.',25,true),
  ('21111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111',3,'المحاضرة الثالثة','تُفتح بعد اجتياز اختبار المحاضرة السابقة.',25,true),
  ('21111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111111',4,'المحاضرة الرابعة','تُفتح بعد اجتياز اختبار المحاضرة السابقة.',25,true),
  ('21111111-1111-4111-8111-111111111115','11111111-1111-4111-8111-111111111111',5,'المحاضرة الخامسة','بعدها يتفتح مشروع التخرج.',25,true)
on conflict (id) do nothing;

-- بعد أول تسجيل: غيّر YOUR_EMAIL إلى إيميل الأدمن وشغّل السطر التالي مرة واحدة.
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
