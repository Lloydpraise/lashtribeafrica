import { useRef, useState } from "react";
import { BLOCK_LABELS, newBlock, newQuestion, uid } from "./courseModel.js";
import { blocksToMarkdown, parseBody } from "./courseMarkdown.js";
import { Field, LinesField } from "./fields.jsx";
import ImageField from "./ImageField.jsx";

const ADD_ORDER = ["heading", "text", "list", "steps", "callout", "quote", "figure", "checkpoint", "flip", "compare", "divider"];

const TIPS = {
  heading: "Starts a new chapter. The progress bar at the top of the story has one segment per chapter.",
  text: "One idea per statement. Long text is split into several screens automatically.",
  list: "Checklists make the student tick every item before they can continue.",
  steps: "Revealed one step per tap.",
  callout: "A highlighted tip, mistake or key point on its own screen.",
  quote: "A big centred quote screen.",
  figure: "A full-screen image with an optional caption.",
  checkpoint: "A multiple choice question the student must answer correctly to continue.",
  flip: "A tap-to-flip card, good for myth vs fact.",
  compare: "Do and Don't columns side by side.",
  divider: "A visual break in the article view.",
};

const clip = (s, n = 90) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

function summary(b) {
  switch (b.type) {
    case "heading": return b.text || "Untitled chapter";
    case "text": return b.text || "Empty statement";
    case "list": return `${(b.items || []).length} ${b.style === "numbered" ? "numbered" : b.style === "checklist" ? "checklist" : "bullet"} items`;
    case "steps": return `${(b.items || []).length} steps${b.items?.[0]?.title ? ": " + b.items[0].title : ""}`;
    case "callout": return `${b.title || b.tone || "Note"}: ${b.text || ""}`;
    case "quote": return b.text || "Empty quote";
    case "figure": return b.caption || (b.url ? "Image" : "No image yet");
    case "checkpoint": return b.question || "Empty question";
    case "flip": return b.front || "Empty card";
    case "compare": return b.title || `${(b.do || []).length} do / ${(b.dont || []).length} don't`;
    case "divider": return "—";
    case "quiz": return `${(b.questions || []).length} questions · pass ${b.passScore ?? 70}%`;
    default: return b.type;
  }
}

// ---------------------------------------------------------------------
// option lists (quick checks and quiz questions)
// ---------------------------------------------------------------------
function Options({ options, answer, onChange, max = 5 }) {
  const set = (i, v) => onChange({ options: options.map((o, k) => (k === i ? v : o)), answer });
  const remove = (i) =>
    onChange({ options: options.filter((_, k) => k !== i), answer: answer === i ? 0 : answer > i ? answer - 1 : answer });
  return (
    <div className="cs-options">
      {options.map((o, i) => (
        <div className={"cs-option" + (answer === i ? " correct" : "")} key={i}>
          <input type="radio" checked={answer === i} onChange={() => onChange({ options, answer: i })} aria-label={`Option ${i + 1} is correct`} title="Mark as the correct answer" />
          <input type="text" value={o} placeholder={`Option ${String.fromCharCode(65 + i)}`} onChange={(e) => set(i, e.target.value)} />
          {options.length > 2 && (
            <button type="button" className="cs-x" onClick={() => remove(i)} aria-label="Remove option">×</button>
          )}
        </div>
      ))}
      <div className="cs-option-foot">
        {options.length < max && (
          <button type="button" className="admin-btn secondary" onClick={() => onChange({ options: [...options, ""], answer })}>+ Option</button>
        )}
        <span className="form-hint">The round button marks the correct answer.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// per-type forms
// ---------------------------------------------------------------------
function BlockForm({ b, set, courseId }) {
  switch (b.type) {
    case "heading":
      return <Field label="Chapter title"><input type="text" value={b.text || ""} onChange={(e) => set({ text: e.target.value })} /></Field>;
    case "text":
      return (
        <Field label="Statement" hint={`Use **bold** and *italic*. ${(b.text || "").length} characters${(b.text || "").length > 260 ? " — long, it will be split over several screens" : ""}.`}>
          <textarea rows={3} value={b.text || ""} onChange={(e) => set({ text: e.target.value })} />
        </Field>
      );
    case "list":
      return (
        <>
          <Field label="Style">
            <select value={b.style || "bullets"} onChange={(e) => set({ style: e.target.value })}>
              <option value="bullets">Bullets</option>
              <option value="numbered">Numbered</option>
              <option value="checklist">Checklist (student ticks every item to continue)</option>
            </select>
          </Field>
          <Field label="Items" hint="One item per line."><LinesField value={b.items} onChange={(items) => set({ items })} rows={5} /></Field>
        </>
      );
    case "steps":
      return (
        <div className="cs-stack">
          {(b.items || []).map((s, i) => (
            <div className="cs-substep" key={i}>
              <span className="cs-substep-n">{(b.start || 1) + i}</span>
              <div className="cs-stack">
                <input type="text" placeholder="Step title" value={s.title || ""} onChange={(e) => set({ items: b.items.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} />
                <textarea rows={2} placeholder="What to do" value={s.text || ""} onChange={(e) => set({ items: b.items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} />
              </div>
              {(b.items || []).length > 1 && <button type="button" className="cs-x" onClick={() => set({ items: b.items.filter((_, k) => k !== i) })} aria-label="Remove step">×</button>}
            </div>
          ))}
          <div><button type="button" className="admin-btn secondary" onClick={() => set({ items: [...(b.items || []), { title: "", text: "" }] })}>+ Step</button></div>
        </div>
      );
    case "callout":
      return (
        <div className="form-grid">
          <Field label="Kind">
            <select value={b.tone || "tip"} onChange={(e) => set({ tone: e.target.value })}>
              <option value="tip">Pro tip</option>
              <option value="mistake">Common mistake</option>
              <option value="key">Remember (key point)</option>
              <option value="note">Note</option>
            </select>
          </Field>
          <Field label="Heading (optional)"><input type="text" value={b.title || ""} onChange={(e) => set({ title: e.target.value })} placeholder="Defaults to the kind" /></Field>
          <Field label="Text" span><textarea rows={3} value={b.text || ""} onChange={(e) => set({ text: e.target.value })} /></Field>
        </div>
      );
    case "quote":
      return (
        <div className="form-grid">
          <Field label="Quote" span><textarea rows={2} value={b.text || ""} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Attribution (optional)"><input type="text" value={b.by || ""} onChange={(e) => set({ by: e.target.value })} /></Field>
        </div>
      );
    case "figure":
      return (
        <div className="cs-stack">
          <ImageField url={b.url} folder={`courses/${courseId}/figures`} maxWidth={1400} compact label="image" onChange={({ url }) => set({ url })} />
          <Field label="Caption (optional)"><input type="text" value={b.caption || ""} onChange={(e) => set({ caption: e.target.value })} /></Field>
        </div>
      );
    case "checkpoint":
      return (
        <div className="cs-stack">
          <Field label="Question"><input type="text" value={b.question || ""} onChange={(e) => set({ question: e.target.value })} /></Field>
          <Options options={b.options || []} answer={b.answer ?? 0} max={4} onChange={set} />
          <Field label="Explanation (shown after a correct answer)"><textarea rows={2} value={b.explain || ""} onChange={(e) => set({ explain: e.target.value })} /></Field>
        </div>
      );
    case "flip":
      return (
        <div className="form-grid">
          <Field label="Prompt above the card"><input type="text" value={b.prompt || ""} onChange={(e) => set({ prompt: e.target.value })} /></Field>
          <div className="form-field" />
          <Field label="Front label"><input type="text" value={b.frontLabel || ""} placeholder="Myth" onChange={(e) => set({ frontLabel: e.target.value })} /></Field>
          <Field label="Back label"><input type="text" value={b.backLabel || ""} placeholder="Fact" onChange={(e) => set({ backLabel: e.target.value })} /></Field>
          <Field label="Front" span><textarea rows={2} value={b.front || ""} onChange={(e) => set({ front: e.target.value })} /></Field>
          <Field label="Back" span><textarea rows={2} value={b.back || ""} onChange={(e) => set({ back: e.target.value })} /></Field>
        </div>
      );
    case "compare":
      return (
        <div className="form-grid">
          <Field label="Title (optional)" span><input type="text" value={b.title || ""} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Do column" hint="One per line."><LinesField value={b.do} onChange={(v) => set({ do: v })} rows={4} /></Field>
          <Field label="Don't column" hint="One per line."><LinesField value={b.dont} onChange={(v) => set({ dont: v })} rows={4} /></Field>
        </div>
      );
    case "divider":
      return <p className="form-hint">A divider has no settings.</p>;
    default:
      return <p className="form-hint">Unknown block type “{b.type}”. It is kept as is.</p>;
  }
}

// ---------------------------------------------------------------------
// quiz (assessment lessons)
// ---------------------------------------------------------------------
function QuizForm({ quiz, onChange }) {
  const questions = quiz.questions || [];
  const setQ = (i, patch) => onChange({ ...quiz, questions: questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...quiz, questions: next });
  };
  return (
    <div className="cs-stack">
      <div className="cs-row">
        <Field label="Pass mark (%)">
          <input type="number" min={1} max={100} value={quiz.passScore ?? 70} onChange={(e) => onChange({ ...quiz, passScore: Number(e.target.value) || 70 })} />
        </Field>
        <span className="form-hint">{questions.length} question{questions.length === 1 ? "" : "s"}. Students retake the quiz until they pass.</span>
      </div>
      {questions.map((q, i) => (
        <div className="cs-block open" key={i}>
          <div className="cs-block-head static">
            <span className="cs-block-type">Question {i + 1}</span>
            <span className="cs-block-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="Move down">▼</button>
              <button type="button" onClick={() => onChange({ ...quiz, questions: questions.filter((_, k) => k !== i) })} aria-label="Delete question">✕</button>
            </span>
          </div>
          <div className="cs-block-body cs-stack">
            <Field label="Question"><input type="text" value={q.q || ""} onChange={(e) => setQ(i, { q: e.target.value })} /></Field>
            <Options options={q.options || []} answer={q.answer ?? 0} onChange={(p) => setQ(i, p)} />
            <Field label="Explanation (shown after answering)"><textarea rows={2} value={q.explain || ""} onChange={(e) => setQ(i, { explain: e.target.value })} /></Field>
          </div>
        </div>
      ))}
      <div><button type="button" className="admin-btn secondary" onClick={() => onChange({ ...quiz, questions: [...questions, newQuestion()] })}>+ Add question</button></div>
    </div>
  );
}

// ---------------------------------------------------------------------
// the editor
// ---------------------------------------------------------------------
/**
 * mode: "story"  - full block palette
 *       "notes"  - same palette, shown under a video
 *       "quiz"   - a single quiz block (assessment lessons)
 */
export default function BlockEditor({ blocks, onChange, courseId, mode = "story" }) {
  const keysRef = useRef([]);
  if (keysRef.current.length !== blocks.length) keysRef.current = blocks.map((_, i) => keysRef.current[i] || uid());
  const keys = keysRef.current;

  const [open, setOpen] = useState(() => new Set());
  const [view, setView] = useState("visual"); // visual | text
  const [text, setText] = useState("");
  const [warn, setWarn] = useState([]);
  const dragFrom = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  const commit = (nextBlocks, nextKeys) => {
    keysRef.current = nextKeys;
    onChange(nextBlocks);
  };

  const toggle = (k) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const patch = (i, p) => commit(blocks.map((b, k) => (k === i ? { ...b, ...p } : b)), keys);
  const remove = (i) => commit(blocks.filter((_, k) => k !== i), keys.filter((_, k) => k !== i));
  const duplicate = (i) => {
    const k = uid();
    commit([...blocks.slice(0, i + 1), JSON.parse(JSON.stringify(blocks[i])), ...blocks.slice(i + 1)], [...keys.slice(0, i + 1), k, ...keys.slice(i + 1)]);
    setOpen((s) => new Set(s).add(k));
  };
  const move = (from, to) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const nb = blocks.slice(); const nk = keys.slice();
    const [b] = nb.splice(from, 1); const [k] = nk.splice(from, 1);
    nb.splice(to, 0, b); nk.splice(to, 0, k);
    commit(nb, nk);
  };
  const add = (type) => {
    const k = uid();
    commit([...blocks, newBlock(type)], [...keys, k]);
    if (type !== "divider") setOpen((s) => new Set(s).add(k));
  };

  // ----- quick write -----
  const quiz = mode === "quiz";
  const serialise = () => blocksToMarkdown(blocks);
  const apply = (src = text) => {
    const r = parseBody(src, { quiz });
    setWarn(r.warnings);
    commit(r.blocks, r.blocks.map(() => uid()));
    setText(blocksToMarkdown(r.blocks));
    return r;
  };
  const toText = () => { setText(serialise()); setWarn([]); setView("text"); };
  const toVisual = () => {
    if (view === "text" && text.trim() !== serialise().trim()) apply();
    setView("visual");
  };

  const quizBlock = blocks.find((b) => b.type === "quiz") || newBlock("quiz");

  return (
    <div className="cs-blocks">
      <div className="cs-blocks-bar">
        <div className="cs-seg" role="group" aria-label="Editing mode">
          <button type="button" className={view === "visual" ? "on" : ""} onClick={toVisual}>Visual</button>
          <button type="button" className={view === "text" ? "on" : ""} onClick={toText}>Quick write</button>
        </div>
        {!quiz && <span className="form-hint">{blocks.length} block{blocks.length === 1 ? "" : "s"}</span>}
      </div>

      {view === "text" ? (
        <div className="cs-stack">
          <textarea className="cs-quick" rows={18} spellCheck value={text} onChange={(e) => setText(e.target.value)} />
          <div className="cs-row">
            <button type="button" className="admin-btn" onClick={() => apply()} disabled={text.trim() === serialise().trim()}>Apply changes</button>
            <span className="form-hint">
              {quiz ? "Write ?? Question, then - options with * on the right one." : "## chapter · paragraph · - list · > Tip: … · ?? question · steps: · flip: front || back · ![caption](url)"}
            </span>
          </div>
          {warn.length > 0 && <ul className="cs-warn">{warn.map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>
      ) : quiz ? (
        <QuizForm
          quiz={quizBlock}
          onChange={(q) => commit([q], [keys[0] || uid()])}
        />
      ) : (
        <>
          {blocks.length === 0 && <p className="cs-empty">No content yet. Add a first block below, or switch to Quick write to paste a whole lesson.</p>}
          <div className="cs-block-list">
            {blocks.map((b, i) => {
              const k = keys[i];
              const isOpen = open.has(k);
              return (
                <div
                  className={"cs-block" + (isOpen ? " open" : "") + (overIdx === i ? " over" : "") + ` t-${b.type}`}
                  key={k}
                  onDragOver={(e) => { if (dragFrom.current != null) { e.preventDefault(); setOverIdx(i); } }}
                  onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                  onDrop={(e) => { e.preventDefault(); const from = dragFrom.current; dragFrom.current = null; setOverIdx(null); if (from != null) move(from, i); }}
                >
                  <div className="cs-block-head" onClick={() => toggle(k)}>
                    <span
                      className="cs-grip"
                      draggable
                      title="Drag to reorder"
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
                      onDragEnd={() => { dragFrom.current = null; setOverIdx(null); }}
                    >⋮⋮</span>
                    <span className="cs-block-type">{BLOCK_LABELS[b.type] || b.type}</span>
                    <span className="cs-block-sum">{clip(summary(b))}</span>
                    <span className="cs-block-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up">▲</button>
                      <button type="button" onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} aria-label="Move down">▼</button>
                      <button type="button" onClick={() => duplicate(i)} aria-label="Duplicate" title="Duplicate">⧉</button>
                      <button type="button" onClick={() => remove(i)} aria-label="Delete" title="Delete">✕</button>
                    </span>
                  </div>
                  {isOpen && (
                    <div className="cs-block-body">
                      {TIPS[b.type] && <p className="form-hint cs-tip">{TIPS[b.type]}</p>}
                      <BlockForm b={b} set={(p) => patch(i, p)} courseId={courseId} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="cs-addbar">
            <span>Add</span>
            {ADD_ORDER.map((t) => (
              <button type="button" key={t} className="cs-chip" onClick={() => add(t)}>+ {BLOCK_LABELS[t]}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
