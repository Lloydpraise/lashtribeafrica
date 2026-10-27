-- 0027_verified_course_completion.sql
-- A certificate now means the student really went through the course. The browser can no longer
-- decide that a lesson is done or that a quiz was passed; the database does.
--
--   1. Quiz answers never reach the browser. Students get lessons through get_lesson_content(), which
--      removes the correct answer and explanation from every quiz question.
--   2. The database marks quizzes. quiz_answer() checks one answer at a time (so the instant
--      "Correct / Not quite" feedback stays), records it on an attempt (the first answer to a question
--      counts, it can't be changed), and scores the attempt when the last question is answered.
--   3. Students can't write "completed" any more. They can still save where they are. A lesson is
--      only marked done by the database:
--        * quiz lesson:    a passed attempt
--        * video lesson:   open for at least half the video's length (so 2x speed still works)
--        * reading lesson: open for at least half its stated reading time (min 30 seconds)
--      "Open since" is the server time of the first visit (start_lesson()), not a browser clock.
--   4. issue_certificate() also needs a passed attempt for every quiz in the course.
--   5. Admins can read quiz attempts and revoke a certificate (optionally resetting the course).
--
-- DEPLOY ORDER: deploy the new site code first, then run this in the SQL editor. The new code works
-- before and after this migration; the old code can't grade quizzes once answers are hidden.
-- Run after 0026; safe to re-run. Does not need 0018.
--
-- Students who finished lessons before this migration keep them, but must pass each quiz once more
-- (there is no server record of their old attempt) before a NEW certificate is issued. Certificates
-- already issued are not touched.

-- ---------------------------------------------------------------------
-- 1. When did the student first open each lesson (server time)
-- ---------------------------------------------------------------------
alter table public.lesson_progress add column if not exists started_at timestamptz;
update public.lesson_progress set started_at = least(updated_at, coalesce(completed_at, updated_at)) where started_at is null;
alter table public.lesson_progress alter column started_at set default now();

-- ---------------------------------------------------------------------
-- 2. Students can save their place, but only the database sets completed / started_at
-- ---------------------------------------------------------------------
-- Runs as the caller (not security definer) so current_user tells API students apart from the SQL editor
-- and from the database's own functions below, which run as the owner.
create or replace function public._lesson_progress_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.position_seconds := greatest(0, coalesce(new.position_seconds, 0));
  if current_user not in ('anon', 'authenticated')
     or coalesce(current_setting('lashtribe.progress_server', true), '') = 'on'
     or public.is_academy_admin() then
    new.started_at := coalesce(new.started_at, now());
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.started_at := now();
    new.completed := false;
    new.completed_at := null;
  else
    new.user_id := old.user_id;
    new.lesson_id := old.lesson_id;
    new.course_id := old.course_id;
    new.started_at := coalesce(old.started_at, now());
    new.completed := old.completed;
    new.completed_at := old.completed_at;
  end if;
  return new;
end;
$$;
revoke all on function public._lesson_progress_guard() from public, anon, authenticated;

drop trigger if exists lesson_progress_guard on public.lesson_progress;
create trigger lesson_progress_guard
  before insert or update on public.lesson_progress
  for each row execute function public._lesson_progress_guard();

-- internal: mark a lesson done for the signed-in student (only called by the functions below)
create or replace function public._mark_lesson_done(p_user uuid, p_lesson uuid, p_course uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('lashtribe.progress_server', 'on', true);
  insert into public.lesson_progress (user_id, lesson_id, course_id, completed, completed_at, updated_at)
  values (p_user, p_lesson, p_course, true, now(), now())
  on conflict (user_id, lesson_id) do update
    set completed = true, completed_at = coalesce(public.lesson_progress.completed_at, now()), updated_at = now();
  perform set_config('lashtribe.progress_server', '', true);
end;
$$;
revoke all on function public._mark_lesson_done(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Quiz attempts (written only by quiz_answer)
-- ---------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,     -- { "<question index>": { "choice": n, "correct": true|false } }
  total integer not null,
  pass_score integer not null,
  score integer,
  pct integer,
  passed boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id, lesson_id, started_at desc);

alter table public.quiz_attempts enable row level security;
drop policy if exists "quiz_attempts_own_read" on public.quiz_attempts;
create policy "quiz_attempts_own_read" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "quiz_attempts_admin_all" on public.quiz_attempts;
create policy "quiz_attempts_admin_all" on public.quiz_attempts
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 4. Lesson content for students, without quiz answers
-- ---------------------------------------------------------------------
create or replace function public._can_open_lesson(p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_academy_admin() or exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = p_lesson and l.status = 'published' and c.status = 'published'
      and (l.is_preview or public.has_course_access(l.course_id))
  );
$$;
revoke all on function public._can_open_lesson(uuid) from public, anon, authenticated;

create or replace function public.get_lesson_content(p_lesson uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_video jsonb; v_blocks jsonb;
begin
  if not public._can_open_lesson(p_lesson) then return null; end if;
  select lc.video, lc.blocks into v_video, v_blocks from public.lesson_content lc where lc.lesson_id = p_lesson;
  if not found then return null; end if;
  select coalesce(jsonb_agg(
           case when b->>'type' = 'quiz' then
             jsonb_set(b, '{questions}', coalesce((
               select jsonb_agg(q - 'answer' - 'explain' order by n)
               from jsonb_array_elements(case when jsonb_typeof(b->'questions') = 'array' then b->'questions' else '[]'::jsonb end)
                    with ordinality x(q, n)
             ), '[]'::jsonb))
           else b end
           order by o), '[]'::jsonb)
    into v_blocks
  from jsonb_array_elements(case when jsonb_typeof(v_blocks) = 'array' then v_blocks else '[]'::jsonb end) with ordinality y(b, o);
  return jsonb_build_object('video', v_video, 'blocks', v_blocks);
end;
$$;
revoke all on function public.get_lesson_content(uuid) from public, anon, authenticated;
grant execute on function public.get_lesson_content(uuid) to anon, authenticated;

-- Reading the table directly now needs an admin (the admin course editor). Students use the function above.
drop policy if exists "lesson_content_entitled_read" on public.lesson_content;
drop policy if exists "lesson_content_anon_read" on public.lesson_content;

-- ---------------------------------------------------------------------
-- 5. The student opened a lesson: remember when (first time only)
-- ---------------------------------------------------------------------
create or replace function public.start_lesson(p_lesson uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_course uuid;
begin
  if v_uid is null then return; end if;
  select l.course_id into v_course from public.lessons l join public.courses c on c.id = l.course_id
   where l.id = p_lesson and l.status = 'published' and c.status = 'published';
  if v_course is null or not public.has_course_access(v_course) then return; end if;
  perform set_config('lashtribe.progress_server', 'on', true);
  insert into public.lesson_progress (user_id, lesson_id, course_id, started_at)
  values (v_uid, p_lesson, v_course, now())
  on conflict (user_id, lesson_id) do update
    set started_at = coalesce(public.lesson_progress.started_at, now());
  perform set_config('lashtribe.progress_server', '', true);
end;
$$;
revoke all on function public.start_lesson(uuid) from public, anon;
grant execute on function public.start_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Check one quiz answer
--    Returns { attempt_id, correct, answer, explain, done, score, total, pct, passed, pass_score }
-- ---------------------------------------------------------------------
create or replace function public.quiz_answer(p_lesson uuid, p_question integer, p_choice integer, p_attempt uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.lessons%rowtype;
  v_quiz jsonb;
  v_q jsonb;
  v_total integer;
  v_pass integer;
  v_att public.quiz_attempts%rowtype;
  v_choice integer;
  v_correct boolean;
  v_answered integer;
  v_score integer;
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select * into v_lesson from public.lessons where id = p_lesson;
  if not found or not public._can_open_lesson(p_lesson) then raise exception 'You do not have access to this lesson'; end if;

  select b into v_quiz
  from public.lesson_content lc, jsonb_array_elements(case when jsonb_typeof(lc.blocks) = 'array' then lc.blocks else '[]'::jsonb end) b
  where lc.lesson_id = p_lesson and b->>'type' = 'quiz'
  limit 1;
  if v_quiz is null or jsonb_typeof(v_quiz->'questions') <> 'array' then raise exception 'This lesson has no quiz'; end if;
  v_total := jsonb_array_length(v_quiz->'questions');
  if v_total = 0 then raise exception 'This quiz has no questions yet'; end if;
  if p_question is null or p_question < 0 or p_question >= v_total then raise exception 'Unknown question'; end if;
  v_pass := coalesce(case when (v_quiz->>'passScore') ~ '^[0-9]+$' then (v_quiz->>'passScore')::integer end, 60);

  if p_attempt is not null then
    select * into v_att from public.quiz_attempts
     where id = p_attempt and user_id = v_uid and lesson_id = p_lesson and finished_at is null;
  end if;
  if v_att.id is null then
    insert into public.quiz_attempts (user_id, lesson_id, course_id, total, pass_score)
    values (v_uid, p_lesson, v_lesson.course_id, v_total, v_pass)
    returning * into v_att;
  end if;

  v_q := v_quiz->'questions'->p_question;
  if v_att.answers ? p_question::text then
    v_choice := (v_att.answers->p_question::text->>'choice')::integer;   -- the first answer counts
  else
    v_choice := p_choice;
  end if;
  v_correct := v_choice is not null and (v_q->>'answer') ~ '^[0-9]+$' and (v_q->>'answer')::integer = v_choice;

  update public.quiz_attempts
     set answers = answers || jsonb_build_object(p_question::text, jsonb_build_object('choice', v_choice, 'correct', v_correct))
   where id = v_att.id and not (answers ? p_question::text)
  returning * into v_att;
  if v_att.id is null then select * into v_att from public.quiz_attempts where id = p_attempt; end if;

  select count(*), count(*) filter (where (value->>'correct')::boolean) into v_answered, v_score
  from jsonb_each(v_att.answers);

  if v_answered >= v_total and v_att.finished_at is null then
    update public.quiz_attempts set
      score = v_score,
      pct = round(v_score * 100.0 / v_total),
      passed = round(v_score * 100.0 / v_total) >= v_pass,
      finished_at = now()
    where id = v_att.id
    returning * into v_att;
    if v_att.passed and public.has_course_access(v_lesson.course_id) then
      perform public._mark_lesson_done(v_uid, p_lesson, v_lesson.course_id);
    end if;
  end if;

  return jsonb_build_object(
    'attempt_id', v_att.id,
    'correct', v_correct,
    'answer', case when (v_q->>'answer') ~ '^[0-9]+$' then (v_q->>'answer')::integer end,
    'explain', v_q->>'explain',
    'done', v_att.finished_at is not null,
    'score', v_att.score,
    'total', v_total,
    'pct', v_att.pct,
    'passed', v_att.passed,
    'pass_score', v_pass
  );
end;
$$;
revoke all on function public.quiz_answer(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.quiz_answer(uuid, integer, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Ask the database to mark a lesson done
--    Returns { completed, reason?, wait_seconds? }   reason: 'quiz' | 'time'
-- ---------------------------------------------------------------------
create or replace function public.complete_lesson(p_lesson uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lesson public.lessons%rowtype;
  v_prog public.lesson_progress%rowtype;
  v_dur numeric := 0;
  v_need numeric;
  v_elapsed numeric;
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select l.* into v_lesson from public.lessons l join public.courses c on c.id = l.course_id
   where l.id = p_lesson and l.status = 'published' and c.status = 'published';
  if not found or not public.has_course_access(v_lesson.course_id) then raise exception 'You do not have access to this lesson'; end if;

  select * into v_prog from public.lesson_progress where user_id = v_uid and lesson_id = p_lesson;
  if v_prog.completed then return jsonb_build_object('completed', true); end if;

  if v_lesson.kind = 'assessment' then
    if exists (select 1 from public.quiz_attempts a where a.user_id = v_uid and a.lesson_id = p_lesson and a.passed) then
      perform public._mark_lesson_done(v_uid, p_lesson, v_lesson.course_id);
      return jsonb_build_object('completed', true);
    end if;
    return jsonb_build_object('completed', false, 'reason', 'quiz');
  end if;

  if v_lesson.kind = 'video' then
    v_dur := coalesce(nullif(v_lesson.duration_seconds, 0), 0);
    if v_dur = 0 then
      select case when (lc.video->>'duration') ~ '^[0-9]+(\.[0-9]+)?$' then (lc.video->>'duration')::numeric else 0 end
        into v_dur from public.lesson_content lc where lc.lesson_id = p_lesson;
    end if;
    v_need := case when coalesce(v_dur, 0) > 0 then greatest(30, v_dur * 0.5) else 60 end;
  else
    v_need := greatest(30, coalesce(nullif(v_lesson.read_minutes, 0), 3) * 30);
  end if;

  if v_prog.started_at is null then
    perform public.start_lesson(p_lesson);
    return jsonb_build_object('completed', false, 'reason', 'time', 'wait_seconds', ceil(v_need));
  end if;

  v_elapsed := extract(epoch from now() - v_prog.started_at);
  if v_elapsed >= v_need then
    perform public._mark_lesson_done(v_uid, p_lesson, v_lesson.course_id);
    return jsonb_build_object('completed', true);
  end if;
  return jsonb_build_object('completed', false, 'reason', 'time', 'wait_seconds', ceil(v_need - v_elapsed));
end;
$$;
revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Certificates: every lesson done AND every quiz passed on the server
-- ---------------------------------------------------------------------
create or replace function public.issue_certificate(p_course uuid)
returns public.course_certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses%rowtype;
  v_total integer;
  v_done integer;
  v_cust public.customers%rowtype;
  v_cert public.course_certificates;
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  select * into v_course from public.courses where id = p_course and status = 'published';
  if not found then raise exception 'Course not found'; end if;
  if not v_course.certificate_enabled then raise exception 'This course does not issue a certificate'; end if;
  if not public.has_course_access(p_course) then raise exception 'You do not have access to this course'; end if;

  select * into v_cert from public.course_certificates where user_id = v_uid and course_id = p_course;
  if found then return v_cert; end if;

  select count(*) into v_total from public.lessons where course_id = p_course and status = 'published';
  select count(*) into v_done
  from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
  where lp.user_id = v_uid and lp.course_id = p_course and lp.completed and l.status = 'published' and l.course_id = p_course;
  if v_total = 0 or v_done < v_total then
    raise exception 'Finish every lesson to earn your certificate (% of % done)', v_done, v_total;
  end if;

  if exists (
    select 1 from public.lessons l
    where l.course_id = p_course and l.status = 'published' and l.kind = 'assessment'
      and not exists (select 1 from public.quiz_attempts a where a.user_id = v_uid and a.lesson_id = l.id and a.passed)
  ) then
    raise exception 'Pass every quiz in this course to earn your certificate';
  end if;

  select * into v_cust from public.customers where user_id = v_uid;
  insert into public.course_certificates (user_id, customer_id, course_id, holder_name, course_title)
  values (
    v_uid, v_cust.id, p_course,
    coalesce(nullif(v_cust.full_name, ''), (select raw_user_meta_data->>'full_name' from auth.users where id = v_uid), 'Student'),
    v_course.title
  )
  returning * into v_cert;
  return v_cert;
end;
$$;
revoke all on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Admin: revoke a certificate (and optionally make the student redo the course)
-- ---------------------------------------------------------------------
create or replace function public.admin_revoke_certificate(p_user uuid, p_course uuid, p_reset_progress boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  delete from public.course_certificates where user_id = p_user and course_id = p_course;
  if p_reset_progress then
    delete from public.lesson_progress where user_id = p_user and course_id = p_course;
    delete from public.quiz_attempts where user_id = p_user and course_id = p_course;
  end if;
end;
$$;
revoke all on function public.admin_revoke_certificate(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_revoke_certificate(uuid, uuid, boolean) to authenticated;
