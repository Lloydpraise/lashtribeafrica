import { useState } from "react";

/**
 * The course's final exam, between the last lesson and the certificate.
 * exam: { title, intro, pass_score, auto_mark, questions:[{id,type,q,options,points}], unlocked, latest }
 * onSubmit(answers) -> attempt { status: 'passed'|'failed'|'pending_review', pct, pass_score, marks, feedback }
 */
export default function Exam({ exam, preview, onSubmit, onPassed, onCertificate }) {
  const [attempt, setAttempt] = useState(exam.latest || null);
  const [retake, setRetake] = useState(false);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const qs = exam.questions || [];

  const head = (
    <div className="lx-lesson-head">
      <div className="lx-eyebrow">Final exam<span>· {qs.length} question{qs.length === 1 ? "" : "s"} · pass mark {exam.pass_score}%</span></div>
      <h1>{exam.title || "Final exam"}</h1>
      {exam.intro && <p className="lx-sum">{exam.intro}</p>}
    </div>
  );

  if (!exam.unlocked) {
    return <>{head}<div className="lx-locked"><div className="lx-lock-ic">🔒</div><h2>Finish every lesson first</h2><p>The final exam opens once every lesson in this course is complete.</p></div></>;
  }

  if (attempt && !retake) {
    const passed = attempt.status === "passed";
    if (attempt.status === "pending_review") {
      return (
        <>{head}
          <div className="qz-result">
            <div className="lx-cert-seal">✎</div>
            <h3>Handed in</h3>
            <p>Some answers are checked by your tutor. Your result and certificate appear here once they're marked.</p>
          </div>
        </>
      );
    }
    const right = Object.values(attempt.marks || {}).filter(Boolean).length;
    return (
      <>{head}
        <div className={"qz-result " + (passed ? "ok" : "bad")}>
          <div className="qz-ring" style={{ "--p": attempt.pct || 0 }}><b>{attempt.pct ?? 0}%</b></div>
          <h3>{passed ? "You passed the exam" : "Not this time"}</h3>
          <p>{passed
            ? `You got ${right} of ${qs.length} right.`
            : `You got ${right} of ${qs.length}. You need ${attempt.pass_score}% to pass. Review the lessons and try again.`}</p>
          {attempt.feedback && <p className="ex-feedback">“{attempt.feedback}”</p>}
          {passed
            ? <button className="lx-btn dark" onClick={onCertificate}>Get your certificate →</button>
            : <button className="lx-btn dark" onClick={() => { setRetake(true); setAnswers({}); setError(""); }}>Try again</button>}
          {passed && preview && <button className="lx-btn ghost" onClick={() => { setRetake(true); setAnswers({}); }}>Preview again</button>}
        </div>
      </>
    );
  }

  const missing = qs.filter((q) => (q.type === "text" ? !String(answers[q.id] ?? "").trim() : answers[q.id] == null)).length;

  async function submit(e) {
    e.preventDefault();
    if (missing) { setError(`Answer every question first (${missing} left).`); return; }
    setBusy(true);
    setError("");
    try {
      const a = await onSubmit(answers);
      setAttempt(a);
      setRetake(false);
      if (a.status === "passed") onPassed?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Couldn't hand in the exam. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>{head}
      <form className="ex" onSubmit={submit}>
        {preview && <p className="ex-note">Preview: answers are marked in your browser and nothing is saved.</p>}
        {qs.map((q, i) => (
          <fieldset className="ex-q" key={q.id}>
            <legend><span>Question {i + 1}{Number(q.points) > 1 ? ` · ${q.points} points` : ""}</span>{q.q}</legend>
            {q.type === "text" ? (
              <input type="text" className="ex-text" maxLength={300} value={answers[q.id] ?? ""} placeholder="Type your answer"
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            ) : (
              <div className="qz-opts">
                {(q.options || []).map((o, k) => (
                  <button type="button" key={k} className={answers[q.id] === k ? "picked" : ""} aria-pressed={answers[q.id] === k}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: k }))}>
                    <span>{String.fromCharCode(65 + k)}</span>{o}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        ))}
        {error && <div className="qz-fb bad">{error}</div>}
        <div className="qz-foot">
          <button className="lx-btn dark" disabled={busy}>{busy ? "Handing in…" : "Hand in exam"}</button>
        </div>
      </form>
    </>
  );
}
