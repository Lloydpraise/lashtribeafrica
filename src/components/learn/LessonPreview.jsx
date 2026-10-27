import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Reader, { Block, groupSections } from "./Reader.jsx";
import { buildScreens } from "./screens.js";

const Story = lazy(() => import("./Story.jsx"));
const MSG = "lashtribe-lesson-preview";

/** Screen the story should open on so the block being edited is in view. */
function screenFor(blocks, i, meta) {
  if (i < 0) return 0;
  return Math.max(0, buildScreens(blocks.slice(0, i), meta).length - 1);
}
/** Article section that holds block i. */
function sectionFor(blocks, i) {
  if (i < 0) return 0;
  return Math.max(0, groupSections(blocks.slice(0, i + 1)).length - 1);
}

/**
 * One lesson rendered with the real student components, driven by the admin lesson writer.
 * Only accepts messages from a page on the same site that embeds it.
 */
export default function LessonPreview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === MSG && Array.isArray(e.data.lesson?.blocks)) setData(e.data);
    };
    window.addEventListener("message", onMsg);
    if (window.parent !== window) window.parent.postMessage({ type: `${MSG}:ready` }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const lesson = data?.lesson;
  const blocks = lesson?.blocks || [];
  const meta = useMemo(() => ({ title: lesson?.title, summary: lesson?.summary, minutes: lesson?.minutes || 3 }), [lesson?.title, lesson?.summary, lesson?.minutes]);
  const screens = useMemo(() => buildScreens(blocks, meta), [blocks, meta]);

  if (!data) return <div className="lx-root lp-root"><div className="lp-empty">Waiting for the editor…</div></div>;
  if (!blocks.length) return <div className="lx-root lp-root"><div className="lp-empty">Start writing and the lesson appears here.</div></div>;

  const focus = Math.min(data.focus ?? -1, blocks.length - 1);

  if (data.notes) {
    return (
      <div className="lx-root lp-root lp-article">
        <div className="reader mode-scroll">
          {groupSections(blocks).map((s, i) => (
            <section className="rd-section tight" key={i}>
              {s.title && <div className="rd-sec-head"><h2>{s.title}</h2></div>}
              {s.blocks.map((b, k) => <Block b={b} key={k} />)}
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (data.view === "article") {
    const sec = sectionFor(blocks, focus);
    return (
      <div className="lx-root reading lp-root lp-article">
        <Reader key={`${sec}:${blocks.length}`} blocks={blocks} startSection={sec} completed />
      </div>
    );
  }

  const start = Math.min(screenFor(blocks, focus, meta), screens.length - 2);
  return (
    <div className="lx-root lp-root lp-story">
      <Suspense fallback={<div className="lp-empty">Loading…</div>}>
        {/* remount when the edited block or the number of screens changes, so the story opens on it */}
        <Story key={`${start}:${screens.length}`} blocks={blocks} title={lesson.title} summary={lesson.summary} minutes={lesson.minutes || 3}
          startAt={start} onArticle={() => {}} onNext={() => {}} nextLabel="Next lesson →" />
      </Suspense>
    </div>
  );
}
