"""src/services/academy.js: lesson content without quiz answers, server-side completion, quiz marking
and the final exam. Usage: python3 academy_patch.py <project root>"""
import sys, pathlib

root = pathlib.Path(sys.argv[1])

EDITS = [
  ('''/** Returns { video, blocks } or null when the student isn't entitled to this lesson. */
export async function loadLessonContent(ctx, lesson) {
  if (ctx.source === "demo") return ctx.content[lesson.id] || { video: null, blocks: [] };
  const { data, error } = await supabase
    .from("lesson_content").select("video, blocks").eq("lesson_id", lesson.id).maybeSingle();''',
'''/** A database function that isn't there yet (its migration hasn't been run). */
const missingFn = (error) =>
  !!error && (error.code === "PGRST202" || error.code === "42883" || /Could not find the function/i.test(error.message || ""));

/** Returns { video, blocks, graded } or null when the student isn't entitled to this lesson.
 *  graded: the quiz answers were left out (migration 0027), so quizzes are marked by the database. */
export async function loadLessonContent(ctx, lesson) {
  if (ctx.source === "demo") return ctx.content[lesson.id] || { video: null, blocks: [] };
  const rpc = await supabase.rpc("get_lesson_content", { p_lesson: lesson.id });
  if (!rpc.error) return rpc.data ? { video: rpc.data.video || null, blocks: rpc.data.blocks || [], graded: true } : null;
  if (!missingFn(rpc.error)) throw rpc.error;
  // before migration 0027: read the table directly
  const { data, error } = await supabase
    .from("lesson_content").select("video, blocks").eq("lesson_id", lesson.id).maybeSingle();'''),
  ('''// ---------- "last course the student touched"''',
'''/** The student opened a lesson: the database notes the time (first visit only). */
export async function startLesson(ctx, lessonId) {
  if (ctx.source === "demo" || !ctx.user || !ctx.access) return;
  const { error } = await supabase.rpc("start_lesson", { p_lesson: lessonId });
  if (error && !missingFn(error)) console.warn("Academy: could not record lesson start", error.message);
}

/** Asks the database to mark a lesson done. Returns { completed, reason?, wait_seconds? }.
 *  reason "quiz": the quiz hasn't been passed; "time": the lesson has been open too briefly. */
export async function completeLesson(ctx, lessonId) {
  if (ctx.source === "demo" || !ctx.user) {
    await saveProgress(ctx, lessonId, { completed: true });
    return { completed: true };
  }
  if (!ctx.access) return { completed: false };
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson: lessonId });
  if (!error) return data || { completed: false };
  if (!missingFn(error)) { console.warn("Academy: could not complete lesson", error.message); return { completed: false }; }
  // before migration 0027 the browser still records completion itself
  await saveProgress(ctx, lessonId, { completed: true });
  return { completed: true };
}

/** Sends one quiz answer to the database. Returns { attempt_id, correct, answer, explain, done, score, total, pct, passed }. */
export async function answerQuiz(lessonId, question, choice, attemptId) {
  const { data, error } = await supabase.rpc("quiz_answer", {
    p_lesson: lessonId, p_question: question, p_choice: choice, p_attempt: attemptId || null,
  });
  if (error) throw new Error(error.message || "Couldn't check that answer.");
  return data;
}

// ---------- final exam (migration 0028) ----------
/** The course's final exam without answers, or null when there is none.
 *  { title, intro, pass_score, auto_mark, questions, unlocked, latest } */
export async function loadExam(ctx) {
  // the admin preview carries the exam with its answers and marks it in the browser
  if (ctx.source === "demo") return ctx.course.exam?.questions?.length ? { ...ctx.course.exam, unlocked: true, latest: null } : null;
  if (!ctx.user) return null;
  const { data, error } = await supabase.rpc("get_course_exam", { p_course: ctx.course.id });
  if (error) {
    if (!missingFn(error)) console.warn("Academy: could not load the exam", error.message);
    return null;
  }
  return data || null;
}

/** Hands the exam in. answers: { [questionId]: optionIndex | "text" }. Returns the attempt
 *  { id, status: 'passed'|'failed'|'pending_review', pct, pass_score, marks, feedback }. */
export async function submitExam(ctx, answers) {
  if (ctx.source === "demo") return markExamLocally(ctx.course.exam, answers);
  const { data, error } = await supabase.rpc("submit_exam", { p_course: ctx.course.id, p_answers: answers });
  if (error) throw new Error(error.message || "Couldn't hand in the exam.");
  return data;
}

const norm = (t) => String(t ?? "").trim().replace(/\\s+/g, " ").toLowerCase();

/** Admin preview only: marks the exam in the browser, the same way the database does. */
function markExamLocally(exam, answers) {
  let score = 0; let max = 0; let open = false;
  const marks = {};
  (exam?.questions || []).forEach((q) => {
    const pts = Number(q.points) > 0 ? Number(q.points) : 1;
    max += pts;
    const a = answers[q.id];
    let ok;
    if ((q.type || "choice") === "choice") ok = Number(a) === Number(q.answer);
    else if (exam.auto_mark) ok = (q.accepted || []).some((x) => norm(x) && norm(x) === norm(a));
    if (ok === undefined) { open = true; return; }
    marks[q.id] = ok;
    if (ok) score += pts;
  });
  const pct = open || !max ? null : Math.round((score * 100) / max);
  const status = open ? "pending_review" : pct >= exam.pass_score ? "passed" : "failed";
  return { id: "preview", status, pct, pass_score: exam.pass_score, marks: open ? {} : marks, feedback: null };
}

// ---------- "last course the student touched"'''),
]

p = root / "src/services/academy.js"
s = p.read_text(encoding="utf-8")
bad = [old[:70] for old, _ in EDITS if s.count(old) != 1]
if bad:
    print("src/services/academy.js: anchors not found (nothing written):"); [print("  -", b.replace("\n", " ")) for b in bad]
    sys.exit(1)
for old, new in EDITS: s = s.replace(old, new)
p.write_text(s, encoding="utf-8"); print(f"src/services/academy.js: {len(EDITS)} changes applied")
