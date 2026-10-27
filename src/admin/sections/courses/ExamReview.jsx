import { useState } from "react";
import { markExam, explain } from "./courses.api.js";
import { Notice } from "./fields.jsx";

const when = (t) => (t ? new Date(t).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** Final exams with written answers waiting for a person (migration 0028). */
export default function ExamReview({ attempts, onReload }) {
  const [done, setDone] = useState("");
  if (!attempts.length) {
    return (
      <div className="cs-stack">
        {done && <Notice kind="ok" onClose={() => setDone("")}>{done}</Notice>}
        <p className="cs-empty">No exams waiting. Exams that aren't marked automatically show up here when a student hands one in.</p>
      </div>
    );
  }
  return (
    <div className="cs-stack">
      {done && <Notice kind="ok" onClose={() => setDone("")}>{done}</Notice>}
      {attempts.map((a) => (
        <Attempt key={a.id} attempt={a} onMarked={(row) => { setDone(`${a.student?.full_name || "The student"}: ${row.status === "passed" ? `passed with ${row.pct}%` : `${row.pct}%, not a pass`}. They can see it now.`); onReload(); }} />
      ))}
    </div>
  );
}

function Attempt({ attempt, onMarked }) {
  const toCheck = attempt.questions.filter((q) => !(q.id in (attempt.marks || {})));
  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = toCheck.filter((q) => marks[q.id] == null).length;

  async function save() {
    setBusy(true);
    setError("");
    try {
      onMarked(await markExam(attempt.id, marks, feedback.trim()));
    } catch (err) {
      setError(explain(err, "Couldn't save the marks."));
    } finally {
      setBusy(false);
    }
  }

  const s = attempt.student;
  return (
    <section className="admin-card cs-card cs-mark">
      <div className="cs-row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{s?.full_name || s?.email || "Student"} · {attempt.course?.title || "Course"}</h3>
        <span className="form-hint">Handed in {when(attempt.submitted_at)}{s?.phone ? ` · ${s.phone}` : ""}</span>
      </div>
      <ol className="cs-mark-list">
        {attempt.questions.map((q) => {
          const auto = attempt.marks?.[q.id];
          const given = attempt.answers?.[q.id];
          const isText = q.type === "text";
          return (
            <li key={q.id} className={auto === true || marks[q.id] === true ? "ok" : auto === false || marks[q.id] === false ? "bad" : ""}>
              <b>{q.q}</b>
              {isText ? (
                <>
                  <div className="cs-mark-answer">“{given}”</div>
                  {(q.accepted || []).length > 0 && <div className="form-hint">Model answer: {q.accepted.join(" · ")}</div>}
                </>
              ) : (
                <div className="form-hint">
                  Answered {q.options?.[given] ?? "—"}{auto === false && <> · correct: {q.options?.[q.answer]}</>}
                </div>
              )}
              {auto != null ? (
                <span className="cs-mark-tag">{auto ? "✓ Correct" : "✗ Wrong"} (marked automatically)</span>
              ) : (
                <span className="cs-seg" role="group" aria-label="Mark">
                  <button type="button" className={marks[q.id] === true ? "on" : ""} onClick={() => setMarks((m) => ({ ...m, [q.id]: true }))}>✓ Correct</button>
                  <button type="button" className={marks[q.id] === false ? "on" : ""} onClick={() => setMarks((m) => ({ ...m, [q.id]: false }))}>✗ Wrong</button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <label className="form-field">
        <span>Note to the student (optional)</span>
        <textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      {error && <Notice kind="error" onClose={() => setError("")}>{error}</Notice>}
      <div className="cs-row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
        <span className="form-hint">{left ? `${left} answer${left === 1 ? "" : "s"} left to mark` : `Pass mark ${attempt.pass_score}%`}</span>
        <button type="button" className="admin-btn" disabled={busy || left > 0} onClick={save}>{busy ? "Saving…" : "Save marks"}</button>
      </div>
    </section>
  );
}
