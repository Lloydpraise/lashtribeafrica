"""Admin -> Customers: quiz and exam results per course, and revoking a certificate.
Usage: python3 customers_patch.py <project root>"""
import sys, pathlib

root = pathlib.Path(sys.argv[1])

API = [
  ('''  if (orders.error) throw orders.error;
  if (products.error) throw products.error;
  if (courses.error) throw courses.error;
  return { orders: orders.data || [], products: products.data || [], courses: courses.data || [] };
}''', '''  if (orders.error) throw orders.error;
  if (products.error) throw products.error;
  if (courses.error) throw courses.error;
  // quiz and final-exam results (migrations 0027 / 0028; empty before they are run)
  const users = [...new Set((courses.data || []).map((c) => c.user_id).filter(Boolean))];
  let quizzes = [];
  let exams = [];
  if (users.length) {
    const [q, e] = await Promise.all([
      supabase.from("quiz_attempts").select("course_id, lesson_id, pct, passed, finished_at, lesson:lessons(title)").in("user_id", users).not("finished_at", "is", null),
      supabase.from("exam_attempts").select("course_id, status, pct, submitted_at").in("user_id", users).order("submitted_at", { ascending: false }),
    ]);
    quizzes = q.error ? [] : q.data || [];
    exams = e.error ? [] : e.data || [];
  }
  return { orders: orders.data || [], products: products.data || [], courses: courses.data || [], quizzes, exams };
}

/** Takes a certificate away. With reset, the student also starts the course again (progress, quizzes, exam). */
export async function revokeCertificate(userId, courseId, reset = true) {
  const { error } = await supabase.rpc("admin_revoke_certificate", { p_user: userId, p_course: courseId, p_reset_progress: reset });
  if (error) throw error;
}'''),
]

VIEW = [
  ('''import { fetchCustomers, fetchCustomerDetail, saveCustomerNotes } from "./customers/customers.api.js";''',
   '''import { fetchCustomers, fetchCustomerDetail, saveCustomerNotes, revokeCertificate } from "./customers/customers.api.js";'''),
  ('''  useEffect(() => {
    let live = true;
    fetchCustomerDetail(customer.id)
      .then((d) => live && setDetail(d))
      .catch((e) => live && setError(e.message || "Couldn't load this customer."));
    return () => { live = false; };
  }, [customer.id]);''', '''  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    fetchCustomerDetail(customer.id)
      .then((d) => live && setDetail(d))
      .catch((e) => live && setError(e.message || "Couldn't load this customer."));
    return () => { live = false; };
  }, [customer.id, reload]);

  async function revoke(c) {
    if (!window.confirm(`Revoke certificate ${c.certificate_no} for ${c.course_title}?\\n\\nThe certificate stops verifying, and the student's progress, quiz and exam results for this course are cleared so they must complete it again.`)) return;
    try {
      await revokeCertificate(c.user_id, c.course_id, true);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e.message || "Couldn't revoke the certificate.");
    }
  }'''),
  ('''<tr><th>Course</th><th>Progress</th><th>Enrolled</th><th>Last studied</th><th>Certificate</th></tr>''',
   '''<tr><th>Course</th><th>Progress</th><th>Quizzes</th><th>Final exam</th><th>Last studied</th><th>Certificate</th></tr>'''),
  ('''                        const pct = total ? Math.round((done / total) * 100) : 0;
                        return (''', '''                        const pct = total ? Math.round((done / total) * 100) : 0;
                        // best finished attempt per quiz lesson
                        const best = {};
                        (detail.quizzes || []).filter((q) => q.course_id === c.course_id).forEach((q) => {
                          const b = best[q.lesson_id];
                          best[q.lesson_id] = { title: q.lesson?.title || "Quiz", pct: Math.max(b?.pct ?? 0, q.pct ?? 0), passed: (b?.passed || q.passed), tries: (b?.tries || 0) + 1 };
                        });
                        const quizList = Object.values(best);
                        const examRows = (detail.exams || []).filter((x) => x.course_id === c.course_id);
                        const exam = examRows.find((x) => x.status === "passed") || examRows[0];
                        return ('''),
  ('''                            <td>{day(c.enrolled_at)}</td>
                            <td>{day(c.last_activity_at)}</td>
                            <td>{c.certificate_no ? <span className="cx-tag student">{c.certificate_no}</span> : "—"}</td>''',
   '''                            <td>
                              {quizList.length ? quizList.map((q, i) => (
                                <div key={i} className="cx-sub" title={q.title}>{q.passed ? "✓" : "✗"} {q.pct}% · {q.tries} {q.tries === 1 ? "try" : "tries"}</div>
                              )) : "—"}
                            </td>
                            <td>
                              {exam ? (exam.status === "pending_review" ? "Waiting to be marked" : `${exam.status === "passed" ? "✓ Passed" : "✗ Failed"} ${exam.pct ?? ""}%`) : "—"}
                              {examRows.length > 1 && <div className="cx-sub">{examRows.length} attempts</div>}
                            </td>
                            <td>{day(c.last_activity_at)}<div className="cx-sub">Enrolled {day(c.enrolled_at)}</div></td>
                            <td>
                              {c.certificate_no ? (
                                <>
                                  <span className="cx-tag student">{c.certificate_no}</span>
                                  <div><button type="button" className="admin-btn secondary" style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }} onClick={() => revoke(c)}>Revoke</button></div>
                                </>
                              ) : "—"}
                            </td>'''),
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

ok = apply("src/admin/sections/customers/customers.api.js", API) & apply("src/admin/sections/Customers.jsx", VIEW)
sys.exit(0 if ok else 1)
