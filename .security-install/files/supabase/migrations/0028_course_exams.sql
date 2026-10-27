-- 0028_course_exams.sql
-- A final exam per course, taken after the last lesson and before the certificate.
--
--   * Admin -> Courses -> open a course -> "Final exam" tab: multiple-choice and single-line questions,
--     a pass mark, and a switch for whether the exam is marked automatically.
--   * Marked automatically: multiple-choice by the correct option, single-line answers by the accepted
--     answers you list (not case sensitive, extra spaces ignored). The student sees the result at once.
--   * Not marked automatically: multiple-choice is still marked straight away, single-line answers wait
--     for you in Admin -> Courses -> "Exams to mark". The student sees "being marked" until then.
--   * The exam opens once every lesson is done. Answers never reach the browser; the database marks.
--   * issue_certificate() needs a passed exam when the course has one switched on.
--
-- Run after 0027 in the SQL editor; safe to re-run. Does not need 0018.

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.course_exams (
  course_id uuid primary key references public.courses(id) on delete cascade,
  enabled boolean not null default true,
  title text not null default 'Final exam',
  intro text not null default '',
  pass_score integer not null default 70 check (pass_score between 1 and 100),
  auto_mark boolean not null default true,
  -- [{ id, type: 'choice'|'text', q, options: [..], answer: <option index>, accepted: [..], points }]
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists course_exams_set_updated_at on public.course_exams;
create trigger course_exams_set_updated_at
  before update on public.course_exams
  for each row execute function public.set_updated_at();

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  questions jsonb not null,                     -- the exam as it was when submitted (for marking later)
  answers jsonb not null default '{}'::jsonb,   -- { "<question id>": <option index> | "<text>" }
  marks jsonb not null default '{}'::jsonb,     -- { "<question id>": true | false }   (missing = waiting for a person)
  score numeric,
  max_score numeric,
  pct integer,
  pass_score integer not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'passed', 'failed')),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index if not exists exam_attempts_user_idx on public.exam_attempts(user_id, course_id, submitted_at desc);
create index if not exists exam_attempts_pending_idx on public.exam_attempts(status, submitted_at) where status = 'pending_review';

alter table public.course_exams enable row level security;
alter table public.exam_attempts enable row level security;

drop policy if exists "course_exams_admin_all" on public.course_exams;
create policy "course_exams_admin_all" on public.course_exams
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- No student read policy: an attempt keeps a copy of the exam WITH its answers. Students see their
-- result through get_course_exam() instead.
drop policy if exists "exam_attempts_own_read" on public.exam_attempts;
drop policy if exists "exam_attempts_admin_all" on public.exam_attempts;
create policy "exam_attempts_admin_all" on public.exam_attempts
  for all to authenticated using (public.is_academy_admin()) with check (public.is_academy_admin());

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
create or replace function public._exam_norm(p text)
returns text
language sql
immutable
as $$ select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')); $$;

-- Does the course have an exam a student must pass?
create or replace function public._course_exam_required(p_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_exams e
    where e.course_id = p_course and e.enabled
      and jsonb_typeof(e.questions) = 'array' and jsonb_array_length(e.questions) > 0
  );
$$;
revoke all on function public._course_exam_required(uuid) from public, anon, authenticated;

-- Every published lesson of the course done by this user?
create or replace function public._all_lessons_done(p_user uuid, p_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.lessons l where l.course_id = p_course and l.status = 'published')
     and not exists (
       select 1 from public.lessons l
       where l.course_id = p_course and l.status = 'published'
         and not exists (select 1 from public.lesson_progress lp where lp.user_id = p_user and lp.lesson_id = l.id and lp.completed)
     );
$$;
revoke all on function public._all_lessons_done(uuid, uuid) from public, anon, authenticated;

-- Score an attempt from its marks; leaves it pending while any question is unmarked.
create or replace function public._score_exam_attempt(p_attempt uuid)
returns public.exam_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.exam_attempts%rowtype;
  v_q jsonb;
  v_pts numeric;
  v_score numeric := 0;
  v_max numeric := 0;
  v_open boolean := false;
begin
  select * into v from public.exam_attempts where id = p_attempt for update;
  for v_q in select * from jsonb_array_elements(v.questions) loop
    v_pts := case when (v_q->>'points') ~ '^[0-9]+(\.[0-9]+)?$' and (v_q->>'points')::numeric > 0 then (v_q->>'points')::numeric else 1 end;
    v_max := v_max + v_pts;
    if not (v.marks ? (v_q->>'id')) then
      v_open := true;
    elsif (v.marks->>(v_q->>'id'))::boolean then
      v_score := v_score + v_pts;
    end if;
  end loop;
  update public.exam_attempts set
    score = v_score,
    max_score = v_max,
    pct = case when v_open or v_max = 0 then null else round(v_score * 100 / v_max) end,
    status = case when v_open then 'pending_review'
                  when v_max > 0 and round(v_score * 100 / v_max) >= v.pass_score then 'passed'
                  else 'failed' end
  where id = p_attempt
  returning * into v;
  return v;
end;
$$;
revoke all on function public._score_exam_attempt(uuid) from public, anon, authenticated;

-- What the student is allowed to see about an attempt.
create or replace function public._exam_attempt_public(v public.exam_attempts)
returns jsonb
language sql
stable
as $$
  select case when v.id is null then null else jsonb_build_object(
    'id', v.id, 'status', v.status, 'pct', v.pct, 'pass_score', v.pass_score,
    'submitted_at', v.submitted_at, 'reviewed_at', v.reviewed_at, 'feedback', v.feedback,
    -- which questions were right, only once the attempt is fully marked
    'marks', case when v.status = 'pending_review' then '{}'::jsonb else v.marks end
  ) end;
$$;
revoke all on function public._exam_attempt_public(public.exam_attempts) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Student: the exam without answers, and whether it's open yet
--    Returns null when the course has no exam (or the student has no access).
--    { title, intro, pass_score, auto_mark, questions:[{id,type,q,options,points}], unlocked, latest }
-- ---------------------------------------------------------------------
create or replace function public.get_course_exam(p_course uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  e public.course_exams%rowtype;
  v_last public.exam_attempts%rowtype;
begin
  if v_uid is null or not public.has_course_access(p_course) then return null; end if;
  if not public._course_exam_required(p_course) then return null; end if;
  select * into e from public.course_exams where course_id = p_course;
  select * into v_last from public.exam_attempts where user_id = v_uid and course_id = p_course
   order by (status = 'passed') desc, submitted_at desc limit 1;
  return jsonb_build_object(
    'title', e.title, 'intro', e.intro, 'pass_score', e.pass_score, 'auto_mark', e.auto_mark,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', q->>'id', 'type', coalesce(q->>'type', 'choice'), 'q', q->>'q',
        'options', case when coalesce(q->>'type', 'choice') = 'choice' then q->'options' else null end,
        'points', q->'points'
      ) order by n), '[]'::jsonb)
      from jsonb_array_elements(e.questions) with ordinality x(q, n)
    ),
    'unlocked', public._all_lessons_done(v_uid, p_course),
    'latest', public._exam_attempt_public(v_last)
  );
end;
$$;
revoke all on function public.get_course_exam(uuid) from public, anon;
grant execute on function public.get_course_exam(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Student: hand the exam in
--    p_answers: { "<question id>": <option index> | "<text>" }
-- ---------------------------------------------------------------------
create or replace function public.submit_exam(p_course uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  e public.course_exams%rowtype;
  v_q jsonb;
  v_id text;
  v_type text;
  v_ans jsonb;
  v_marks jsonb := '{}'::jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_att public.exam_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Please sign in'; end if;
  if not public.has_course_access(p_course) then raise exception 'You do not have access to this course'; end if;
  if not public._course_exam_required(p_course) then raise exception 'This course has no exam'; end if;
  if not public._all_lessons_done(v_uid, p_course) then raise exception 'Finish every lesson before you take the exam'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'No answers were sent'; end if;

  select * into v_att from public.exam_attempts where user_id = v_uid and course_id = p_course and status = 'passed' limit 1;
  if found then return public._exam_attempt_public(v_att); end if;
  if exists (select 1 from public.exam_attempts where user_id = v_uid and course_id = p_course and status = 'pending_review') then
    raise exception 'Your last exam is still being marked. You will see the result here once it is done.';
  end if;

  select * into e from public.course_exams where course_id = p_course;
  for v_q in select * from jsonb_array_elements(e.questions) loop
    v_id := v_q->>'id';
    v_type := coalesce(v_q->>'type', 'choice');
    v_ans := p_answers->v_id;
    if v_ans is null or v_ans = 'null'::jsonb or (v_type = 'text' and public._exam_norm(v_ans #>> '{}') = '') then
      raise exception 'Answer every question before you hand in the exam';
    end if;
    if v_type = 'choice' then
      if jsonb_typeof(v_ans) <> 'number' then raise exception 'Pick one option for every multiple-choice question'; end if;
      v_clean := v_clean || jsonb_build_object(v_id, v_ans);
      v_marks := v_marks || jsonb_build_object(v_id,
        coalesce((v_q->>'answer') ~ '^[0-9]+$' and (v_q->>'answer')::integer = (v_ans #>> '{}')::numeric, false));
    else
      v_clean := v_clean || jsonb_build_object(v_id, left(v_ans #>> '{}', 300));
      if e.auto_mark then
        v_marks := v_marks || jsonb_build_object(v_id, exists (
          select 1 from jsonb_array_elements_text(case when jsonb_typeof(v_q->'accepted') = 'array' then v_q->'accepted' else '[]'::jsonb end) a
          where public._exam_norm(a) <> '' and public._exam_norm(a) = public._exam_norm(v_ans #>> '{}')
        ));
      end if;
    end if;
  end loop;

  insert into public.exam_attempts (user_id, course_id, questions, answers, marks, pass_score)
  values (v_uid, p_course, e.questions, v_clean, v_marks, e.pass_score)
  returning * into v_att;
  v_att := public._score_exam_attempt(v_att.id);
  return public._exam_attempt_public(v_att);
end;
$$;
revoke all on function public.submit_exam(uuid, jsonb) from public, anon;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Admin: mark the answers a person has to check
--    p_marks: { "<question id>": true | false }  (merged over what is already marked)
-- ---------------------------------------------------------------------
create or replace function public.admin_mark_exam(p_attempt uuid, p_marks jsonb, p_feedback text default null)
returns public.exam_attempts
language plpgsql
security definer
set search_path = public
as $$
declare v public.exam_attempts%rowtype; v_clean jsonb := '{}'::jsonb; k text; val jsonb;
begin
  if not (public.is_academy_admin() or auth.role() = 'service_role') then raise exception 'Admins only'; end if;
  select * into v from public.exam_attempts where id = p_attempt;
  if not found then raise exception 'Exam attempt not found'; end if;
  for k, val in select * from jsonb_each(coalesce(p_marks, '{}'::jsonb)) loop
    if jsonb_typeof(val) = 'boolean' and exists (select 1 from jsonb_array_elements(v.questions) q where q->>'id' = k) then
      v_clean := v_clean || jsonb_build_object(k, val);
    end if;
  end loop;
  update public.exam_attempts set
    marks = marks || v_clean,
    feedback = coalesce(nullif(btrim(coalesce(p_feedback, '')), ''), feedback),
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_attempt;
  return public._score_exam_attempt(p_attempt);
end;
$$;
revoke all on function public.admin_mark_exam(uuid, jsonb, text) from public, anon;
grant execute on function public.admin_mark_exam(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Certificates also need a passed exam (when the course has one)
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

  if to_regclass('public.quiz_attempts') is not null and exists (
    select 1 from public.lessons l
    where l.course_id = p_course and l.status = 'published' and l.kind = 'assessment'
      and not exists (select 1 from public.quiz_attempts a where a.user_id = v_uid and a.lesson_id = l.id and a.passed)
  ) then
    raise exception 'Pass every quiz in this course to earn your certificate';
  end if;

  if public._course_exam_required(p_course) and not exists (
    select 1 from public.exam_attempts a where a.user_id = v_uid and a.course_id = p_course and a.status = 'passed'
  ) then
    if exists (select 1 from public.exam_attempts a where a.user_id = v_uid and a.course_id = p_course and a.status = 'pending_review') then
      raise exception 'Your final exam is still being marked';
    end if;
    raise exception 'Pass the final exam to earn your certificate';
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

-- Revoking a certificate with "reset" also clears the exam attempts (redefines the 0027 version).
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
    delete from public.exam_attempts where user_id = p_user and course_id = p_course;
  end if;
end;
$$;
revoke all on function public.admin_revoke_certificate(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_revoke_certificate(uuid, uuid, boolean) to authenticated;
