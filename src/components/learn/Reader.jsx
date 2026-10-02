import { useEffect, useMemo, useRef, useState } from "react";
import { inline, pad2, watermarkUrl } from "./util.js";

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

function Checkpoint({ b }) {
  const [picked, setPicked] = useState(null);
  const done = picked === b.answer;
  return (
    <div className={"rd-checkpoint" + (done ? " ok" : picked != null ? " bad" : "")}>
      <div className="rd-cp-tag">Quick check</div>
      <p className="rd-cp-q">{b.question}</p>
      <div className="rd-cp-opts">
        {b.options.map((o, i) => (
          <button key={i} disabled={done}
                  className={picked === i ? (i === b.answer ? "right" : "wrong") : ""}
                  onClick={() => setPicked(i)}>
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

export function Block({ b }) {
  switch (b.type) {
    case "text": return <p className="rd-p">{inline(b.text)}</p>;
    case "list": {
      const Tag = b.style === "numbered" ? "ol" : "ul";
      return <Tag className={"rd-list " + (b.style === "numbered" ? "num" : "dot")}>{b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>;
    }
    case "steps":
      return (
        <ol className="rd-steps">
          {b.items.map((s, i) => (
            <li key={i}><span className="rd-step-n">{i + 1}</span><div><strong>{s.title}</strong><p>{inline(s.text)}</p></div></li>
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
      return (
        <figure className="rd-figure">
          <img src={b.url} alt={b.caption || ""} loading="lazy" draggable={false} onContextMenu={(e) => e.preventDefault()} />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    case "checkpoint": return <Checkpoint b={b} />;
    case "divider": return <hr className="rd-hr" />;
    default: return null;
  }
}

export default function Reader({ blocks, mode = "scroll", onSeenAll, onProgress, watermark, resetKey }) {
  const sections = useMemo(() => groupSections(blocks), [blocks]);
  const [seen, setSeen] = useState(() => new Set());
  const [idx, setIdx] = useState(0);
  const rootRef = useRef(null);
  const cardsRef = useRef(null);
  const reported = useRef(false);

  useEffect(() => { setSeen(new Set()); setIdx(0); reported.current = false; }, [resetKey, mode]);

  const markUpTo = (i) => setSeen((prev) => {
    let changed = false;
    const next = new Set(prev);
    for (let k = 0; k <= i; k++) if (!next.has(k)) { next.add(k); changed = true; }
    return changed ? next : prev;
  });

  // scroll mode: a section counts as read once its end has been reached
  useEffect(() => {
    if (mode !== "scroll" || !rootRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting || e.boundingClientRect.top < 0) markUpTo(Number(e.target.dataset.i));
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    rootRef.current.querySelectorAll("[data-sentinel]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [mode, sections]);

  // cards mode: reaching a card marks all earlier ones read, last card = finished
  useEffect(() => { if (mode === "cards") markUpTo(Math.max(0, idx - 1)); if (mode === "cards" && idx === sections.length - 1) markUpTo(idx); }, [idx, mode, sections.length]);

  const total = sections.length;
  const allSeen = total > 0 && seen.size >= total;
  useEffect(() => { onProgress?.(seen.size, total); }, [seen.size, total]); // eslint-disable-line
  useEffect(() => { if (allSeen && !reported.current) { reported.current = true; onSeenAll?.(); } }, [allSeen]); // eslint-disable-line

  const goto = (i) => {
    if (mode === "cards") {
      const el = cardsRef.current; if (!el) return;
      el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
    } else {
      rootRef.current?.querySelector(`[data-sec="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const activeSeg = mode === "cards" ? idx : Math.min(total - 1, Math.max(0, seen.size ? Math.max(...seen) + (seen.size < total ? 1 : 0) : 0));

  const Rail = (
    <div className="rd-rail" role="tablist" aria-label="Lesson sections">
      {sections.map((s, i) => (
        <button key={i} role="tab" aria-label={`Section ${i + 1}${s.title ? ": " + s.title : ""}`}
                className={(seen.has(i) ? "seen " : "") + (i === activeSeg ? "now" : "")} onClick={() => goto(i)} />
      ))}
    </div>
  );

  if (!total) return null;

  const SectionBody = ({ s, i }) => (
    <>
      <div className="rd-sec-head">
        <span className="rd-num">{pad2(i + 1)}</span>
        {s.title && <h2>{s.title}</h2>}
      </div>
      {s.blocks.map((b, k) => <Block b={b} key={k} />)}
    </>
  );

  return (
    <div className={"reader mode-" + mode} ref={rootRef}
         onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <div className="lx-wm lx-wm-reader" aria-hidden style={{ backgroundImage: watermarkUrl(watermark) }} />
      {total > 1 && Rail}
      {mode === "scroll" ? (
        sections.map((s, i) => (
          <section className="rd-section" data-sec={i} key={i}>
            <SectionBody s={s} i={i} />
            <div data-sentinel data-i={i} className="rd-sentinel" />
          </section>
        ))
      ) : (
        <>
          <div className="rd-cards" ref={cardsRef}
               onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {sections.map((s, i) => (
              <section className="rd-card" key={i}><SectionBody s={s} i={i} /></section>
            ))}
          </div>
          <div className="rd-cards-nav">
            <button onClick={() => goto(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="Previous section">←</button>
            <span>{idx + 1} / {total}</span>
            <button onClick={() => goto(Math.min(total - 1, idx + 1))} disabled={idx === total - 1} aria-label="Next section">→</button>
          </div>
        </>
      )}
    </div>
  );
}
