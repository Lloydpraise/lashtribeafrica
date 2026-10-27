"""Applies the final-exam changes to the admin course builder. Usage: python3 admin_patch.py <project root>
Exact text replacements; a file is left untouched if any of its anchors is missing."""
import sys, pathlib

root = pathlib.Path(sys.argv[1])

MODEL = [
  ('''export function newModule(title = "", defaultKind = "reading") {''',
   '''// ---------------------------------------------------------------------
// final exam (migration 0028): one per course, after the last lesson
// ---------------------------------------------------------------------
export function newExamQuestion(type = "choice") {
  return type === "text"
    ? { id: uid(), type: "text", q: "", accepted: [], points: 1 }
    : { id: uid(), type: "choice", q: "", options: ["", ""], answer: 0, points: 1 };
}

export function newExam() {
  return { enabled: true, title: "Final exam", intro: "", pass_score: 70, auto_mark: true, questions: [newExamQuestion("choice")] };
}

/** course_exams row -> editor exam (null when the course has none). */
export function examFromRow(row) {
  if (!row) return null;
  return {
    enabled: row.enabled !== false,
    title: row.title || "Final exam",
    intro: row.intro || "",
    pass_score: Number(row.pass_score) || 70,
    auto_mark: row.auto_mark !== false,
    questions: (Array.isArray(row.questions) ? row.questions : []).map((q) => ({
      ...(q.type === "text" ? newExamQuestion("text") : newExamQuestion("choice")),
      ...q,
      id: q.id || uid(),
    })),
  };
}

/** Editor exam -> course_exams row. */
export function examToRow(courseId, exam) {
  return {
    course_id: courseId,
    enabled: !!exam.enabled,
    title: (exam.title || "").trim() || "Final exam",
    intro: exam.intro || "",
    pass_score: Math.min(100, Math.max(1, Number(exam.pass_score) || 70)),
    auto_mark: !!exam.auto_mark,
    questions: exam.questions.map((q) => (q.type === "text"
      ? { id: q.id, type: "text", q: q.q.trim(), accepted: (q.accepted || []).map((a) => String(a).trim()).filter(Boolean), points: Number(q.points) > 0 ? Number(q.points) : 1 }
      : { id: q.id, type: "choice", q: q.q.trim(), options: (q.options || []).map((o) => String(o).trim()), answer: Number(q.answer) || 0, points: Number(q.points) > 0 ? Number(q.points) : 1 })),
  };
}

export function newModule(title = "", defaultKind = "reading") {'''),
  ('''    certificate_enabled: p.course.certificate_enabled,
    bonus_points: p.course.bonus_points,
    modules: p.modules.map((m) => ({''', '''    certificate_enabled: p.course.certificate_enabled,
    bonus_points: p.course.bonus_points,
    // the preview marks the exam in the browser, so it keeps the answers
    exam: course.exam && course.exam.enabled && course.exam.questions.length ? examToRow(course.id, course.exam) : null,
    modules: p.modules.map((m) => ({'''),
  ('''  if (publishing && lessonCount(course) === 0) errors.push("Add at least one lesson before publishing.");''',
   '''  const ex = course.exam;
  if (ex && ex.enabled) {
    if (!ex.questions.length) errors.push("The final exam is switched on but has no questions. Add some, or switch it off.");
    ex.questions.forEach((q, i) => {
      const where = `Final exam question ${i + 1}`;
      if (!q.q.trim()) (publishing ? errors : warnings).push(`${where} has no question text.`);
      if (q.type === "text") {
        if (ex.auto_mark && !(q.accepted || []).some((a) => String(a).trim())) {
          errors.push(`${where} is a written answer but has no accepted answers. Add at least one, or switch off automatic marking so you mark it yourself.`);
        }
      } else if ((q.options || []).filter((o) => String(o).trim()).length < 2) {
        (publishing ? errors : warnings).push(`${where} needs at least two options.`);
      } else if (!String(q.options[q.answer] ?? "").trim()) {
        (publishing ? errors : warnings).push(`${where}: the option marked correct is empty.`);
      }
    });
  }
  if (publishing && lessonCount(course) === 0) errors.push("Add at least one lesson before publishing.");'''),
]

API = [
  ('''import { courseFromRows, toSavePayload, uid, slugify } from "./courseModel.js";''',
   '''import { courseFromRows, toSavePayload, uid, slugify, examFromRow, examToRow } from "./courseModel.js";'''),
  ('''  const { course_modules, lessons: _l, ...course } = data;
  return courseFromRows({ course, modules: course_modules || [], lessons, content });
}''', '''  const { course_modules, lessons: _l, ...course } = data;
  const full = courseFromRows({ course, modules: course_modules || [], lessons, content });
  // final exam (migration 0028). undefined = the table isn't there yet, so the editor hides the exam tab.
  const ex = await supabase.from("course_exams").select("*").eq("course_id", id).maybeSingle();
  full.exam = ex.error ? undefined : examFromRow(ex.data);
  return full;
}

/** Saves (or removes, when exam is null) the course's final exam. */
export async function saveExam(courseId, exam) {
  const { error } = exam
    ? await supabase.from("course_exams").upsert(examToRow(courseId, exam), { onConflict: "course_id" })
    : await supabase.from("course_exams").delete().eq("course_id", courseId);
  if (error) throw error;
}

/** Exams handed in with answers waiting for a person to mark, oldest first, with the student's name. */
export async function fetchExamsToMark() {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("*, course:courses(title, slug)")
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  const ids = [...new Set((data || []).map((a) => a.user_id))];
  const people = {};
  if (ids.length) {
    const { data: cs } = await supabase.from("customers").select("user_id, full_name, email, phone").in("user_id", ids);
    (cs || []).forEach((c) => (people[c.user_id] = c));
  }
  return (data || []).map((a) => ({ ...a, student: people[a.user_id] || null }));
}

/** marks: { [questionId]: true|false } for the questions a person had to check. */
export async function markExam(attemptId, marks, feedback) {
  const { data, error } = await supabase.rpc("admin_mark_exam", { p_attempt: attemptId, p_marks: marks, p_feedback: feedback || null });
  if (error) throw error;
  return data;
}'''),
  ('''  const { error } = await supabase.rpc("admin_save_course", { p: payload });
  if (error) throw error;
  return course.id;''', '''  const { error } = await supabase.rpc("admin_save_course", { p: payload });
  if (error) throw error;
  if (course.exam !== undefined) await saveExam(course.id, course.exam);
  return course.id;'''),
]

EDITOR = [
  ('''import PreviewModal from "./PreviewModal.jsx";
''', '''import PreviewModal from "./PreviewModal.jsx";
import ExamEditor from "./ExamEditor.jsx";
'''),
  ('''        {[["details", "Details & pricing"], ["curriculum", `Curriculum (${total})`], ["import", "Import & export"]].map(([k, label]) => (''',
   '''        {[["details", "Details & pricing"], ["curriculum", `Curriculum (${total})`],
          ...(course.exam !== undefined ? [["exam", course.exam?.enabled ? `Final exam (${course.exam.questions.length})` : "Final exam"]] : []),
          ["import", "Import & export"]].map(([k, label]) => ('''),
  ('''      {tab === "import" && <ImportPanel course={course} onApply={applyImport} />}''',
   '''      {tab === "exam" && course.exam !== undefined && (
        <ExamEditor exam={course.exam} onChange={(exam) => set({ exam })} onPreview={() => setPreview({ lessonId: "__exam", show: "exam" })} />
      )}

      {tab === "import" && <ImportPanel course={course} onApply={applyImport} />}'''),
  ('''      {preview && <PreviewModal course={course} lessonId={preview.lessonId} onClose={() => setPreview(null)} />}''',
   '''      {preview && <PreviewModal course={course} lessonId={preview.lessonId} startShow={preview.show} onClose={() => setPreview(null)} />}'''),
]

PREVIEW = [
  ('''export default function PreviewModal({ course, lessonId, onClose }) {
  const [device, setDevice] = useState("phone");
  const [run, setRun] = useState(0);
  const [show, setShow] = useState("course"); // course | certificate''',
   '''export default function PreviewModal({ course, lessonId, startShow = "course", onClose }) {
  const [device, setDevice] = useState("phone");
  const [run, setRun] = useState(0);
  const hasExam = !!(course.exam && course.exam.enabled && course.exam.questions.length);
  const [show, setShow] = useState(startShow === "exam" && !hasExam ? "course" : startShow); // course | exam | certificate'''),
  ('''    const q = new URLSearchParams({ course: "__preview__" });
    if (lessonId) q.set("lesson", lessonId);''', '''    const q = new URLSearchParams({ course: "__preview__" });
    if (show === "exam") q.set("lesson", "__exam");
    else if (lessonId && lessonId !== "__exam") q.set("lesson", lessonId);'''),
  ('''  }, [run, lessonId]);''', '''  }, [run, lessonId, show]);'''),
  ('''            <button type="button" className={show === "certificate" ? "on" : ""} onClick={() => setShow("certificate")}>Certificate</button>''',
   '''            {hasExam && <button type="button" className={show === "exam" ? "on" : ""} onClick={() => setShow("exam")}>Preview exam</button>}
            <button type="button" className={show === "certificate" ? "on" : ""} onClick={() => setShow("certificate")}>Certificate</button>'''),
  ('''          {show === "course" && (
            <>''', '''          {show !== "certificate" && (
            <>'''),
]

COURSES = [
  ('''import { fetchCourses, fetchBundles, fetchCourseFull, explain } from "./courses/courses.api.js";''',
   '''import { fetchCourses, fetchBundles, fetchCourseFull, fetchExamsToMark, explain } from "./courses/courses.api.js";
import ExamReview from "./courses/ExamReview.jsx";'''),
  ('''  const [view, setView] = useState("courses"); // courses | bundles''',
   '''  const [view, setView] = useState("courses"); // courses | bundles | exams
  const [toMark, setToMark] = useState(null); // null = exams not set up (migration 0028)'''),
  ('''      const [c, b] = await Promise.all([fetchCourses(), fetchBundles()]);
      setCourses(c);
      setBundles(b);''', '''      const [c, b] = await Promise.all([fetchCourses(), fetchBundles()]);
      setCourses(c);
      setBundles(b);
      fetchExamsToMark().then(setToMark).catch(() => setToMark(null));'''),
  ('''          <button type="button" className={view === "bundles" ? "on" : ""} onClick={() => setView("bundles")}>Bundles ({bundles.length})</button>''',
   '''          <button type="button" className={view === "bundles" ? "on" : ""} onClick={() => setView("bundles")}>Bundles ({bundles.length})</button>
          {toMark && <button type="button" className={view === "exams" ? "on" : ""} onClick={() => setView("exams")}>Exams to mark ({toMark.length})</button>}'''),
  ('''      ) : view === "courses" ? (''', '''      ) : view === "exams" && toMark ? (
        <ExamReview attempts={toMark} onReload={() => fetchExamsToMark().then(setToMark).catch(() => {})} />
      ) : view === "courses" ? ('''),
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

base = "src/admin/sections/"
ok = True
for rel, edits in [(base + "courses/courseModel.js", MODEL), (base + "courses/courses.api.js", API),
                   (base + "courses/CourseEditor.jsx", EDITOR), (base + "courses/PreviewModal.jsx", PREVIEW),
                   (base + "Courses.jsx", COURSES)]:
    ok = apply(rel, edits) and ok
sys.exit(0 if ok else 1)
