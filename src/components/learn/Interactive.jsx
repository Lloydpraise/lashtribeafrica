import { useState } from "react";
import { inline } from "./util.js";

/** Tap-to-flip card (myth vs fact, term vs meaning). Works in story and article views. */
export function FlipCard({ b, solved, onFlip }) {
  const [on, setOn] = useState(!!solved);
  const flip = () => {
    setOn((v) => !v);
    if (!on) onFlip?.();
  };
  return (
    <div className="fx-wrap">
      <div className="fx-prompt">{b.prompt || "Tap the card"}</div>
      <button type="button" className={"fx-card" + (on ? " on" : "")} aria-pressed={on} onClick={flip}>
        <span className="fx-inner">
          <span className="fx-face fx-front">
            <small>{b.frontLabel || "Myth"}</small>
            <b>{inline(b.front)}</b>
            <em>Tap to flip</em>
          </span>
          <span className="fx-face fx-back">
            <small>{b.backLabel || "Fact"}</small>
            <b>{inline(b.back)}</b>
          </span>
        </span>
      </button>
    </div>
  );
}

/** Do / Don't comparison. */
export function Compare({ b }) {
  const col = (cls, label, icon, items) => (
    <div className={"cmp-col " + cls}>
      <strong><i aria-hidden>{icon}</i> {label}</strong>
      <ul>{(items || []).map((t, k) => <li key={k} style={{ "--i": k }}>{inline(t)}</li>)}</ul>
    </div>
  );
  return (
    <div className="cmp-wrap">
      {b.title && <div className="cmp-title">{b.title}</div>}
      <div className="cmp-cols">
        {col("do", b.doLabel || "Do", "✓", b.do)}
        {col("dont", b.dontLabel || "Don't", "✕", b.dont)}
      </div>
    </div>
  );
}
