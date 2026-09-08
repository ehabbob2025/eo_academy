-- EO Academy: student management, saved quiz results, and server-timed 85% lesson gate.
alter table public.profiles
  add column if not exists is_archived boolean not null default false;

alter table public.lesson_progress
  add column if not exists watched_seconds integer not null default 0,
  add column if not exists last_watch_at timestamptz;

grant update (full_name, is_archived) on table public.profiles to authenticated;

create or replace function public.record_lesson_watch(p_lesson_id uuid, p_increment_seconds integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration_seconds integer;
  v_required_seconds integer;
  v_previous_seconds integer := 0;
  v_last_watch_at timestamptz;
  v_increment integer := 0;
  v_watched_seconds integer := 0;
begin
  if not public.lesson_is_unlocked(auth.uid(), p_lesson_id) then
    raise exception 'lesson_locked';
  end if;

  select greatest(duration_minutes, 1) * 60
  into v_duration_seconds
  from public.lessons
  where id = p_lesson_id and is_published = true;

  if v_duration_seconds is null then
    raise exception 'lesson_not_found';
  end if;

  v_required_seconds := ceil(v_duration_seconds * 0.85);

  select watched_seconds, last_watch_at
  into v_previous_seconds, v_last_watch_at
  from public.lesson_progress
  where user_id = auth.uid() and lesson_id = p_lesson_id;

  -- The browser cannot choose the elapsed time. The server only credits
  -- real time since the previous visible heartbeat, capped at 15 seconds.
  if v_last_watch_at is not null then
    v_increment := least(15, greatest(0, floor(extract(epoch from now() - v_last_watch_at))::integer));
  end if;

  insert into public.lesson_progress (user_id, lesson_id, watched_seconds, last_watch_at, watched_at)
  values (auth.uid(), p_lesson_id, v_increment, now(), case when v_increment >= v_required_seconds then now() end)
  on conflict (user_id, lesson_id) do update set
    watched_seconds = least(public.lesson_progress.watched_seconds + v_increment, v_duration_seconds),
    last_watch_at = now(),
    watched_at = case
      when public.lesson_progress.watched_seconds + v_increment >= v_required_seconds
      then coalesce(public.lesson_progress.watched_at, now())
      else public.lesson_progress.watched_at
    end,
    updated_at = now()
  returning watched_seconds into v_watched_seconds;

  return jsonb_build_object(
    'watchedSeconds', v_watched_seconds,
    'durationSeconds', v_duration_seconds,
    'requiredSeconds', v_required_seconds,
    'eligibleForQuiz', v_watched_seconds >= v_required_seconds
  );
end;
$$;

grant execute on function public.record_lesson_watch(uuid, integer) to authenticated;

