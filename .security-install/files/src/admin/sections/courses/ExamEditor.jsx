import { Field, LinesField, Segmented, Toggle } from "./fields.jsx";
import { newExam, newExamQuestion } from "./courseModel.js";

/**
 * The course's final exam (migration 0028). Students take it after the last lesson; the certificate
 * needs a pass. exam: null (no exam) or { enabled, title, intro, pass_score, auto_mark, questions }.
 */
export default function ExamEditor({ exam, onChange, onPreview }) {
  if (!exam) {
    return (
      <section className="admin-card cs-card cs-exam-empty">
        <h3>Final exam</h3>
        <p className="form-hint">
          An exam students take after the last lesson, before they get their certificate. Use multiple-choice and
          short written answers, and choose whether it's marked automatically or by you.
        </p>
        <div><button type="button" className="admin-btn" onClick={() => onChange(newExam())}>Add a final exam</button></div>
      </section>
    );
  }

  const set = (patch) => onChange({ ...exam, ...patch });
  const qs = exam.questions;
  const setQ = (i, patch) => set({ questions: qs.map((q, k) => (k === i ? { ...q, ...patch } : q)) });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    const next = qs.slice();
    [next[i], next[j]] = [next[j], next[i]];
    set({ questions: next });
  };
  const written = qs.filter((q) => q.type === "text").length;
  const points = qs.reduce((n, q) => n + (Number(q.points) > 0 ? Number(q.points) : 1), 0);

  return (
    <div className="cs-stack cs-exam">
      <section className="admin-card cs-card">
        <div className="cs-row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Final exam</h3>
          <span className="cs-row">
            {exam.enabled && qs.length > 0 && <button type="button" className="admin-btn secondary" onClick={onPreview}>Preview exam</button>}
            <button type="button" className="admin-btn secondary" onClick={() => onChange(null)}>Remove exam</button>
          </span>
        </div>
        <div className="cs-toggles col" style={{ marginTop: 12 }}>
          <Toggle checked={exam.enabled} onChange={(v) => set({ enabled: v })} label="Students must pass this exam"
            hint="Shown after the last lesson. The certificate unlocks once they pass." />
          <Toggle checked={exam.auto_mark} onChange={(v) => set({ auto_mark: v })} label="Mark every question automatically"
            hint={exam.auto_mark
              ? "Written answers are checked against the accepted answers you list (capitals and extra spaces don't matter). Students see their result at once."
              : "Multiple-choice is marked at once; you mark written answers in Courses → Exams to mark. Students see “being marked” until then."} />
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="Title"><input type="text" value={exam.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Pass mark (%)">
            <input type="number" min={1} max={100} value={exam.pass_score} onChange={(e) => set({ pass_score: Number(e.target.value) || 70 })} />
          </Field>
          <Field label="Instructions (optional)" span><textarea rows={2} value={exam.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
        </div>
        <p className="form-hint">
          {qs.length} question{qs.length === 1 ? "" : "s"} · {points} point{points === 1 ? "" : "s"}
          {written > 0 && ` · ${written} written answer${written === 1 ? "" : "s"}`}. Students can retake a failed exam.
        </p>
      </section>

      {qs.map((q, i) => (
        <div className="cs-block open" key={q.id}>
          <div className="cs-block-head static">
            <span className="cs-block-type">Question {i + 1}</span>
            <Segmented value={q.type} label="Answer type"
              options={[{ value: "choice", label: "Multiple choice" }, { value: "text", label: "Written (one line)" }]}
              onChange={(type) => setQ(i, type === q.type ? {} : { ...newExamQuestion(type), id: q.id, q: q.q, points: q.points })} />
            <span className="cs-block-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Move down">▼</button>
              <button type="button" onClick={() => set({ questions: qs.filter((_, k) => k !== i) })} aria-label="Delete question">✕</button>
            </span>
          </div>
          <div className="cs-block-body cs-stack">
            <div className="form-grid">
              <Field label="Question" span><input type="text" value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} /></Field>
              <Field label="Points"><input type="number" min={1} value={q.points ?? 1} onChange={(e) => setQ(i, { points: Number(e.target.value) || 1 })} /></Field>
            </div>
            {q.type === "text" ? (
              <Field label={exam.auto_mark ? "Accepted answers (one per line)" : "Model answer for you when marking (optional, one per line)"}
                hint={exam.auto_mark ? "Any of these counts as correct. Add common spellings." : "Shown to you next to the student's answer."}>
                <LinesField rows={3} value={q.accepted || []} onChange={(accepted) => setQ(i, { accepted })} />
              </Field>
            ) : (
              <ChoiceOptions options={q.options || []} answer={q.answer ?? 0} onChange={(p) => setQ(i, p)} />
            )}
          </div>
        </div>
      ))}

      <div className="cs-addrow">
        <button type="button" className="cs-chip" onClick={() => set({ questions: [...qs, newExamQuestion("choice")] })}>+ Multiple choice</button>
        <button type="button" className="cs-chip" onClick={() => set({ questions: [...qs, newExamQuestion("text")] })}>+ Written answer</button>
      </div>
    </div>
  );
}

function ChoiceOptions({ options, answer, onChange, max = 6 }) {
  const setOpt = (i, v) => onChange({ options: options.map((o, k) => (k === i ? v : o)), answer });
  const remove = (i) => onChange({ options: options.filter((_, k) => k !== i), answer: answer === i ? 0 : answer > i ? answer - 1 : answer });
  return (
    <div className="cs-options">
      {options.map((o, i) => (
        <div className={"cs-option" + (answer === i ? " correct" : "")} key={i}>
          <input type="radio" checked={answer === i} onChange={() => onChange({ options, answer: i })} aria-label={`Option ${i + 1} is correct`} title="Mark as the correct answer" />
          <input type="text" value={o} placeholder={`Option ${String.fromCharCode(65 + i)}`} onChange={(e) => setOpt(i, e.target.value)} />
          {options.length > 2 && <button type="button" className="cs-x" onClick={() => remove(i)} aria-label="Remove option">×</button>}
        </div>
      ))}
      <div className="cs-option-foot">
        {options.length < max && <button type="button" className="admin-btn secondary" onClick={() => onChange({ options: [...options, ""], answer })}>+ Option</button>}
        <span className="form-hint">The round button marks the correct answer.</span>
      </div>
    </div>
  );
}
