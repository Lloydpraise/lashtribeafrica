import { fmtMinutes } from "./util.js";

const I = {
  video: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  reading: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h6a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h7z" /></svg>,
  assessment: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l2 2 4-4M5 4h14v16H5z" /></svg>,
  done: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>,
  lock: <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  cert: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5" /><path d="M9 13l-2 8 5-3 5 3-2-8" /></svg>,
};

export default function Curriculum({ course, modules, lessons, progress, currentId, stateOf, onPick, pct, doneCount, certReady, certEnabled }) {
  return (
    <nav className="lx-curr" aria-label="Course curriculum">
      <div className="lx-curr-head">
        <div className="lx-curr-title">{course.title}</div>
        <div className="lx-curr-meta"><span>{doneCount} of {lessons.length} lessons</span><b>{pct}%</b></div>
        <div className="lx-bar"><i style={{ width: pct + "%" }} /></div>
      </div>
      {modules.map((m, mi) => {
        const ls = lessons.filter((l) => l.module_id === m.id);
        if (!ls.length) return null;
        return (
          <div className="lx-mod" key={m.id}>
            <div className="lx-mod-title"><span>Module {mi + 1}</span>{m.title}</div>
            {ls.map((l) => {
              const st = stateOf(l);
              const done = progress[l.id]?.completed;
              const now = l.id === currentId;
              const meta = l.kind === "video" ? fmtMinutes(l.duration_seconds) : l.kind === "reading" ? `${l.read_minutes || 3} min read` : "Quiz";
              return (
                <button key={l.id} className={"lx-lesson" + (now ? " now" : "") + (done ? " done" : "") + (st !== "open" ? " locked" : "")}
                        aria-current={now ? "true" : undefined} onClick={() => onPick(l.id)}>
                  <span className="lx-lesson-ic">{done ? I.done : st !== "open" ? I.lock : I[l.kind]}</span>
                  <span className="lx-lesson-tx"><strong>{l.title}</strong><small>{meta}</small></span>
                </button>
              );
            })}
          </div>
        );
      })}
      {certEnabled && (
        <button className={"lx-lesson cert" + (currentId === "__certificate" ? " now" : "") + (certReady ? " done" : " locked")} onClick={() => onPick("__certificate")}>
          <span className="lx-lesson-ic">{certReady ? I.done : I.cert}</span>
          <span className="lx-lesson-tx"><strong>Course complete</strong><small>{certReady ? "Unlocked" : "Finish every lesson"}</small></span>
        </button>
      )}
    </nav>
  );
}
