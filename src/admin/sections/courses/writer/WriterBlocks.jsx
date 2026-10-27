// What each lesson block looks like inside the lesson writer. Every block is edited in place and
// looks close to what students see, so there are no forms to fill in. The blocks are the same
// objects the rest of the course builder uses (see newBlock in courseModel.js).
import { useEffect, useRef, useState } from "react";
import RichText, { placeCaret } from "./RichText.jsx";
import { uploadMedia, explain } from "../courses.api.js";

export const TONES = [
  { value: "tip", label: "Pro tip", icon: "✦" },
  { value: "mistake", label: "Common mistake", icon: "!" },
  { value: "key", label: "Remember", icon: "★" },
  { value: "note", label: "Note", icon: "i" },
];
const toneOf = (t) => TONES.find((x) => x.value === t) || TONES[3];

/** Focuses item `i` of a block's list once it has rendered (used after adding a row). */
function useRowFocus(root) {
  const [want, setWant] = useState(null);
  useEffect(() => {
    if (!want) return;
    const rows = root.current?.querySelectorAll(`[data-row="${want.group}"]`);
    const row = rows?.[want.i];
    const field = row?.querySelectorAll("[contenteditable='true']")[want.field || 0];
    if (field) placeCaret(field, want.where || "end");
    setWant(null);
  }, [want, root]);
  return setWant;
}

const replaceAt = (arr, i, v) => arr.map((x, k) => (k === i ? v : x));
const insertAt = (arr, i, v) => [...arr.slice(0, i), v, ...arr.slice(i)];
const removeAt = (arr, i) => arr.filter((_, k) => k !== i);

// ---------------------------------------------------------------------
// text-like blocks
// ---------------------------------------------------------------------
function HeadingBlock({ b, set, api }) {
  return (
    <RichText plain className="lw-h2" value={b.text} placeholder="Chapter heading" label="Chapter heading"
      onChange={(text) => set({ text })}
      onEnter={({ split }) => { const { head, tail } = split(); set({ text: head }); api.newAfter({ type: "text", text: tail }, "start"); }}
      onBackspaceStart={api.backspaceStart}
      onPasteText={api.pasteText} />
  );
}

function TextBlock({ b, set, api }) {
  return (
    <RichText className="lw-p" value={b.text} placeholder="Write here, or type / to add a flip card, quiz, image…" label="Paragraph"
      onChange={(text) => api.typed(text)}
      onEnter={({ split }) => { const { head, tail } = split(); set({ text: head }); api.newAfter({ type: "text", text: tail }, "start"); }}
      onBackspaceStart={api.backspaceStart}
      onPasteText={api.pasteText} />
  );
}

function QuoteBlock({ b, set, api }) {
  return (
    <blockquote className="lw-quote">
      <span className="lw-qmark" aria-hidden>“</span>
      <RichText primary className="lw-quote-text" value={b.text} placeholder="A short line students should remember" label="Quote"
        onChange={(text) => set({ text })}
        onEnter={() => api.focusField(1)}
        onBackspaceStart={api.backspaceStart}
        onPasteText={api.pasteText} />
      <div className="lw-quote-by">
        <span aria-hidden>—</span>
        <RichText plain value={b.by || ""} placeholder="Who said it (optional)" label="Quote attribution"
          onChange={(by) => set({ by })}
          onEnter={() => api.newAfter({ type: "text", text: "" }, "start")} />
      </div>
    </blockquote>
  );
}

function CalloutBlock({ b, set, api }) {
  const t = toneOf(b.tone);
  return (
    <aside className={"lw-callout tone-" + (b.tone || "note")}>
      <div className="lw-callout-tones" role="group" aria-label="Kind of callout" contentEditable={false}>
        {TONES.map((x) => (
          <button type="button" key={x.value} className={(b.tone || "note") === x.value ? "on" : ""} onClick={() => set({ tone: x.value })}>
            <i aria-hidden>{x.icon}</i>{x.label}
          </button>
        ))}
      </div>
      <div className="lw-callout-body">
        <span className="lw-callout-ic" aria-hidden>{t.icon}</span>
        <div>
          <RichText plain className="lw-callout-title" value={b.title || ""} placeholder={t.label} label="Callout heading"
            onChange={(title) => set({ title })} onEnter={() => api.focusField(1)} onBackspaceStart={api.backspaceStart} />
          <RichText primary className="lw-callout-text" value={b.text} placeholder="The tip, warning or key point" label="Callout text"
            onChange={(text) => set({ text })}
            onEnter={() => api.newAfter({ type: "text", text: "" }, "start")} />
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------
// lists
// ---------------------------------------------------------------------
function ListBlock({ b, set, api }) {
  const root = useRef(null);
  const focusRow = useRowFocus(root);
  const items = b.items?.length ? b.items : [""];
  const style = b.style || "bullets";

  const enter = (i, split) => {
    const { head, tail } = split();
    if (!head.trim() && !tail.trim() && i === items.length - 1 && items.length > 1) {
      // Enter on an empty last item leaves the list, like a word processor
      set({ items: removeAt(items, i) });
      api.newAfter({ type: "text", text: "" }, "start");
      return;
    }
    set({ items: insertAt(replaceAt(items, i, head), i + 1, tail) });
    focusRow({ group: "li", i: i + 1, where: "start" });
  };
  const back = (i, { empty }) => {
    if (i === 0) {
      if (items.length === 1) api.replaceSelf([{ type: "text", text: items[0] }], "start");
      else if (empty) set({ items: removeAt(items, 0) });
      else api.backspaceStart({ empty: false });
      return;
    }
    const merged = items[i - 1] + (empty ? "" : (items[i - 1] ? " " : "") + items[i]);
    const at = items[i - 1].length;
    set({ items: removeAt(replaceAt(items, i - 1, merged), i) });
    focusRow({ group: "li", i: i - 1, where: at });
  };

  return (
    <div className={"lw-list s-" + style} ref={root}>
      {items.map((it, i) => (
        <div className="lw-li" data-row="li" key={i}>
          <span className="lw-li-mark" aria-hidden contentEditable={false}>{style === "numbered" ? `${i + 1}.` : style === "checklist" ? "" : "•"}</span>
          <RichText value={it} placeholder={i === 0 ? (style === "checklist" ? "Something students tick off" : "List item") : ""} label={`Item ${i + 1}`}
            onChange={(v) => set({ items: replaceAt(items, i, v) })}
            onEnter={({ split }) => enter(i, split)}
            onBackspaceStart={(info) => back(i, info)}
            onPasteText={(text) => {
              const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ xX]\])\s*/, "").trim()).filter(Boolean);
              set({ items: [...items.slice(0, i + 1), ...lines, ...items.slice(i + 1)].filter((x, k) => k !== i || x.trim()) });
              return true;
            }} />
        </div>
      ))}
      {style === "checklist" && <p className="lw-note" contentEditable={false}>Students tick every item before they can continue.</p>}
    </div>
  );
}

function StepsBlock({ b, set, api }) {
  const root = useRef(null);
  const focusRow = useRowFocus(root);
  const items = b.items?.length ? b.items : [{ title: "", text: "" }];
  const first = b.start || 1;
  const setItem = (i, p) => set({ items: replaceAt(items, i, { ...items[i], ...p }) });
  const add = (i) => { set({ items: insertAt(items, i + 1, { title: "", text: "" }) }); focusRow({ group: "step", i: i + 1, where: "start" }); };
  const drop = (i) => {
    if (items.length === 1) { api.remove(); return; }
    set({ items: removeAt(items, i) });
    focusRow({ group: "step", i: Math.max(0, i - 1), field: 1 });
  };
  return (
    <div className="lw-card lw-steps" ref={root}>
      <div className="lw-card-tag" contentEditable={false}>Steps · students reveal one at a time</div>
      <ol>
        {items.map((s, i) => (
          <li data-row="step" key={i}>
            <span className="lw-step-n" contentEditable={false}>{first + i}</span>
            <div className="lw-step-body">
              <RichText plain className="lw-step-title" value={s.title || ""} placeholder="Step name" label={`Step ${first + i} name`}
                onChange={(title) => setItem(i, { title })}
                onEnter={() => focusRow({ group: "step", i, field: 1, where: "start" })}
                onBackspaceStart={({ empty }) => { if (empty && !s.text) drop(i); }} />
              <RichText className="lw-step-text" value={s.text || ""} placeholder="What happens in this step" label={`Step ${first + i} text`}
                onChange={(text) => setItem(i, { text })}
                onEnter={() => add(i)} />
            </div>
            {items.length > 1 && <button type="button" className="lw-x" onClick={() => drop(i)} aria-label="Remove step" contentEditable={false}>×</button>}
          </li>
        ))}
      </ol>
      <button type="button" className="lw-add" onClick={() => add(items.length - 1)}>+ Add step</button>
    </div>
  );
}

function CompareBlock({ b, set }) {
  const root = useRef(null);
  const focusRow = useRowFocus(root);
  const col = (key, labelKey, fallback, icon) => {
    const items = b[key]?.length ? b[key] : [""];
    return (
      <div className={"lw-cmp-col " + key}>
        <div className="lw-cmp-head">
          <i aria-hidden>{icon}</i>
          <RichText plain value={b[labelKey] || ""} placeholder={fallback} label={`${fallback} column heading`} onChange={(v) => set({ [labelKey]: v })} />
        </div>
        {items.map((it, i) => (
          <div className="lw-cmp-row" data-row={key} key={i}>
            <RichText value={it} placeholder={i === 0 ? "Add a point" : ""} label={`${fallback} point ${i + 1}`}
              onChange={(v) => set({ [key]: replaceAt(items, i, v) })}
              onEnter={({ split }) => { const { head, tail } = split(); set({ [key]: insertAt(replaceAt(items, i, head), i + 1, tail) }); focusRow({ group: key, i: i + 1, where: "start" }); }}
              onBackspaceStart={({ empty }) => { if (empty && items.length > 1) { set({ [key]: removeAt(items, i) }); focusRow({ group: key, i: Math.max(0, i - 1) }); } }} />
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="lw-card lw-cmp" ref={root}>
      <div className="lw-card-tag" contentEditable={false}>Do / Don't</div>
      <RichText plain className="lw-cmp-title" value={b.title || ""} placeholder="Title (optional)" label="Comparison title" onChange={(title) => set({ title })} />
      <div className="lw-cmp-cols">
        {col("do", "doLabel", "Do", "✓")}
        {col("dont", "dontLabel", "Don't", "✕")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// interactive
// ---------------------------------------------------------------------
function FlipBlock({ b, set }) {
  return (
    <div className="lw-card lw-flip">
      <div className="lw-card-tag" contentEditable={false}>Flip card · students tap to turn it over</div>
      <RichText plain className="lw-flip-prompt" value={b.prompt || ""} placeholder="Tap the card" label="Line above the card" onChange={(prompt) => set({ prompt })} />
      <div className="lw-flip-faces">
        <div className="lw-face front">
          <RichText plain className="lw-face-label" value={b.frontLabel || ""} placeholder="Myth" label="Front label" onChange={(frontLabel) => set({ frontLabel })} />
          <RichText primary className="lw-face-text" value={b.front || ""} placeholder="What the front says" label="Front of the card" onChange={(front) => set({ front })} />
          <em contentEditable={false}>Front · Tap to flip</em>
        </div>
        <span className="lw-flip-arrow" aria-hidden>↻</span>
        <div className="lw-face back">
          <RichText plain className="lw-face-label" value={b.backLabel || ""} placeholder="Fact" label="Back label" onChange={(backLabel) => set({ backLabel })} />
          <RichText className="lw-face-text" value={b.back || ""} placeholder="What students see after flipping" label="Back of the card" onChange={(back) => set({ back })} />
          <em contentEditable={false}>Back</em>
        </div>
      </div>
    </div>
  );
}

function CheckpointBlock({ b, set }) {
  const root = useRef(null);
  const focusRow = useRowFocus(root);
  const options = b.options?.length ? b.options : ["", ""];
  const answer = b.answer ?? 0;
  const remove = (i) => set({ options: removeAt(options, i), answer: answer === i ? 0 : answer > i ? answer - 1 : answer });
  const add = (i) => {
    if (options.length >= 5) return;
    set({ options: insertAt(options, i + 1, "") });
    focusRow({ group: "opt", i: i + 1, where: "start" });
  };
  return (
    <div className="lw-card lw-check" ref={root}>
      <div className="lw-card-tag" contentEditable={false}>Quick check · students answer correctly to continue</div>
      <RichText plain primary className="lw-check-q" value={b.question || ""} placeholder="Ask a question" label="Question"
        onChange={(question) => set({ question })} onEnter={() => focusRow({ group: "opt", i: 0, where: "end" })} />
      <div className="lw-opts">
        {options.map((o, i) => (
          <div className={"lw-opt" + (answer === i ? " right" : "")} data-row="opt" key={i}>
            <button type="button" className="lw-opt-mark" onClick={() => set({ answer: i })} aria-pressed={answer === i}
              title={answer === i ? "This is the correct answer" : "Mark as the correct answer"}>
              {answer === i ? "✓" : String.fromCharCode(65 + i)}
            </button>
            <RichText plain value={o} placeholder={`Answer ${String.fromCharCode(65 + i)}`} label={`Answer ${String.fromCharCode(65 + i)}`}
              onChange={(v) => set({ options: replaceAt(options, i, v) })}
              onEnter={() => (i === options.length - 1 && options.length < 5 ? add(i) : focusRow({ group: "opt", i: i + 1, where: "end" }))}
              onBackspaceStart={({ empty }) => { if (empty && options.length > 2) { remove(i); focusRow({ group: "opt", i: Math.max(0, i - 1) }); } }} />
            {options.length > 2 && <button type="button" className="lw-x" onClick={() => remove(i)} aria-label="Remove answer">×</button>}
          </div>
        ))}
      </div>
      <div className="lw-check-foot">
        {options.length < 5 && <button type="button" className="lw-add" onClick={() => add(options.length - 1)}>+ Add answer</button>}
        <span className="lw-note">Click the letter to mark the right answer.</span>
      </div>
      <div className="lw-explain">
        <b contentEditable={false}>After a correct answer</b>
        <RichText value={b.explain || ""} placeholder="Explain why it is right (optional)" label="Explanation" onChange={(explain) => set({ explain })} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// media
// ---------------------------------------------------------------------
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export function FigureBlock({ b, set, api }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState("");
  const input = useRef(null);
  const started = useRef(false);

  async function upload(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError("Use a JPG, PNG, WebP or GIF image."); return; }
    setBusy(true); setError("");
    try {
      const up = await uploadMedia(file, `courses/${api.courseId}/figures`, { maxWidth: 1400 });
      set({ url: up.url, _file: undefined });
    } catch (err) {
      setError(explain(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  // an image dropped or pasted into the document arrives with the file attached
  useEffect(() => {
    if (b._file && !started.current) {
      started.current = true;
      const f = b._file;
      set({ _file: undefined });
      upload(f);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const useLink = () => {
    const v = link.trim();
    if (!/^(https?:\/\/|\/)/i.test(v)) { setError("Paste a full image link starting with https://"); return; }
    set({ url: v }); setLink(""); setLinking(false); setError("");
  };

  const dropProps = {
    onDragOver: (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.stopPropagation(); setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e) => {
      if (!e.dataTransfer.files?.length) return;
      e.preventDefault(); e.stopPropagation(); setOver(false);
      upload(e.dataTransfer.files[0]);
    },
  };

  return (
    <figure className={"lw-fig" + (over ? " over" : "")} {...dropProps}>
      <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload(f); }} />
      {b.url ? (
        <div className="lw-fig-img">
          <img src={b.url} alt={b.caption || ""} draggable={false} />
          {busy && <div className="lw-fig-busy">Uploading…</div>}
          <div className="lw-fig-tools">
            <button type="button" onClick={() => input.current.click()} disabled={busy}>Replace</button>
            <button type="button" onClick={() => set({ url: "" })} disabled={busy}>Remove</button>
          </div>
        </div>
      ) : (
        <div className="lw-fig-drop">
          {busy ? <b>Uploading…</b> : (
            <>
              <span className="lw-fig-ic" aria-hidden>🖼</span>
              <b>Drop a picture here</b>
              <span>or</span>
              <div className="lw-fig-actions">
                <button type="button" className="admin-btn" onClick={() => input.current.click()}>Upload from computer</button>
                <button type="button" className="admin-btn secondary" onClick={() => setLinking((v) => !v)}>Use a link</button>
              </div>
              {linking && (
                <div className="lw-fig-link">
                  <input type="text" autoFocus placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); useLink(); } }} />
                  <button type="button" className="admin-btn" onClick={useLink}>Use</button>
                </div>
              )}
              <small>Large photos are shrunk and saved as WebP automatically. You can also paste a copied image.</small>
            </>
          )}
        </div>
      )}
      {error && <p className="admin-gate-error">{error}</p>}
      <RichText plain className="lw-fig-cap" value={b.caption || ""} placeholder="Add a caption (optional)" label="Image caption"
        onChange={(caption) => set({ caption })} onEnter={() => api.newAfter({ type: "text", text: "" }, "start")} />
    </figure>
  );
}

function DividerBlock() {
  return <hr className="lw-hr" />;
}

export const WRITER_BLOCKS = {
  heading: HeadingBlock,
  text: TextBlock,
  quote: QuoteBlock,
  callout: CalloutBlock,
  list: ListBlock,
  steps: StepsBlock,
  compare: CompareBlock,
  flip: FlipBlock,
  checkpoint: CheckpointBlock,
  figure: FigureBlock,
  divider: DividerBlock,
};
