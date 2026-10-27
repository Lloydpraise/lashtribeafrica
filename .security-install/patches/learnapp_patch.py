"""Applies the verified-completion + final-exam changes to src/components/learn/LearnApp.jsx and
src/components/learn/Curriculum.jsx. Usage: python3 learnapp_patch.py <project root>
Each change is an exact text replacement; the script stops without writing if any anchor is missing."""
import sys, pathlib

root = pathlib.Path(sys.argv[1])

LEARN = [
  # imports
  ('''  HAS_DB, loadCourse, loadLessonContent, loadProgress, saveProgress, enrollFree,
''', '''  HAS_DB, loadCourse, loadLessonContent, loadProgress, saveProgress, enrollFree,
  startLesson, completeLesson, answerQuiz, loadExam, submitExam,
'''),
  ('''const Assessment = lazy(() => import("./Assessment.jsx"));
''', '''const Assessment = lazy(() => import("./Assessment.jsx"));
const Exam = lazy(() => import("./Exam.jsx"));
'''),
  # state
  ('''  const [lessonState, setLessonState] = useState("idle"); // idle | loading | locked | error
''', '''  const [lessonState, setLessonState] = useState("idle"); // idle | loading | locked | error
  const [exam, setExam] = useState(null); // the final exam (0028), without answers
  const [examPassed, setExamPassed] = useState(false);
  const retryTimer = useRef(null);
'''),
  # boot: deep link to the exam, load the exam
  ('''      setLessonId(c.lessons.some((l) => l.id === want) || want === "__certificate" ? want : first?.id || null);
''', '''      setLessonId(c.lessons.some((l) => l.id === want) || want === "__certificate" || want === "__exam" ? want : first?.id || null);
      loadExam(c).then((e) => { setExam(e); setExamPassed(e?.latest?.status === "passed"); }).catch(() => {});
'''),
  # certificate also needs the exam
  ('''  const certReady = lessons.length > 0 && doneCount === lessons.length;
''', '''  const lessonsDone = lessons.length > 0 && doneCount === lessons.length;
  const certReady = lessonsDone && (!exam || examPassed);
  const finishTarget = exam && !examPassed ? "__exam" : "__certificate";
'''),
  ('''    if (id !== "__certificate") {
''', '''    if (id !== "__certificate" && id !== "__exam") {
'''),
  # the exam opens once the last lesson is done: ask the database again
  ('''  useEffect(() => {
    if (!ctx || !lesson) return;
    let live = true;
    loadNotes(ctx, lesson.id)''', '''  useEffect(() => {
    if (lessonsDone && exam && !exam.unlocked && ctx) loadExam(ctx).then((e) => e && setExam(e)).catch(() => {});
  }, [lessonsDone]); // eslint-disable-line

  // The database notes when a lesson was first opened (completion needs real time spent on it).
  useEffect(() => {
    clearTimeout(retryTimer.current);
    if (ctx && lesson) startLesson(ctx, lesson.id);
  }, [ctx, lessonId]); // eslint-disable-line
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  useEffect(() => {
    if (!ctx || !lesson) return;
    let live = true;
    loadNotes(ctx, lesson.id)'''),
  # completion goes through the database
  ('''  const complete = useCallback((id, quiet) => {
    if (progress[id]?.completed) return;
    setProgress((p) => ({ ...p, [id]: { ...(p[id] || {}), completed: true } }));
    saveProgress(ctx, id, { completed: true });
    const left = lessons.filter((l) => l.id !== id && !progress[l.id]?.completed).length;''', '''  const completeRef = useRef(null);
  const complete = useCallback(async (id, quiet) => {
    if (progress[id]?.completed) return;
    const r = await completeLesson(ctx, id);
    if (!r?.completed) {
      if (r?.reason === "time" && r.wait_seconds) {
        // too soon: try again quietly once the lesson has been open long enough
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => completeRef.current?.(id, true), (r.wait_seconds + 2) * 1000);
        if (!quiet) say(`Take your time: this lesson completes in about ${Math.max(1, Math.ceil(r.wait_seconds / 60))} min`);
      } else if (r?.reason === "quiz") say("Pass the quiz to complete this lesson");
      return;
    }
    setProgress((p) => ({ ...p, [id]: { ...(p[id] || {}), completed: true } }));
    const left = lessons.filter((l) => l.id !== id && !progress[l.id]?.completed).length;'''),
  ('''  }, [ctx, lessons, progress, say]);
''', '''  }, [ctx, lessons, progress, say]);
  completeRef.current = complete;
'''),
  ('''  const isCert = lessonId === "__certificate";
''', '''  const isCert = lessonId === "__certificate";
  const isExam = lessonId === "__exam" && !!exam;
'''),
  ('''      : <button className="lx-btn dark" onClick={() => go("__certificate")}>Finish course →</button>;''',
   '''      : <button className="lx-btn dark" onClick={() => go(finishTarget)}>{finishTarget === "__exam" ? "Take the final exam →" : "Finish course →"}</button>;'''),
  ('''      onNext={() => (next ? go(next.id) : go("__certificate"))} /></Suspense>''',
   '''      onNext={() => (next ? go(next.id) : go(finishTarget))} /></Suspense>'''),
  # quizzes are marked by the database when the answers were left out
  ('''<Assessment key={lesson.id} quiz={quiz} completed={done} onPass={() => complete(lesson.id)} />''',
   '''<Assessment key={lesson.id} quiz={quiz} completed={done} onPass={() => complete(lesson.id)}
              grader={content?.graded ? (q, choice, attemptId) => answerQuiz(lesson.id, q, choice, attemptId) : null} />'''),
  ('''  const currProps = { course, modules: ctx.modules, lessons, progress, currentId: lessonId, stateOf, onPick: go, pct, doneCount, certReady, certEnabled: course.certificate_enabled };''',
   '''  const currProps = { course, modules: ctx.modules, lessons, progress, currentId: lessonId, stateOf, onPick: go, pct, doneCount, certReady, certEnabled: course.certificate_enabled,
    exam, examPassed, lessonsDone };'''),
  ('''          {isCert ? (
            certReady ? <Certificate ctx={ctx} onBack={() => (window.location.href = "/academy/")} />
              : <div className="lx-locked"><div className="lx-lock-ic">★</div><h2>Almost there</h2><p>Complete every lesson to unlock your course completion.</p></div>
          ) : lesson ? (''', '''          {isCert ? (
            certReady ? <Certificate ctx={ctx} onBack={() => (window.location.href = "/academy/")} />
              : <div className="lx-locked"><div className="lx-lock-ic">★</div><h2>Almost there</h2>
                  <p>{lessonsDone && exam ? "Pass the final exam to unlock your course completion." : "Complete every lesson to unlock your course completion."}</p>
                  {lessonsDone && exam && <button className="lx-btn dark" onClick={() => go("__exam")}>Take the final exam →</button>}
                </div>
          ) : isExam ? (
            <Suspense fallback={viewFallback}>
              <Exam key={exam.latest?.id || "exam"} exam={exam} preview={ctx.source === "demo"}
                onSubmit={(answers) => submitExam(ctx, answers)}
                onPassed={() => { setExamPassed(true); burstConfetti(70); say("Exam passed! 🎓"); }}
                onCertificate={() => go("__certificate")} />
            </Suspense>
          ) : lesson ? ('''),
]

CURR = [
  ('''  cert: <svg''', '''  exam: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 13h6M9 17h4" /></svg>,
  cert: <svg'''),
  ('''export default function Curriculum({ course, modules, lessons, progress, currentId, stateOf, onPick, pct, doneCount, certReady, certEnabled }) {''',
   '''export default function Curriculum({ course, modules, lessons, progress, currentId, stateOf, onPick, pct, doneCount, certReady, certEnabled, exam, examPassed, lessonsDone }) {'''),
  ('''      {certEnabled && (
        <button className={"lx-lesson cert"''', '''      {exam && (
        <button className={"lx-lesson exam" + (currentId === "__exam" ? " now" : "") + (examPassed ? " done" : lessonsDone ? "" : " locked")} onClick={() => onPick("__exam")}>
          <span className="lx-lesson-ic">{examPassed ? I.done : lessonsDone ? I.exam : I.lock}</span>
          <span className="lx-lesson-tx"><strong>{exam.title || "Final exam"}</strong>
            <small>{examPassed ? "Passed" : exam.latest?.status === "pending_review" ? "Being marked" : lessonsDone ? `${exam.questions?.length || 0} questions · pass ${exam.pass_score}%` : "Finish every lesson"}</small></span>
        </button>
      )}
      {certEnabled && (
        <button className={"lx-lesson cert"'''),
  ('''<small>{certReady ? "Unlocked" : "Finish every lesson"}</small>''',
   '''<small>{certReady ? "Unlocked" : exam && lessonsDone ? "Pass the final exam" : "Finish every lesson"}</small>'''),
]

def apply(rel, edits):
    p = root / rel
    s = p.read_text(encoding="utf-8")
    bad = [old[:70] for old, _ in edits if s.count(old) != 1]
    if bad:
        print(f"{rel}: anchors not found (nothing written):"); [print("  -", b.replace("\n", " ")) for b in bad]
        return False
    for old, new in edits: s = s.replace(old, new)
    p.write_text(s, encoding="utf-8"); print(f"{rel}: {len(edits)} changes applied"); return True

ok = apply("src/components/learn/LearnApp.jsx", LEARN) & apply("src/components/learn/Curriculum.jsx", CURR)
sys.exit(0 if ok else 1)
