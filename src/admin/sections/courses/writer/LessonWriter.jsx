// Full-screen lesson writer: blocks on the left, a page that edits like a word processor in the
// middle, and the lesson as students see it (story or article) on the right, updated as you type.
// Lessons are still stored as the same blocks (and the same Markdown dialect in "Markdown" mode),
// so everything written here also works in the classic editor, import/export and the player.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { uid, estimateReadMinutes } from "../courseModel.js";
import { blocksToMarkdown, parseBody } from "../courseMarkdown.js";
import BlockEditor from "../BlockEditor.jsx";
import { placeCaret } from "./RichText.jsx";
import RichText from "./RichText.jsx";
import { WRITER_BLOCKS } from "./WriterBlocks.jsx";
import { PALETTE, searchPalette, paletteItem, paletteIdOf, convertBlock, TEXT_LIKE, TURN_INTO } from "./palette.js";
import "./writer.css";

const PREVIEW_URL = "/academy/lesson-preview/";
const MSG = "lashtribe-lesson-preview";
const IMAGE_RE = /^image\/(jpeg|png|webp|gif|avif)$/;
const SHORTCUTS = [
  [/^#{1,3}\s(.*)$/, "heading"],
  [/^[-*•]\s(.*)$/, "bullets"],
  [/^1[.)]\s(.*)$/, "numbered"],
  [/^\[\s?\]\s(.*)$/, "checklist"],
  [/^>\s(.*)$/, "quote"],
];

const clone = (x) => JSON.parse(JSON.stringify(x));
const fresh = (blocks) => blocks.map(() => uid());

// ---------------------------------------------------------------------
// small menus
// ---------------------------------------------------------------------
function BlockPicker({ items, active, onPick, title }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.querySelector(".on")?.scrollIntoView({ block: "nearest" }); }, [active]);
  return (
    <div className="lw-menu" ref={ref} role="listbox" aria-label={title} contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
      {title && <div className="lw-menu-title">{title}</div>}
      {items.length === 0 && <div className="lw-menu-empty">No block called that</div>}
      {items.map((it, i) => (
        <button type="button" key={it.id} role="option" aria-selected={i === active} className={i === active ? "on" : ""} onClick={() => onPick(it)}>
          <i aria-hidden>{it.icon}</i><span><b>{it.label}</b><small>{it.desc}</small></span>
        </button>
      ))}
    </div>
  );
}

function BlockActions({ b, first, last, onTurn, onMove, onDuplicate, onDelete, onClose }) {
  useEffect(() => {
    const off = (e) => { if (!e.target.closest(".lw-actions")) onClose(); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [onClose]);
  return (
    <div className="lw-menu lw-actions" contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
      {TEXT_LIKE.includes(b.type) && (
        <>
          <div className="lw-menu-title">Turn into</div>
          <div className="lw-turn">
            {TURN_INTO.map((id) => {
              const it = paletteItem(id);
              return (
                <button type="button" key={id} className={paletteIdOf(b) === id ? "on" : ""} onClick={() => onTurn(id)} title={it.label}>
                  <i aria-hidden>{it.icon}</i>{it.label}
                </button>
              );
            })}
          </div>
          <hr />
        </>
      )}
      <button type="button" onClick={() => onMove(-1)} disabled={first}>↑ Move up</button>
      <button type="button" onClick={() => onMove(1)} disabled={last}>↓ Move down</button>
      <button type="button" onClick={onDuplicate}>⧉ Duplicate</button>
      <button type="button" className="danger" onClick={onDelete}>✕ Delete</button>
    </div>
  );
}

// ---------------------------------------------------------------------
// live preview (the real story and article views, in an iframe)
// ---------------------------------------------------------------------
function LivePreview({ lesson, blocks, focusIndex, view, setView }) {
  const frame = useRef(null);
  const [ready, setReady] = useState(0); // bumps each time the preview page (re)loads
  const reading = lesson.kind === "reading";
  const shown = reading ? view : "article";

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === `${MSG}:ready`) setReady((n) => n + 1);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({
        type: MSG,
        view: shown,
        notes: lesson.kind === "video",
        focus: focusIndex,
        lesson: { title: lesson.title || "Untitled lesson", summary: lesson.summary || "", minutes: lesson.read_minutes || 3, blocks },
      }, window.location.origin);
    }, 180);
    return () => clearTimeout(t);
  }, [ready, shown, focusIndex, blocks, lesson.title, lesson.summary, lesson.read_minutes, lesson.kind]);

  return (
    <div className="lw-preview">
      <div className="lw-preview-bar">
        <b>Live preview</b>
        {reading ? (
          <div className="cs-seg" role="group" aria-label="Preview view">
            <button type="button" className={view === "story" ? "on" : ""} onClick={() => setView("story")}>Story</button>
            <button type="button" className={view === "article" ? "on" : ""} onClick={() => setView("article")}>Article</button>
          </div>
        ) : <span className="form-hint">Lesson notes</span>}
      </div>
      <div className={"lw-preview-stage " + shown}>
        {lesson.kind === "assessment"
          ? <p className="cs-empty">Quizzes are shown in the full course preview.</p>
          : <iframe ref={frame} title="Lesson preview" src={PREVIEW_URL} />}
      </div>
      <p className="lw-preview-hint">Follows the block you are editing. Tap through it like a student would.</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// the writer
// ---------------------------------------------------------------------
export default function LessonWriter({
  course, lessonId, onSelect, onPatchLesson, onPatchModule, onAddLesson, onAddModule,
  onSave, saving, dirty, onPreviewCourse, onClose,
}) {
  // ----- where we are in the course -----
  const flat = useMemo(() => course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ m, mi, l, li }))), [course.modules]);
  const at = flat.findIndex((x) => x.l.id === lessonId);
  const here = flat[at] || null;
  const lesson = here?.l || null;
  const mod = here?.m || null;

  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;
  const patchRef = useRef(onPatchLesson);
  patchRef.current = onPatchLesson;

  const blocks = lesson?.blocks || [];
  const keysRef = useRef([]);
  if (keysRef.current.length !== blocks.length) keysRef.current = blocks.map((_, i) => keysRef.current[i] || uid());
  const keys = keysRef.current;

  const docRef = useRef(null);
  const wrapRefs = useRef(new Map());
  const pending = useRef(null); // { key, where, field }
  const hist = useRef({ id: null, past: [], future: [], last: 0 });

  const [focusKey, setFocusKey] = useState(null);
  const [slash, setSlash] = useState(null); // { key, query, active, insert? }
  const [actionsFor, setActionsFor] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const [mode, setMode] = useState("visual"); // visual | markdown
  const [mdText, setMdText] = useState("");
  const [mdWarn, setMdWarn] = useState([]);
  const [view, setView] = useState("story");
  const [leftTab, setLeftTab] = useState("blocks");
  const [pane, setPane] = useState("write"); // phones: blocks | write | preview
  const [toast, setToast] = useState("");
  const [, force] = useState(0);

  if (hist.current.id !== lessonId) hist.current = { id: lessonId, past: [], future: [], last: 0 };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ----- committing changes -----
  const commit = useCallback((nextBlocks, nextKeys, { coalesce = false } = {}) => {
    const cur = lessonRef.current;
    if (!cur) return;
    const h = hist.current;
    const now = Date.now();
    if (!coalesce || now - h.last > 800) {
      h.past.push({ blocks: clone(cur.blocks || []), keys: keysRef.current.slice() });
      if (h.past.length > 120) h.past.shift();
    }
    h.last = coalesce ? now : 0;
    h.future = [];
    keysRef.current = nextKeys;
    const next = { ...cur, blocks: nextBlocks };
    lessonRef.current = next;
    patchRef.current(next);
  }, []);

  const setLessonField = (patch) => {
    const next = { ...lessonRef.current, ...patch };
    lessonRef.current = next;
    patchRef.current(next);
  };

  const undo = (dir = -1) => {
    const h = hist.current;
    const from = dir < 0 ? h.past : h.future;
    const to = dir < 0 ? h.future : h.past;
    const snap = from.pop();
    if (!snap) return;
    to.push({ blocks: clone(lessonRef.current.blocks || []), keys: keysRef.current.slice() });
    keysRef.current = snap.keys;
    const next = { ...lessonRef.current, blocks: snap.blocks };
    lessonRef.current = next;
    patchRef.current(next);
    h.last = 0;
    force((n) => n + 1);
  };

  const cur = () => ({ blocks: lessonRef.current?.blocks || [], keys: keysRef.current });
  const idxOf = (key) => keysRef.current.indexOf(key);

  const patchKey = (key, p, opts) => {
    const { blocks: bs, keys: ks } = cur();
    const i = ks.indexOf(key);
    if (i < 0) return;
    commit(bs.map((b, k) => (k === i ? { ...b, ...p } : b)), ks, opts);
  };

  const insertBlocks = (index, newBlocks, focus = "start") => {
    const { blocks: bs, keys: ks } = cur();
    const nk = newBlocks.map(() => uid());
    commit([...bs.slice(0, index), ...newBlocks, ...bs.slice(index)], [...ks.slice(0, index), ...nk, ...ks.slice(index)]);
    if (focus) pending.current = { key: focus === "last-end" ? nk[nk.length - 1] : nk[0], where: focus === "last-end" ? "end" : focus };
    return nk;
  };

  const replaceKey = (key, newBlocks, focus = "start") => {
    const { blocks: bs, keys: ks } = cur();
    const i = ks.indexOf(key);
    if (i < 0) return;
    const nk = newBlocks.map(() => uid());
    commit([...bs.slice(0, i), ...newBlocks, ...bs.slice(i + 1)], [...ks.slice(0, i), ...nk, ...ks.slice(i + 1)]);
    if (focus && nk.length) pending.current = { key: focus === "last-end" ? nk[nk.length - 1] : nk[0], where: focus === "last-end" ? "end" : focus };
  };

  const removeKey = (key, focusPrev = true) => {
    const { blocks: bs, keys: ks } = cur();
    const i = ks.indexOf(key);
    if (i < 0) return;
    commit(bs.filter((_, k) => k !== i), ks.filter((_, k) => k !== i));
    const target = ks[i - 1] || ks[i + 1];
    if (target) pending.current = { key: target, where: focusPrev && ks[i - 1] ? "end" : "start" };
  };

  const moveKey = (key, d) => {
    const { blocks: bs, keys: ks } = cur();
    const i = ks.indexOf(key);
    const j = i + d;
    if (i < 0 || j < 0 || j >= bs.length) return;
    const nb = bs.slice(); const nk = ks.slice();
    [nb[i], nb[j]] = [nb[j], nb[i]];
    [nk[i], nk[j]] = [nk[j], nk[i]];
    commit(nb, nk);
  };

  const moveKeyTo = (key, to) => {
    const { blocks: bs, keys: ks } = cur();
    const i = ks.indexOf(key);
    if (i < 0 || to === i || to === i + 1) return;
    const nb = bs.slice(); const nk = ks.slice();
    const [b] = nb.splice(i, 1); const [k] = nk.splice(i, 1);
    const dest = to > i ? to - 1 : to;
    nb.splice(dest, 0, b); nk.splice(dest, 0, k);
    commit(nb, nk);
  };

  // put the caret where an operation asked for it, once the new block has rendered
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p) return;
    const wrap = wrapRefs.current.get(p.key);
    if (!wrap) return;
    pending.current = null;
    const fields = wrap.querySelectorAll("[contenteditable='true']");
    const field = typeof p.field === "number" ? fields[p.field]
      : p.where === "end" ? fields[fields.length - 1]
      : p.where === "start" ? wrap.querySelector("[data-primary]") || fields[0]
      : fields[0];
    if (field) placeCaret(field, p.where ?? "end");
    else wrap.scrollIntoView({ block: "nearest" });
    setFocusKey(p.key);
  });

  // ----- inserting from the palette -----
  const insertIndex = () => {
    if (dropAt != null) return dropAt;
    const i = idxOf(focusKey);
    return i < 0 ? blocks.length : i + 1;
  };

  const addFromPalette = (id, index) => {
    const it = paletteItem(id);
    if (!it) return;
    const { blocks: bs, keys: ks } = cur();
    const fi = ks.indexOf(focusKey);
    // an empty paragraph you are sitting on becomes the new block, like in a word processor
    if (index == null && fi >= 0 && bs[fi]?.type === "text" && !String(bs[fi].text || "").trim()) {
      replaceKey(ks[fi], [it.make()], "start");
    } else {
      insertBlocks(index ?? insertIndex(), [it.make()], "start");
    }
    setPane("write");
  };

  const addImages = (files, index) => {
    const imgs = [...files].filter((f) => IMAGE_RE.test(f.type));
    if (!imgs.length) { setToast("Only JPG, PNG, WebP or GIF pictures can be added."); return; }
    insertBlocks(index ?? insertIndex(), imgs.map((f) => ({ type: "figure", url: "", caption: "", _file: f })), null);
  };

  // ----- per-block api for the block components -----
  const apiFor = (key) => ({
    courseId: course.id,
    newAfter: (block, where = "start") => insertBlocks(idxOf(key) + 1, [block], where),
    replaceSelf: (bs, where) => replaceKey(key, bs, where),
    remove: () => removeKey(key),
    focusField: (n) => {
      const f = wrapRefs.current.get(key)?.querySelectorAll("[contenteditable='true']")[n];
      if (f) placeCaret(f, "end");
    },
    typed: (text) => {
      for (const [re, id] of SHORTCUTS) {
        const m = text.match(re);
        if (m) { replaceKey(key, [convertBlock({ type: "text", text: m[1] }, id)], "end"); setSlash(null); return; }
      }
      const sm = text.match(/^\/([a-z' /]{0,24})$/i);
      if (sm) setSlash((s) => ({ key, query: sm[1], active: s?.key === key && s.query === sm[1] ? s.active : 0 }));
      else if (slash?.key === key) setSlash(null);
      patchKey(key, { text }, { coalesce: true });
    },
    backspaceStart: ({ empty }) => {
      const { blocks: bs, keys: ks } = cur();
      const i = ks.indexOf(key);
      const b = bs[i];
      const prev = bs[i - 1];
      if (b.type !== "text" && TEXT_LIKE.includes(b.type)) {
        // Backspace at the start of a heading, quote or callout turns it back into a paragraph
        replaceKey(key, [convertBlock(b, "text")], "start");
        return;
      }
      if (empty) {
        if (bs.length > 1) removeKey(key);
        return;
      }
      if (prev && (prev.type === "text" || prev.type === "heading")) {
        const prevField = wrapRefs.current.get(ks[i - 1])?.querySelector("[contenteditable='true']");
        const offset = prevField ? prevField.textContent.length : 0;
        const joined = prev.text ? `${prev.text}${/\s$/.test(prev.text) ? "" : " "}${b.text}` : b.text;
        commit(bs.map((x, k) => (k === i - 1 ? { ...x, text: joined } : x)).filter((_, k) => k !== i), ks.filter((_, k) => k !== i));
        pending.current = { key: ks[i - 1], where: offset + (prev.text ? 1 : 0) };
        return;
      }
      if (prev) { pending.current = { key: ks[i - 1], where: "end" }; force((n) => n + 1); }
    },
    pasteText: (text) => {
      const r = parseBody(text);
      if (!r.blocks.length) return false;
      const { blocks: bs, keys: ks } = cur();
      const i = ks.indexOf(key);
      const b = bs[i];
      if (b && b.type === "text" && !String(b.text || "").trim()) replaceKey(key, r.blocks, "last-end");
      else insertBlocks(i + 1, r.blocks, "last-end");
      setToast(`Pasted ${r.blocks.length} block${r.blocks.length === 1 ? "" : "s"}${r.warnings.length ? ` · ${r.warnings[0]}` : ""}`);
      return true;
    },
  });

  // ----- slash menu -----
  const slashItems = slash ? searchPalette(slash.query) : [];
  const pickSlash = (it) => {
    const s = slash;
    setSlash(null);
    if (!s) return;
    if (s.insert) insertBlocks(idxOf(s.key) + 1, [it.make()], "start");
    else replaceKey(s.key, [it.make()], "start");
  };
  const slashKeys = (key) => (e) => {
    if (!slash || slash.key !== key) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      const n = slashItems.length || 1;
      setSlash((s) => ({ ...s, active: (s.active + (e.key === "ArrowDown" ? 1 : n - 1)) % n }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (!slashItems.length) return;
      e.preventDefault(); e.stopPropagation();
      pickSlash(slashItems[slash.active] || slashItems[0]);
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      setSlash(null);
    }
  };

  // ----- drag and drop (palette blocks, reordering, image files) -----
  const indexFromPointer = (y) => {
    const ks = keysRef.current;
    for (let i = 0; i < ks.length; i++) {
      const el = wrapRefs.current.get(ks[i]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return ks.length;
  };
  const dragKinds = (e) => {
    const t = [...(e.dataTransfer?.types || [])];
    return { block: t.includes("application/x-lw-block"), move: t.includes("application/x-lw-move"), files: t.includes("Files") };
  };
  const onDocDragOver = (e) => {
    const k = dragKinds(e);
    if (!k.block && !k.move && !k.files) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = k.move ? "move" : "copy";
    const i = indexFromPointer(e.clientY);
    if (i !== dropAt) setDropAt(i);
  };
  const onDocDrop = (e) => {
    const k = dragKinds(e);
    const i = dropAt ?? indexFromPointer(e.clientY);
    setDropAt(null);
    if (k.block) { e.preventDefault(); addFromPalette(e.dataTransfer.getData("application/x-lw-block"), i); }
    else if (k.move) { e.preventDefault(); moveKeyTo(e.dataTransfer.getData("application/x-lw-move"), i); }
    else if (k.files && e.dataTransfer.files?.length) { e.preventDefault(); addImages(e.dataTransfer.files, i); }
  };
  const onDocPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => IMAGE_RE.test(f.type));
    if (!files.length || e.clipboardData.getData("text/plain")) return;
    e.preventDefault();
    addImages(files);
  };

  // ----- toolbar -----
  const focused = blocks[idxOf(focusKey)];
  const fmt = (cmd) => (e) => { e.preventDefault(); document.execCommand(cmd); };
  const turnFocused = (id) => {
    if (!focused || !TEXT_LIKE.includes(focused.type)) { addFromPalette(id); return; }
    replaceKey(focusKey, [convertBlock(focused, id)], "end");
  };

  // ----- markdown mode -----
  const toMarkdown = () => { setMdText(blocksToMarkdown(blocks)); setMdWarn([]); setMode("markdown"); setSlash(null); };
  const onMarkdown = (text) => {
    setMdText(text);
    const r = parseBody(text);
    setMdWarn(r.warnings);
    commit(r.blocks, fresh(r.blocks), { coalesce: true });
  };

  // ----- lessons and modules -----
  const prev = flat[at - 1];
  const next = flat[at + 1];
  const lessonKind = lesson && lesson.kind !== "assessment" ? lesson.kind : course.course_type === "video" ? "video" : "reading";
  const go = (id) => { setSlash(null); setActionsFor(null); setMode("visual"); onSelect(id); };
  const newLessonHere = () => { const id = onAddLesson(mod.id, lessonKind); if (id) go(id); pending.current = null; };
  const newModule = () => {
    const r = onAddModule(mod?.id);
    if (r?.lessonId) {
      go(r.lessonId);
      setToast(`Created ${r.title}. Give it a name, then write its first lesson.`);
      setTimeout(() => document.querySelector(".lw-module-title")?.focus(), 60);
    }
  };

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) { if (e.key === "Escape" && !slash && !actionsFor && !document.querySelector(".admin-modal-backdrop")) onClose(); return; }
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); onSave(); }
      else if (k === "z" && mode === "visual" && e.target.closest?.("[data-writer-doc]")) { e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
      else if (k === "y" && mode === "visual" && e.target.closest?.("[data-writer-doc]")) { e.preventDefault(); undo(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    document.body.classList.add("lw-lock");
    return () => document.body.classList.remove("lw-lock");
  }, []);

  if (!lesson) {
    return (
      <div className="lw-root">
        <div className="lw-top"><button type="button" className="admin-btn secondary" onClick={onClose}>✕ Close</button></div>
        <p className="cs-empty">This lesson no longer exists.</p>
      </div>
    );
  }

  const focusIndex = mode === "visual" ? idxOf(focusKey) : -1;
  const isQuiz = lesson.kind === "assessment";
  const suggested = estimateReadMinutes(blocks);
  const posInModule = `${here.li + 1} of ${mod.lessons.length}`;

  return (
    <div className={"lw-root pane-" + pane} role="dialog" aria-label="Lesson writer">
      {/* ---------------- top bar ---------------- */}
      <header className="lw-top">
        <button type="button" className="admin-btn secondary" onClick={onClose} title="Back to the course editor (Esc)">✕ Close</button>
        <div className="lw-where">
          <small>{course.title || "Untitled course"} · Module {here.mi + 1}</small>
          <b>Lesson {posInModule}{lesson.title ? `: ${lesson.title}` : ""}</b>
        </div>
        <div className="lw-nav">
          <button type="button" className="admin-btn secondary" disabled={!prev} onClick={() => go(prev.l.id)}>‹ Previous</button>
          {next
            ? <button type="button" className="admin-btn secondary" onClick={() => go(next.l.id)}>Next lesson ›</button>
            : <button type="button" className="admin-btn secondary" onClick={newLessonHere}>+ Next lesson</button>}
          {next && <button type="button" className="admin-btn secondary" onClick={newLessonHere} title={`Add a lesson at the end of module ${here.mi + 1}`}>+ New lesson</button>}
          <button type="button" className="admin-btn secondary lw-next-module" onClick={newModule}>+ Create next module</button>
        </div>
        <div className="lw-top-end">
          {dirty && <span className="cs-dirty">Unsaved</span>}
          <button type="button" className="admin-btn secondary" onClick={onPreviewCourse}>Full preview</button>
          <button type="button" className="admin-btn" disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </header>

      {/* ---------------- left: blocks / outline ---------------- */}
      <aside className="lw-left">
        <div className="cs-seg lw-left-tabs" role="tablist">
          <button type="button" className={leftTab === "blocks" ? "on" : ""} onClick={() => setLeftTab("blocks")}>Blocks</button>
          <button type="button" className={leftTab === "outline" ? "on" : ""} onClick={() => setLeftTab("outline")}>Course outline</button>
        </div>
        {leftTab === "blocks" ? (
          <div className="lw-palette">
            {isQuiz && <p className="form-hint">Quiz lessons only hold questions. Use the editor in the middle.</p>}
            {!isQuiz && mode === "markdown" && <p className="form-hint">Switch back to Write to add blocks.</p>}
            {!isQuiz && mode === "visual" && (
              <>
                <p className="lw-palette-hint">Click a block to add it under the one you are editing, or drag it onto the page. In the page, type <kbd>/</kbd> for the same list.</p>
                {PALETTE.map((g) => (
                  <section key={g.group}>
                    <h5>{g.group}</h5>
                    <div className="lw-tiles">
                      {g.items.map((it) => (
                        <button type="button" key={it.id} className="lw-tile" draggable
                          onDragStart={(e) => { e.dataTransfer.setData("application/x-lw-block", it.id); e.dataTransfer.effectAllowed = "copy"; }}
                          onDragEnd={() => setDropAt(null)}
                          onClick={() => addFromPalette(it.id)} title={it.desc}>
                          <i aria-hidden>{it.icon}</i><b>{it.label}</b><small>{it.desc}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="lw-outline">
            {course.modules.map((m, mi) => (
              <div key={m.id} className={"lw-out-mod" + (m.id === mod.id ? " on" : "")}>
                <div className="lw-out-head">Module {mi + 1}: {m.title || "Untitled module"}</div>
                <ul>
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <button type="button" className={l.id === lessonId ? "on" : ""} onClick={() => go(l.id)}>
                        <i aria-hidden>{l.kind === "video" ? "▶" : l.kind === "assessment" ? "?" : "▤"}</i>{l.title || "Untitled lesson"}
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="cs-chip" onClick={() => { const id = onAddLesson(m.id, lessonKind); if (id) go(id); }}>+ Lesson</button>
              </div>
            ))}
            <button type="button" className="admin-btn secondary" onClick={newModule}>+ Create next module</button>
          </div>
        )}
      </aside>

      {/* ---------------- center: the page ---------------- */}
      <main className="lw-center">
        {!isQuiz && (
          <div className="lw-toolbar" onMouseDown={(e) => { if (e.target.closest("button")) e.preventDefault(); }}>
            <div className="cs-seg" role="group" aria-label="Editing mode">
              <button type="button" className={mode === "visual" ? "on" : ""} onClick={() => setMode("visual")}>Write</button>
              <button type="button" className={mode === "markdown" ? "on" : ""} onClick={toMarkdown}>Markdown</button>
            </div>
            {mode === "visual" && (
              <>
                <select className="lw-style" aria-label="Paragraph style" value={focused && TEXT_LIKE.includes(focused.type) ? paletteIdOf(focused) : ""}
                  onChange={(e) => e.target.value && turnFocused(e.target.value)}>
                  <option value="">{focused ? (paletteItem(paletteIdOf(focused))?.label || "Block") : "Style"}</option>
                  {TURN_INTO.map((id) => <option key={id} value={id}>{paletteItem(id).label}</option>)}
                </select>
                <button type="button" className="lw-tb b" onMouseDown={fmt("bold")} title="Bold (Ctrl+B)">B</button>
                <button type="button" className="lw-tb i" onMouseDown={fmt("italic")} title="Italic (Ctrl+I)">I</button>
                <span className="lw-tb-sep" />
                <button type="button" className="lw-tb" onClick={() => addFromPalette("figure")} title="Add an image">▣ Image</button>
                <button type="button" className="lw-tb" onClick={() => addFromPalette("flip")} title="Add a flip card">↻ Flip card</button>
                <button type="button" className="lw-tb" onClick={() => addFromPalette("checkpoint")} title="Add a quick check">? Quick check</button>
                <span className="lw-tb-sep" />
                <button type="button" className="lw-tb" onClick={() => undo(-1)} disabled={!hist.current.past.length} title="Undo (Ctrl+Z)">↶</button>
                <button type="button" className="lw-tb" onClick={() => undo(1)} disabled={!hist.current.future.length} title="Redo (Ctrl+Shift+Z)">↷</button>
              </>
            )}
          </div>
        )}

        <div className="lw-scroll">
          <article className="lw-page">
            <div className="lw-page-head">
              <label className="lw-eyebrow">
                <span>Module {here.mi + 1}</span>
                <input className="lw-module-title" type="text" value={mod.title} placeholder="Name this module"
                  onChange={(e) => onPatchModule(mod.id, { title: e.target.value })} />
              </label>
              <RichText plain className="lw-title" value={lesson.title} placeholder="Lesson title" label="Lesson title"
                onChange={(title) => setLessonField({ title })}
                onEnter={() => document.querySelector(".lw-summary")?.focus()} />
              <RichText plain className="lw-summary" value={lesson.summary || ""} placeholder="One line about this lesson (shown under the title)" label="Lesson summary"
                onChange={(summary) => setLessonField({ summary })}
                onEnter={() => { const k = keysRef.current[0]; if (k) { pending.current = { key: k, where: "start" }; force((n) => n + 1); } }} />
              <div className="lw-meta">
                <span className="lw-kind">{lesson.kind === "video" ? "▶ Video lesson · notes" : lesson.kind === "assessment" ? "? Quiz lesson" : "▤ Story lesson"}</span>
                {lesson.kind === "reading" && (
                  <label>
                    <input type="number" min={1} value={lesson.read_minutes || ""} onChange={(e) => setLessonField({ read_minutes: Number(e.target.value) || 0 })} /> min read
                    {blocks.length > 0 && suggested !== lesson.read_minutes && (
                      <button type="button" className="lw-link" onClick={() => setLessonField({ read_minutes: suggested })}>use {suggested}</button>
                    )}
                  </label>
                )}
              </div>
              {lesson.kind === "video" && (
                <p className="lw-note">The video itself is set in the course editor. What you write here shows as notes under the video.</p>
              )}
            </div>

            {isQuiz ? (
              <BlockEditor key={lesson.id} mode="quiz" blocks={blocks} courseId={course.id} onChange={(bs) => commit(bs, fresh(bs))} />
            ) : mode === "markdown" ? (
              <div className="lw-md">
                <textarea value={mdText} spellCheck onChange={(e) => onMarkdown(e.target.value)} />
                <p className="form-hint">## chapter · paragraph · - list · &gt; Tip: … · ?? question with - options and * on the right one · steps: · flip[Prompt|Front|Back]: front || back · ![caption](url)</p>
                {mdWarn.length > 0 && <ul className="cs-warn">{mdWarn.map((w, i) => <li key={i}>{w}</li>)}</ul>}
              </div>
            ) : (
              <div className="lw-doc" data-writer-doc ref={docRef}
                onDragOver={onDocDragOver} onDrop={onDocDrop}
                onDragLeave={(e) => { if (!docRef.current.contains(e.relatedTarget)) setDropAt(null); }}
                onPaste={onDocPaste}>
                {blocks.length === 0 && (
                  <div className="lw-empty">
                    <p>This lesson is empty.</p>
                    <div className="cs-row">
                      <button type="button" className="admin-btn" onClick={() => insertBlocks(0, [{ type: "text", text: "" }], "start")}>Start writing</button>
                      <button type="button" className="admin-btn secondary" onClick={() => insertBlocks(0, [{ type: "heading", text: "" }], "start")}>Start with a chapter heading</button>
                    </div>
                    <p className="form-hint">You can also paste a whole lesson written in the course Markdown format into a paragraph, and it turns into blocks.</p>
                  </div>
                )}
                {blocks.map((b, i) => {
                  const key = keys[i];
                  const Comp = WRITER_BLOCKS[b.type];
                  const api = apiFor(key);
                  return (
                    <div key={key}
                      ref={(el) => (el ? wrapRefs.current.set(key, el) : wrapRefs.current.delete(key))}
                      className={"lw-block t-" + b.type + (focusKey === key ? " on" : "") + (dropAt === i ? " drop-before" : "") + (dropAt === blocks.length && i === blocks.length - 1 ? " drop-after" : "")}
                      onFocusCapture={() => focusKey !== key && setFocusKey(key)}
                      onMouseDown={() => focusKey !== key && setFocusKey(key)}
                      onKeyDownCapture={slashKeys(key)}>
                      <div className="lw-gutter" contentEditable={false}>
                        <button type="button" className="lw-g-add" title="Add a block below" onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSlash({ key, query: "", active: 0, insert: true })}>+</button>
                        <button type="button" className="lw-g-grip" title="Drag to move · click for options" draggable
                          onDragStart={(e) => { e.dataTransfer.setData("application/x-lw-move", key); e.dataTransfer.effectAllowed = "move"; }}
                          onDragEnd={() => setDropAt(null)}
                          onClick={() => setActionsFor((k) => (k === key ? null : key))}>⋮⋮</button>
                      </div>
                      {Comp
                        ? <Comp b={b} set={(p) => patchKey(key, p, { coalesce: true })} api={api} />
                        : <p className="lw-note">This block ({b.type}) can only be edited in the classic editor. It is kept as it is.</p>}
                      {actionsFor === key && (
                        <BlockActions b={b} first={i === 0} last={i === blocks.length - 1}
                          onClose={() => setActionsFor(null)}
                          onTurn={(id) => { setActionsFor(null); replaceKey(key, [convertBlock(b, id)], "end"); }}
                          onMove={(d) => moveKey(key, d)}
                          onDuplicate={() => { setActionsFor(null); insertBlocks(i + 1, [clone(b)], "end"); }}
                          onDelete={() => { setActionsFor(null); removeKey(key); }} />
                      )}
                      {slash?.key === key && (
                        <BlockPicker items={slashItems} active={slash.active} onPick={pickSlash}
                          title={slash.insert ? "Add a block below" : slash.query ? `Blocks matching “${slash.query}”` : "Turn this line into"} />
                      )}
                    </div>
                  );
                })}
                {blocks.length > 0 && (
                  <div className="lw-tail" onClick={() => {
                    const last = blocks[blocks.length - 1];
                    if (last.type === "text" && !String(last.text || "").trim()) { pending.current = { key: keys[keys.length - 1], where: "end" }; force((n) => n + 1); }
                    else insertBlocks(blocks.length, [{ type: "text", text: "" }], "start");
                  }}>Click to keep writing</div>
                )}
              </div>
            )}
          </article>
        </div>
      </main>

      {/* ---------------- right: preview ---------------- */}
      <aside className="lw-right">
        <LivePreview lesson={lesson} blocks={blocks} focusIndex={focusIndex} view={view} setView={setView} />
      </aside>

      {/* phones: one pane at a time */}
      <nav className="lw-panes" aria-label="Writer panes">
        {[["blocks", "Blocks"], ["write", "Write"], ["preview", "Preview"]].map(([k, label]) => (
          <button type="button" key={k} className={pane === k ? "on" : ""} onClick={() => setPane(k)}>{label}</button>
        ))}
      </nav>

      {toast && <div className="lw-toast" role="status">{toast}</div>}
    </div>
  );
}
