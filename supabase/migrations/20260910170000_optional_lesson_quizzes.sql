-- EO Academy: optional quizzes per lesson.
alter table public.lessons
  add column if not exists quiz_enabled boolean not null default true;

comment on column public.lessons.quiz_enabled is
  'When false, watching at least 85 percent completes the lesson without a quiz.';

-- The first lesson is the course introduction and does not require a quiz.
update public.lessons
set quiz_enabled = false
where course_id = '11111111-1111-4111-8111-111111111111'
  and position = 1;

create or replace function public.lesson_is_unlocked(p_user_id uuid, p_lesson_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_position integer;
  v_release_at timestamptz;
begin
  if p_user_id is null then return false; end if;

  select course_id, position, release_at
  into v_course_id, v_position, v_release_at
  from public.lessons
  where id = p_lesson_id
    and is_published = true;

  if v_course_id is null then return false; end if;
  if v_release_at is not null and v_release_at > now() then return false; end if;

  if not exists (
    select 1
    from public.enrollments
    where user_id = p_user_id
      and course_id = v_course_id
      and status in ('active', 'completed')
  ) then
    return false;
  end if;

  return not exists (
    select 1
    from public.lessons previous
    where previous.course_id = v_course_id
      and previous.is_published = true
      and previous.position < v_position
      and not exists (
        select 1
        from public.lesson_progress progress
        where progress.user_id = p_user_id
          and progress.lesson_id = previous.id
          and (
            (previous.quiz_enabled and progress.quiz_passed = true)
            or
            (
              not previous.quiz_enabled
              and progress.watched_seconds >= ceil(greatest(previous.duration_minutes, 1) * 60 * 0.85)
            )
          )
      )
  );
end;
$$;

create or replace function public.course_is_complete(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments
    where user_id = p_user_id
      and course_id = p_course_id
      and status in ('active', 'completed')
  )
  and not exists (
    select 1
    from public.lessons lesson
    where lesson.course_id = p_course_id
      and lesson.is_published = true
      and not exists (
        select 1
        from public.lesson_progress progress
        where progress.user_id = p_user_id
          and progress.lesson_id = lesson.id
          and (
            (lesson.quiz_enabled and progress.quiz_passed = true)
            or
            (
              not lesson.quiz_enabled
              and progress.watched_seconds >= ceil(greatest(lesson.duration_minutes, 1) * 60 * 0.85)
            )
          )
      )
  );
$$;

revoke execute on function public.lesson_is_unlocked(uuid, uuid) from public, anon;
grant execute on function public.lesson_is_unlocked(uuid, uuid) to authenticated;

revoke execute on function public.course_is_complete(uuid, uuid) from public, anon;
grant execute on function public.course_is_complete(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
