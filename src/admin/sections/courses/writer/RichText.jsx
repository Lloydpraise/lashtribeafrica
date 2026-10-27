// A one-line rich text field for the lesson writer. It edits the same inline markup the student
// player renders (**bold** and *italic*, see inline() in components/learn/util.js), but shows the
// formatting instead of the stars. Lesson text never holds line breaks, so Enter is handed to the
// parent (new paragraph, next list item) instead of breaking the line.
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "**a** and *b*" -> "<strong>a</strong> and <em>b</em>" (everything else escaped). */
export function mdToHtml(md = "") {
  return String(md)
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((p) => {
      if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) return `<strong>${esc(p.slice(2, -2))}</strong>`;
      if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return `<em>${esc(p.slice(1, -1))}</em>`;
      return esc(p);
    })
    .join("");
}

const flat = (s) => String(s || "").replace(/ /g, " ").replace(/\s*\n\s*/g, " ");

/** The DOM of an edited field -> inline markup. Nested formatting is flattened to one level. */
export function nodeToMd(node) {
  let out = "";
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out += flat(n.nodeValue).replace(/\*/g, "∗"); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === "BR") { out += " "; return; }
    const bold = tag === "B" || tag === "STRONG" || /bold|[6-9]00/.test(n.style?.fontWeight || "");
    const ital = tag === "I" || tag === "EM" || n.style?.fontStyle === "italic";
    if (bold || ital) {
      const inner = flat(n.textContent).replace(/\*/g, "∗");
      if (!inner.trim()) { out += inner; return; }
      // keep spaces outside the markers so "**word **" never happens
      const lead = inner.match(/^\s*/)[0];
      const trail = inner.match(/\s*$/)[0];
      const mark = bold ? "**" : "*";
      out += `${lead}${mark}${inner.trim()}${mark}${trail}`;
      return;
    }
    out += nodeToMd(n) + (tag === "DIV" || tag === "P" ? " " : "");
  });
  return out;
}

const read = (el, plain) => (plain ? flat(el.textContent) : nodeToMd(el)).replace(/ {2,}/g, " ");

/** Where the caret sits inside `el`: at the start, at the end, on the first or last visual line. */
export function caretInfo(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!el.contains(r.startContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  const post = document.createRange();
  post.selectNodeContents(el);
  post.setStart(r.endContainer, r.endOffset);
  const atStart = r.collapsed && pre.toString().length === 0;
  const atEnd = r.collapsed && post.toString().length === 0;
  const box = el.getBoundingClientRect();
  const rect = r.getClientRects()[0];
  const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return {
    atStart,
    atEnd,
    offset: pre.toString().length,
    firstLine: atStart || !rect || rect.top - box.top < line * 0.9,
    lastLine: atEnd || !rect || box.bottom - rect.bottom < line * 0.9,
  };
}

/** Puts the caret at "start", "end" or a character offset inside a contentEditable element. */
export function placeCaret(el, where = "end") {
  if (!el) return;
  el.focus({ preventScroll: true });
  const sel = window.getSelection();
  const r = document.createRange();
  if (typeof where === "number") {
    let left = where;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let placed = false;
    while (node) {
      if (node.nodeValue.length >= left) { r.setStart(node, left); placed = true; break; }
      left -= node.nodeValue.length;
      node = walker.nextNode();
    }
    if (!placed) { r.selectNodeContents(el); r.collapse(false); } else r.collapse(true);
  } else {
    r.selectNodeContents(el);
    r.collapse(where === "start");
  }
  sel.removeAllRanges();
  sel.addRange(r);
  el.scrollIntoView?.({ block: "nearest" });
}

/** Moves to the previous/next editable field in the same document (arrow keys across blocks). */
function hop(el, dir) {
  const doc = el.closest("[data-writer-doc]");
  if (!doc) return false;
  const all = [...doc.querySelectorAll("[contenteditable='true']")];
  const target = all[all.indexOf(el) + dir];
  if (!target) return false;
  placeCaret(target, dir < 0 ? "end" : "start");
  return true;
}

/**
 * props
 *   value, onChange(md)      inline markup string
 *   plain                    no bold/italic (titles, labels, options)
 *   onEnter({ split })       Enter pressed; split() cuts the text at the caret and returns { head, tail }
 *   onBackspaceStart({ empty })  Backspace with the caret at the very start
 *   onPasteText(text)        pasted text with line breaks; return true when handled
 *   primary                  the field a new block of this kind starts typing in
 */
const RichText = forwardRef(function RichText(
  { value = "", onChange, plain = false, placeholder = "", className = "", onEnter, onBackspaceStart, onPasteText, onFocus, onKeyDown, label, primary = false },
  ref
) {
  const el = useRef(null);
  const emitted = useRef(null);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node || value === emitted.current) return;
    if (read(node, plain) === value) { emitted.current = value; return; }
    node.innerHTML = plain ? esc(value) : mdToHtml(value);
    emitted.current = value;
  }, [value, plain]);

  const emit = () => {
    const md = read(el.current, plain);
    // an emptied field keeps a stray <br> in some browsers, which hides the placeholder
    if (!md.trim() && el.current.innerHTML !== "") el.current.innerHTML = "";
    emitted.current = md;
    onChange?.(md);
  };

  const split = () => {
    const node = el.current;
    const sel = window.getSelection();
    if (!sel.rangeCount) return { head: read(node, plain), tail: "" };
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const tailRange = document.createRange();
    tailRange.selectNodeContents(node);
    tailRange.setStart(r.endContainer, r.endOffset);
    const box = document.createElement("div");
    box.appendChild(tailRange.extractContents());
    const head = read(node, plain).replace(/\s+$/, "");
    const tail = read(box, plain).replace(/^\s+/, "");
    emitted.current = head;
    return { head, tail };
  };

  useImperativeHandle(ref, () => ({ el: el.current, focus: (where) => placeCaret(el.current, where), split }), []);

  const keyDown = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && /^[biu]$/i.test(e.key)) {
      e.preventDefault();
      if (!plain && e.key.toLowerCase() !== "u") document.execCommand(e.key.toLowerCase() === "b" ? "bold" : "italic");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      onEnter?.({ split });
      return;
    }
    if (e.key === "Backspace" && onBackspaceStart) {
      const c = caretInfo(el.current);
      if (c?.atStart) {
        e.preventDefault();
        onBackspaceStart({ empty: !el.current.textContent.trim() });
      }
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const c = caretInfo(el.current);
      if (c && (e.key === "ArrowUp" ? c.firstLine : c.lastLine) && hop(el.current, e.key === "ArrowUp" ? -1 : 1)) e.preventDefault();
    }
  };

  const paste = (e) => {
    const text = e.clipboardData?.getData("text/plain") ?? "";
    const hasImage = [...(e.clipboardData?.items || [])].some((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (hasImage && !text) return; // let the document handle pasted pictures
    e.preventDefault();
    if (/\n/.test(text.trim()) && onPasteText?.(text)) return;
    document.execCommand("insertText", false, flat(text));
  };

  return (
    <div
      ref={el}
      className={"lw-rt " + className}
      contentEditable="true"
      suppressContentEditableWarning
      role="textbox"
      aria-label={label || placeholder}
      data-placeholder={placeholder}
      data-primary={primary || undefined}
      spellCheck
      onInput={emit}
      onKeyDown={keyDown}
      onPaste={paste}
      onFocus={onFocus}
      onDrop={(e) => { if (e.dataTransfer?.types?.includes("Files")) return; if (!e.dataTransfer?.types?.includes("text/plain")) e.preventDefault(); }}
    />
  );
});

export default RichText;
