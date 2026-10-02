import { useEffect, useRef, useState } from "react";
import { fmtTime, useStoreValue } from "./util.js";

export function Transcript({ lines = [], timeStore, onSeek }) {
  const time = useStoreValue(timeStore);
  const listRef = useRef(null);
  const activeIdx = (() => { let a = -1; lines.forEach((l, i) => { if (time >= l.t) a = i; }); return a; })();

  useEffect(() => {
    const el = listRef.current?.querySelector(".on");
    if (el && listRef.current) {
      const box = listRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) listRef.current.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
    }
  }, [activeIdx]);

  if (!lines.length) return <p className="lx-empty">No transcript for this lesson.</p>;
  return (
    <div className="lx-transcript" ref={listRef}>
      {lines.map((l, i) => (
        <button key={i} className={i === activeIdx ? "on" : i < activeIdx ? "past" : ""} onClick={() => onSeek(l.t)}>
          <b>{fmtTime(l.t)}</b><span>{l.text}</span>
        </button>
      ))}
    </div>
  );
}

export function Notes({ notes, hasVideo, timeStore, onAdd, onDelete, onSeek, canNote, onNeedSignIn }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const time = useStoreValue(timeStore);

  const save = async () => {
    const body = text.trim();
    if (!body) return;
    if (!canNote) { onNeedSignIn?.(); return; }
    setBusy(true);
    try { await onAdd(hasVideo ? Math.floor(timeStore.get()) : null, body); setText(""); } finally { setBusy(false); }
  };

  return (
    <div className="lx-notes">
      <div className="lx-note-form">
        <textarea value={text} maxLength={2000} rows={3} onChange={(e) => setText(e.target.value)}
                  placeholder={hasVideo ? "Jot something down. It is saved at the current moment." : "Write your own notes for this lesson…"}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save(); }} />
        <button className="lx-btn dark sm" onClick={save} disabled={busy || !text.trim()}>
          {hasVideo ? `Save note at ${fmtTime(time)}` : "Save note"}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="lx-empty">Your notes for this lesson will appear here. They are private to you.</p>
      ) : (
        <ul className="lx-note-list">
          {notes.map((n) => (
            <li key={n.id}>
              {n.t != null && <button className="lx-note-t" onClick={() => onSeek(n.t)}>{fmtTime(n.t)}</button>}
              <p>{n.body}</p>
              <button className="lx-note-del" aria-label="Delete note" onClick={() => onDelete(n.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Shop({ items, onAdd, onSeek, hasVideo, added }) {
  if (!items.length) return <p className="lx-empty">No products are featured in this lesson.</p>;
  return (
    <ul className="lx-shop">
      {items.map((it) => (
        <li key={it.slug + it.t}>
          <div className="lx-shop-img">{it.product.image ? <img src={it.product.image} alt="" /> : <span>✦</span>}</div>
          <div className="lx-shop-body">
            <strong>{it.product.name}</strong>
            <span>Ksh {Number(it.product.price).toLocaleString()}</span>
            {it.note && <small>{it.note}</small>}
            {hasVideo && it.t != null && <button className="lx-link" onClick={() => onSeek(it.t)}>Shown at {fmtTime(it.t)}</button>}
          </div>
          <button className={"lx-btn dark sm" + (added[it.slug] ? " done" : "")} onClick={() => onAdd(it.product)}>
            {added[it.slug] ? "Added ✓" : "+ Add"}
          </button>
        </li>
      ))}
    </ul>
  );
}
