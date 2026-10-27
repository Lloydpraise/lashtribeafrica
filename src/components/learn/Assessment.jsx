import { useState } from "react";

/**
 * grader (optional): async (questionIndex, choice, attemptId) => { attempt_id, correct, answer, explain, done, pct, passed }
 * When it is given, the quiz arrived without its answers and the database marks every answer.
 * Without it (admin preview, demo courses) the quiz is marked here from the answers it carries.
 */
export default function Assessment({ quiz, completed, onPass, grader }) {
  const qs = quiz?.questions || [];
  const pass = quiz?.passScore ?? 60;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct, answer, explain }
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null); // the database's verdict on the last question
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!qs.length) return <p className="rd-p">This assessment has no questions yet.</p>;

  const q = qs[i];
  const answered = picked != null && feedback != null;
  const restart = () => { setI(0); setPicked(null); setFeedback(null); setScore(0); setDone(false); setAttempt(null); setResult(null); setError(""); };

  async function choose(k) {
    if (answered || busy) return;
    setError("");
    if (!grader) {
      setPicked(k);
      setFeedback({ correct: k === q.answer, answer: q.answer, explain: q.explain });
      if (k === q.answer) setScore((s) => s + 1);
      return;
    }
    setBusy(true);
    setPicked(k);
    try {
      const r = await grader(i, k, attempt);
      setAttempt(r.attempt_id);
      setFeedback({ correct: !!r.correct, answer: r.answer, explain: r.explain });
      if (r.correct) setScore((s) => s + 1);
      if (r.done) setResult(r);
    } catch (err) {
      setPicked(null);
      setError(err.message || "Couldn't check that answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const next = () => {
    if (i + 1 >= qs.length) {
      setDone(true);
      const pct = result?.pct ?? Math.round((score / qs.length) * 100);
      const ok = result ? !!result.passed : pct >= pass;
      if (ok) onPass?.(pct);
    } else { setI(i + 1); setPicked(null); setFeedback(null); }
  };

  if (done) {
    const pct = result?.pct ?? Math.round((score / qs.length) * 100);
    const ok = result ? !!result.passed : pct >= pass;
    const right = result?.score ?? score;
    return (
      <div className={"qz-result " + (ok ? "ok" : "bad")}>
        <div className="qz-ring" style={{ "--p": pct }}><b>{pct}%</b></div>
        <h3>{ok ? "You passed" : "Almost there"}</h3>
        <p>{ok ? `You got ${right} of ${qs.length} right. Nice work.` : `You got ${right} of ${qs.length}. You need ${pass}% to pass, so have another go.`}</p>
        <button className="lx-btn ghost" onClick={restart}>{ok ? "Retake quiz" : "Try again"}</button>
      </div>
    );
  }

  return (
    <div className="qz">
      <div className="qz-top">
        <span>Question {i + 1} of {qs.length}</span>
        {completed && <span className="qz-pass">Passed ✓</span>}
      </div>
      <div className="qz-bar"><i style={{ width: ((i + (answered ? 1 : 0)) / qs.length) * 100 + "%" }} /></div>
      <h3 className="qz-q">{q.q}</h3>
      <div className="qz-opts">
        {q.options.map((o, k) => {
          const state = !answered ? (busy && k === picked ? "dim" : "") : k === feedback.answer ? "right" : k === picked ? "wrong" : "dim";
          return (
            <button key={k} className={state} disabled={answered || busy} onClick={() => choose(k)}>
              <span>{String.fromCharCode(65 + k)}</span>{o}
            </button>
          );
        })}
      </div>
      {error && <div className="qz-fb bad"><b>Not saved.</b> {error}</div>}
      {answered && (
        <div className={"qz-fb " + (feedback.correct ? "ok" : "bad")}>
          <b>{feedback.correct ? "Correct." : "Not quite."}</b> {feedback.explain}
        </div>
      )}
      <div className="qz-foot">
        <button className="lx-btn dark" disabled={!answered} onClick={next}>{i + 1 >= qs.length ? "See result" : "Next question"}</button>
      </div>
    </div>
  );
}
