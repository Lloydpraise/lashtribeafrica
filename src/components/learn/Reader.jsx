import { useEffect, useMemo, useRef, useState } from "react";
import { inline, pad2, watermarkUrl } from "./util.js";
import { FlipCard, Compare } from "./Interactive.jsx";

const TONES = {
  tip: { label: "Pro tip", icon: "✦" },
  mistake: { label: "Common mistake", icon: "!" },
  key: { label: "Remember", icon: "★" },
  note: { label: "Note", icon: "i" },
};

export function groupSections(blocks = []) {
  const sections = [];
  let cur = { title: null, blocks: [] };
  blocks.forEach((b) => {
    if (b.type === "heading") {
      if (cur.title || cur.blocks.length) sections.push(cur);
      cur = { title: b.text, blocks: [] };
    } else cur.blocks.push(b);
  });
  if (cur.title || cur.blocks.length) sections.push(cur);
  return sections;
}

/** Multiple choice check. `bare` strips the card chrome (used inside story screens). */
export function Checkpoint({ b, onSolved, onWrong, bare, solved }) {
  const [picked, setPicked] = useState(solved ? b.answer : null);
  const done = picked === b.answer;
  const pick = (i) => {
    setPicked(i);
    if (i === b.answer) onSolved?.(); else onWrong?.();
  };
  return (
    <div className={"rd-checkpoint" + (bare ? " bare" : "") + (done ? " ok" : picked != null ? " bad" : "")}>
      <div className="rd-cp-tag">Quick check</div>
      <p className="rd-cp-q">{b.question}</p>
      <div className="rd-cp-opts">
        {b.options.map((o, i) => (
          <button key={i} disabled={done}
                  className={picked === i ? (i === b.answer ? "right" : "wrong") : ""}
                  onClick={() => pick(i)}>
            <span>{String.fromCharCode(65 + i)}</span>{o}
          </button>
        ))}
      </div>
      {picked != null && (
        <p className="rd-cp-fb">
          {done ? <><b>Yes.</b> {b.explain}</> : <><b>Not quite.</b> Have another look and try again.</>}
        </p>
      )}
    </div>
  );
}

/** Blocks the reader has to act on before the article lets them read further, as in the story view. */
export const isGate = (b) => b.type === "checkpoint" || b.type === "flip";

export function Block({ b, solved, onSolved }) {
  switch (b.type) {
    case "text": return <p className="rd-p">{inline(b.text)}</p>;
    case "list": {
      const numbered = b.style === "numbered";
      const Tag = numbered ? "ol" : "ul";
      const cls = numbered ? "num" : b.style === "checklist" ? "chk" : "dot";
      return <Tag className={"rd-list " + cls}>{b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>;
    }
    case "steps":
      return (
        <ol className="rd-steps">
          {b.items.map((s, i) => (
            <li key={i}><span className="rd-step-n">{(b.start || 1) + i}</span><div><strong>{s.title}</strong><p>{inline(s.text)}</p></div></li>
          ))}
        </ol>
      );
    case "callout": {
      const t = TONES[b.tone] || TONES.note;
      return (
        <aside className={"rd-callout " + (b.tone || "note")}>
          <span className="rd-co-ic" aria-hidden>{t.icon}</span>
          <div><strong>{b.title || t.label}</strong><p>{inline(b.text)}</p></div>
        </aside>
      );
    }
    case "quote":
      return <blockquote className="rd-quote"><p>{inline(b.text)}</p>{b.by && <cite>{b.by}</cite>}</blockquote>;
    case "figure":
      if (!b.url) return null;
      return (
        <figure className="rd-figure">
          <img src={b.url} alt={b.caption || ""} loading="lazy" decoding="async" draggable={false} onContextMenu={(e) => e.preventDefault()} />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    case "checkpoint": return <Checkpoint b={b} solved={solved} onSolved={onSolved} />;
    case "flip": return <FlipCard b={b} solved={solved} onFlip={onSolved} />;
    case "compare": return <Compare b={b} />;
    case "divider": return <hr className="rd-hr" />;
    default: return null;
  }
}

/**
 * Article view: the same blocks as a scrolling page with a section progress rail. Scrolling past a
 * section's end marks it read, and the lesson completes once the last one is reached. The page
 * stops at the first unanswered question (or unflipped card) until the reader deals with it.
 */
export default function Reader({ blocks, onSeenAll, onProgress, watermark, startSection = 0, completed = false }) {
  const sections = useMemo(() => groupSections(blocks), [blocks]);
  const gates = useMemo(() => {
    const g = [];
    sections.forEach((s, si) => s.blocks.forEach((b, bi) => { if (isGate(b)) g.push({ key: `${si}:${bi}`, si, bi, type: b.type }); }));
    return g;
  }, [sections]);
  const start = Math.max(0, Math.min(startSection, sections.length - 1));
  const [seen, setSeen] = useState(() => new Set(Array.from({ length: start }, (_, k) => k)));
  const [solved, setSolved] = useState(() => new Set(gates.filter((g) => completed || g.si < start).map((g) => g.key)));
  const rootRef = useRef(null);
  const reported = useRef(false);

  const markUpTo = (i) => setSeen((prev) => {
    let changed = false;
    const next = new Set(prev);
    for (let k = 0; k <= i; k++) if (!next.has(k)) { next.add(k); changed = true; }
    return changed ? next : prev;
  });
  const solve = (key) => setSolved((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

  // everything after the first open gate stays hidden, so the page simply ends there
  const wall = gates.find((g) => !solved.has(g.key)) || null;

  // a section counts as read once its end has been reached
  useEffect(() => {
    if (!rootRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting || e.boundingClientRect.top < 0) markUpTo(Number(e.target.dataset.i));
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    rootRef.current.querySelectorAll("[data-sentinel]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections, wall?.key]);

  // pick up where the reader left off
  useEffect(() => {
    if (start < 1) return undefined;
    const t = setTimeout(() => rootRef.current?.querySelector(`[data-sec="${start}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const total = sections.length;
  const allSeen = total > 0 && seen.size >= total;
  useEffect(() => { onProgress?.(seen.size, total, wall?.type || null); }, [seen.size, total, wall?.type]); // eslint-disable-line
  useEffect(() => { if (allSeen && !reported.current) { reported.current = true; onSeenAll?.(); } }, [allSeen]); // eslint-disable-line

  const goto = (i) => rootRef.current?.querySelector(`[data-sec="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const activeSeg = Math.min(total - 1, Math.max(0, seen.size ? Math.max(...seen) + (seen.size < total ? 1 : 0) : 0));
  const shown = wall ? sections.slice(0, wall.si + 1) : sections;

  if (!total) return null;
  return (
    <div className="reader mode-scroll" ref={rootRef}
         onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <div className="lx-wm lx-wm-reader" aria-hidden style={{ backgroundImage: watermarkUrl(watermark) }} />
      {total > 1 && (
        <div className="rd-rail" role="tablist" aria-label="Lesson sections">
          {sections.map((s, i) => (
            <button key={i} role="tab" aria-label={`Section ${i + 1}${s.title ? ": " + s.title : ""}`} disabled={i >= shown.length}
                    className={(seen.has(i) ? "seen " : "") + (i === activeSeg ? "now" : "")} onClick={() => goto(i)} />
          ))}
        </div>
      )}
      {shown.map((s, i) => {
        const blocked = wall && wall.si === i;
        const list = blocked ? s.blocks.slice(0, wall.bi + 1) : s.blocks;
        return (
          <section className="rd-section" data-sec={i} key={i}>
            <div className="rd-sec-head">
              <span className="rd-num">{pad2(i + 1)}</span>
              {s.title && <h2>{s.title}</h2>}
            </div>
            {list.map((b, k) => {
              const key = `${i}:${k}`;
              return isGate(b)
                ? <Block b={b} key={k} solved={solved.has(key)} onSolved={() => solve(key)} />
                : <Block b={b} key={k} />;
            })}
            {blocked
              ? <div className="rd-wall" role="status">
                  <span aria-hidden>↑</span>
                  {wall.type === "flip" ? "Flip the card above to keep reading" : "Answer the question above to keep reading"}
                </div>
              : <div data-sentinel data-i={i} className="rd-sentinel" />}
          </section>
        );
      })}
    </div>
  );
}
