import { useState } from "react";

export default function Assessment({ quiz, completed, onPass }) {
  const qs = quiz?.questions || [];
  const pass = quiz?.passScore ?? 60;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!qs.length) return <p className="rd-p">This assessment has no questions yet.</p>;

  const q = qs[i];
  const answered = picked != null;
  const restart = () => { setI(0); setPicked(null); setScore(0); setDone(false); };
  const next = () => {
    if (i + 1 >= qs.length) {
      setDone(true);
      const pct = Math.round((score / qs.length) * 100);
      if (pct >= pass) onPass?.(pct);
    } else { setI(i + 1); setPicked(null); }
  };

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const ok = pct >= pass;
    return (
      <div className={"qz-result " + (ok ? "ok" : "bad")}>
        <div className="qz-ring" style={{ "--p": pct }}><b>{pct}%</b></div>
        <h3>{ok ? "You passed" : "Almost there"}</h3>
        <p>{ok ? `You got ${score} of ${qs.length} right. Nice work.` : `You got ${score} of ${qs.length}. You need ${pass}% to pass, so have another go.`}</p>
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
          const state = !answered ? "" : k === q.answer ? "right" : k === picked ? "wrong" : "dim";
          return (
            <button key={k} className={state} disabled={answered}
                    onClick={() => { setPicked(k); if (k === q.answer) setScore((s) => s + 1); }}>
              <span>{String.fromCharCode(65 + k)}</span>{o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={"qz-fb " + (picked === q.answer ? "ok" : "bad")}>
          <b>{picked === q.answer ? "Correct." : "Not quite."}</b> {q.explain}
        </div>
      )}
      <div className="qz-foot">
        <button className="lx-btn dark" disabled={!answered} onClick={next}>{i + 1 >= qs.length ? "See result" : "Next question"}</button>
      </div>
    </div>
  );
}
