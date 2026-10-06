import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { inline, pad2, watermarkUrl } from "./util.js";
import { groupSections, Checkpoint } from "./Reader.jsx";
import { FlipCard, Compare } from "./Interactive.jsx";

const TONE_ICON = { tip: "✦", mistake: "!", key: "★", note: "i" };
const TONE_LABEL = { tip: "Pro tip", mistake: "Common mistake", key: "Remember", note: "Note" };
const TONE_THEME = { tip: "blush", mistake: "red", key: "inkgold", note: "grey" };

/** Long paragraphs become several short screens. Text with inline markup is never split. */
function splitText(text, max = 230) {
  const t = String(text);
  if (t.length <= max || t.includes("*")) return [t];
  const parts = t.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [t];
  const out = [];
  let cur = "";
  parts.forEach((p) => {
    if (cur && (cur + p).length > max) { out.push(cur.trim()); cur = p; } else cur += p;
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Turns a lesson's blocks into a list of single-idea screens. */
export function buildScreens(blocks, meta) {
  const secs = groupSections(blocks);
  const screens = [{ type: "intro", sec: -1, theme: "rose", ...meta }];
  let chapter = 0;
  let flip = 0;
  secs.forEach((s, si) => {
    if (s.title) {
      chapter += 1;
      screens.push({ type: "chapter", sec: si, theme: "ink", n: chapter, title: s.title });
    }
    s.blocks.forEach((b) => {
      switch (b.type) {
        case "text":
          splitText(b.text).forEach((t) => screens.push({ type: "statement", sec: si, theme: flip++ % 2 ? "blush" : "paper", text: t }));
          break;
        case "list":
          if (b.style === "checklist") screens.push({ type: "checklist", sec: si, theme: "blush", items: b.items, gate: true });
          else screens.push({ type: "list", sec: si, theme: "paper", style: b.style, items: b.items });
          break;
        case "steps":
          screens.push({ type: "steps", sec: si, theme: "paper", items: b.items, beats: b.items.length, start: b.start, of: b.of });
          break;
        case "callout":
          screens.push({ type: "callout", sec: si, theme: TONE_THEME[b.tone] || "grey", tone: b.tone || "note", title: b.title, text: b.text });
          break;
        case "quote":
          screens.push({ type: "quote", sec: si, theme: "rose", text: b.text, by: b.by });
          break;
        case "figure":
          if (!b.url) break;
          screens.push({ type: "figure", sec: si, theme: "paper", url: b.url, caption: b.caption });
          break;
        case "checkpoint":
          screens.push({ type: "checkpoint", sec: si, theme: "paper", b, gate: true });
          break;
        case "flip":
          screens.push({ type: "flip", sec: si, theme: "blush", b, gate: true });
          break;
        case "compare":
          screens.push({ type: "compare", sec: si, theme: "paper", b });
          break;
        default:
          break;
      }
    });
  });
  screens.push({ type: "end", sec: secs.length, theme: "rose" });
  return screens;
}

function Checklist({ items, solved, onDone }) {
  const [on, setOn] = useState(() => new Set(solved ? items.map((_, i) => i) : []));
  useEffect(() => { if (on.size === items.length) onDone?.(); }, [on.size]); // eslint-disable-line
  const toggle = (i) => setOn((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <ul className="st-checks">
      {items.map((t, i) => (
        <li key={i} style={{ "--i": i }}>
          <button type="button" className={on.has(i) ? "on" : ""} aria-pressed={on.has(i)} onClick={() => toggle(i)}>
            <span className="st-box" aria-hidden>{on.has(i) ? "✓" : ""}</span>
            <span>{inline(t)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function sizeClass(text) {
  const n = String(text).length;
  return n < 85 ? "xl" : n < 170 ? "lg" : "md";
}

function ScreenBody({ s, i, beat, solved, solve, api }) {
  switch (s.type) {
    case "intro":
      return (
        <div className="st-body center">
          <div className="st-eyebrow">Reading lesson · {s.minutes} min</div>
          <h1 className="st-title">{s.title}</h1>
          {s.summary && <p className="st-lede">{s.summary}</p>}
          <button type="button" className="st-cta" onClick={api.next}>Start reading →</button>
        </div>
      );
    case "chapter":
      return (
        <div className="st-body center">
          <div className="st-num">{pad2(s.n)}</div>
          <h2 className="st-chtitle">{s.title}</h2>
        </div>
      );
    case "statement":
      return (
        <div className="st-body center-left">
          <p className={"st-statement " + sizeClass(s.text)}>{inline(s.text)}</p>
        </div>
      );
    case "list":
      return (
        <div className="st-body">
          <ul className={"st-list " + (s.style === "numbered" ? "num" : "dot")}>
            {s.items.map((t, k) => <li key={k} style={{ "--i": k }}>{inline(t)}</li>)}
          </ul>
        </div>
      );
    case "checklist":
      return (
        <div className="st-body">
          <div className="st-label">Tick each one</div>
          <Checklist items={s.items} solved={solved} onDone={() => solve(i)} />
        </div>
      );
    case "steps":
      return (
        <div className="st-body">
          <div className="st-label">Step {(s.start || 1) + beat - 1} of {s.of || s.items.length}</div>
          <ol className="st-steps">
            {s.items.slice(0, beat).map((it, k) => (
              <li key={k} className={k === beat - 1 ? "now" : ""}>
                <span className="st-step-n">{(s.start || 1) + k}</span>
                <div><strong>{it.title}</strong><p>{inline(it.text)}</p></div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "callout":
      return (
        <div className="st-body center-left">
          <div className="st-chip"><i aria-hidden>{TONE_ICON[s.tone] || "i"}</i>{s.title || TONE_LABEL[s.tone] || "Note"}</div>
          <p className={"st-callout " + sizeClass(s.text)}>{inline(s.text)}</p>
        </div>
      );
    case "quote":
      return (
        <div className="st-body center">
          <div className="st-qmark" aria-hidden>“</div>
          <p className="st-quote">{inline(s.text)}</p>
          {s.by && <cite className="st-cite">{s.by}</cite>}
        </div>
      );
    case "figure":
      return (
        <div className="st-body fig">
          <div className="st-fig"><img src={s.url} alt={s.caption || ""} draggable={false} onContextMenu={(e) => e.preventDefault()} /></div>
          {s.caption && <p className="st-cap">{s.caption}</p>}
        </div>
      );
    case "checkpoint":
      return (
        <div className="st-body">
          <Checkpoint bare b={s.b} solved={solved} onSolved={() => solve(i)} />
        </div>
      );
    case "flip":
      return (
        <div className="st-body center">
          <FlipCard b={s.b} solved={solved} onFlip={() => solve(i)} />
        </div>
      );
    case "compare":
      return (
        <div className="st-body center">
          <Compare b={s.b} />
        </div>
      );
    case "end":
      return (
        <div className="st-body center">
          <div className="st-done" aria-hidden>✓</div>
          <h2 className="st-chtitle">Lesson complete</h2>
          <p className="st-lede">{api.sections > 0 ? `You worked through ${api.sections} section${api.sections === 1 ? "" : "s"}. ` : ""}Nicely done.</p>
          <div className="st-end">
            <button type="button" className="st-cta" onClick={api.onNext}>{api.nextLabel}</button>
            <button type="button" className="st-ghost" onClick={api.restart}>Read again</button>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function Story({ blocks, title, summary, minutes = 3, startAt = 0, watermark, onFinish, onPosition, onArticle, onNext, nextLabel = "Next lesson →" }) {
  const screens = useMemo(() => buildScreens(blocks, { title, summary, minutes }), [blocks, title, summary, minutes]);
  const last = screens.length - 1;
  const [pos, setPos] = useState(() => ({ i: startAt > 0 && startAt < last ? startAt : 0, beat: 1, dir: "fwd" }));
  const [solved, setSolved] = useState(() => new Set());
  const [nudge, setNudge] = useState(false);
  const stRef = useRef(null);
  const swipe = useRef(null);
  const swiped = useRef(false);
  const nudgeTimer = useRef(null);

  const cur = screens[pos.i];
  const gated = !!cur.gate && !solved.has(pos.i);
  const sectionCount = screens[last].sec;

  const solve = useCallback((i) => setSolved((prev) => (prev.has(i) ? prev : new Set(prev).add(i))), []);

  const next = useCallback(() => {
    if (gated) {
      setNudge(true); clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => setNudge(false), 700);
      return;
    }
    setPos((p) => {
      const s = screens[p.i];
      if (s.beats && p.beat < s.beats) return { ...p, beat: p.beat + 1, dir: "fwd" };
      if (p.i >= last) return p;
      return { i: p.i + 1, beat: 1, dir: "fwd" };
    });
  }, [gated, screens, last]);

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.beat > 1) return { ...p, beat: p.beat - 1, dir: "back" };
      if (p.i <= 0) return p;
      const pr = screens[p.i - 1];
      return { i: p.i - 1, beat: pr.beats || 1, dir: "back" };
    });
  }, [screens]);

  const restart = useCallback(() => setPos({ i: 0, beat: 1, dir: "back" }), []);

  // reaching the final screen completes the lesson
  useEffect(() => { if (cur.type === "end") onFinish?.(); }, [pos.i]); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => onPosition?.(pos.i), 700);
    return () => clearTimeout(t);
  }, [pos.i]); // eslint-disable-line

  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const tag = (el?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if ((e.key === " " || e.key === "Enter") && tag !== "button" && tag !== "a") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // tap zones: left third goes back, the rest goes forward. Swipes work too.
  const onPointerDown = (e) => { swipe.current = { x: e.clientX, y: e.clientY }; swiped.current = false; };
  const onPointerUp = (e) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; dx < 0 ? next() : prev(); }
  };
  const onClick = (e) => {
    if (swiped.current) { swiped.current = false; return; }
    if (e.target.closest("button, a, input, textarea, [data-tap-stop]")) return;
    const r = stRef.current.getBoundingClientRect();
    (e.clientX - r.left) / r.width < 0.3 ? prev() : next();
  };

  // progress segments: one per chapter, filled as the reader moves through it
  const counts = useMemo(() => {
    const c = [];
    screens.forEach((s) => { if (s.sec >= 0 && s.sec < sectionCount) c[s.sec] = (c[s.sec] || 0) + 1; });
    return c;
  }, [screens, sectionCount]);
  const withinSection = (k) => {
    let n = 0;
    for (let j = 0; j <= pos.i; j++) if (screens[j].sec === k) n++;
    return n / (counts[k] || 1);
  };
  const fill = (k) => (cur.sec === -1 ? 0 : cur.sec >= sectionCount || k < cur.sec ? 1 : k === cur.sec ? withinSection(k) : 0);

  const hint = gated
    ? (cur.type === "checkpoint" ? "Answer correctly to continue" : cur.type === "flip" ? "Flip the card to continue" : "Tick every item to continue")
    : cur.beats && pos.beat < cur.beats ? "Tap for the next step"
    : cur.type === "intro" || cur.type === "end" ? "" : "Tap to continue";

  return (
    <div className="st-wrap" onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <div className="st" ref={stRef} data-theme={cur.theme} role="region" aria-label={`Story: ${title}`}
           onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick}>
        <div className="lx-wm st-wm" aria-hidden style={{ backgroundImage: watermarkUrl(watermark) }} />

        <div className="st-head">
          {sectionCount > 0 && (
            <div className="st-seg" aria-hidden>
              {Array.from({ length: sectionCount }, (_, k) => <span key={k}><i style={{ width: fill(k) * 100 + "%" }} /></span>)}
            </div>
          )}
          <div className="st-meta">
            <span className="st-meta-title">{title}</span>
            <button type="button" className="st-article" onClick={onArticle}>Article view</button>
          </div>
        </div>

        <div className="st-stage" aria-live="polite">
          <div className={"st-screen " + pos.dir} key={pos.i} data-type={cur.type}>
            <ScreenBody s={cur} i={pos.i} beat={pos.beat} solved={solved.has(pos.i)} solve={solve}
                        api={{ next, onNext, nextLabel, restart, sections: sectionCount }} />
          </div>
        </div>

        <div className="st-foot">
          <button type="button" className="st-nav" onClick={prev} disabled={pos.i === 0 && pos.beat === 1} aria-label="Previous screen">‹</button>
          <span className={"st-hint" + (nudge ? " nudge" : "")}>{hint}</span>
          <button type="button" className="st-nav" onClick={next} disabled={pos.i >= last && !(cur.beats && pos.beat < cur.beats)} aria-label="Next screen">›</button>
        </div>
      </div>
    </div>
  );
}
