import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/learn.css";
import {
  HAS_DB, loadCourse, loadLessonContent, loadProgress, saveProgress, enrollFree,
  loadNotes, addNote, deleteNote, resolveProducts, addToShopCart, getUser, signIn, signUp, hasAcademyDemoSession,
} from "../../services/academy.js";
import { createTimeStore, useMedia, burstConfetti, fmtMinutes } from "./util.js";
import VideoStage from "./VideoStage.jsx";
import Reader, { Block, groupSections } from "./Reader.jsx";
import Assessment from "./Assessment.jsx";
import Curriculum from "./Curriculum.jsx";
import { Transcript, Notes, Shop } from "./Panels.jsx";

const params = () => new URLSearchParams(window.location.search);

function SignInGate({ onDone, course }) {
  const [mode, setMode] = useState("in");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "in") await signIn(f.email, f.pw); else await signUp(f.name, f.email, f.pw);
      onDone();
    } catch (x) { setErr(x.message || "Something went wrong"); } finally { setBusy(false); }
  };
  return (
    <div className="lx-gate">
      <div className="lx-card">
        <div className="lx-eyebrow">Lashtribe Academy</div>
        <h1>{mode === "in" ? "Sign in to start learning" : "Create your account"}</h1>
        {course && <p className="lx-muted">{course.title}</p>}
        <form onSubmit={submit}>
          {mode === "up" && <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
          <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} required minLength={6} />
          {err && <div className="lx-err">{err}</div>}
          <button className="lx-btn dark" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="lx-link" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Already learning with us? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Locked({ course, preview, demoSession }) {
  return (
    <div className="lx-locked">
      <div className="lx-lock-ic">🔒</div>
      <h2>{demoSession ? "This lesson requires full course access" : "This lesson is part of the full course"}</h2>
      <p>{demoSession
        ? "Your Academy demo session includes preview lessons only. Sign in to your course account for full access."
        : `${course.title} is ${course.is_free ? "free once you sign in" : `Ksh ${Number(course.price).toLocaleString()}`}.`}</p>
      {preview && <p className="lx-muted">Preview lessons are marked in the curriculum.</p>}
      <a className="lx-btn dark" href="/academy/">Back to the academy</a>
    </div>
  );
}

function Certificate({ course, onBack }) {
  return (
    <div className="lx-cert">
      <div className="lx-cert-seal">★</div>
      <div className="lx-eyebrow">Course complete</div>
      <h1>You finished {course.title}</h1>
      <p>Every lesson is done. You are eligible for your Lashtribe Academy certificate{course.bonus_points ? ` and ${course.bonus_points} bonus points` : ""}.</p>
      <button className="lx-btn dark" onClick={onBack}>Back to the academy</button>
    </div>
  );
}

export default function LearnApp() {
  const [boot, setBoot] = useState("loading"); // loading | notfound | gate | ready | error
  const [ctx, setCtx] = useState(null);
  const [demoSession, setDemoSession] = useState(false);
  const [progress, setProgress] = useState({});
  const [lessonId, setLessonId] = useState(null);
  const [cache, setCache] = useState({});
  const [lessonState, setLessonState] = useState("idle"); // idle | loading | locked | error
  const [products, setProducts] = useState({});
  const [added, setAdded] = useState({});
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState("lesson");
  const [panelTab, setPanelTab] = useState("notes");
  const [drawer, setDrawer] = useState(false);
  const [courseOpen, setCourseOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [mode, setMode] = useState("scroll");
  const [seenInfo, setSeenInfo] = useState({ n: 0, total: 0 });
  const [toast, setToast] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const timeStore = useMemo(() => createTimeStore(), []);
  const playerApi = useRef(null);
  const toastTimer = useRef(null);
  const isMobile = useMedia("(max-width: 699px)");
  const isWide = useMedia("(min-width: 1100px)");

  const say = useCallback((m) => {
    setToast(m); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  // ---------- boot ----------
  const boots = useCallback(async () => {
    setBoot("loading");
    try {
      const hasDemoSession = hasAcademyDemoSession();
      setDemoSession(hasDemoSession);
      const slug = params().get("course");
      if (!slug) { setBoot("notfound"); return; }
      const c = await loadCourse(slug);
      if (!c) { setBoot("notfound"); return; }
      if (c.source === "db" && !c.user && !hasDemoSession) { setCtx(c); setBoot("gate"); return; }
      const prog = await loadProgress(c);
      setCtx(c); setProgress(prog);
      const want = params().get("lesson");
      const first = c.lessons.find((l) => !prog[l.id]?.completed) || c.lessons[0];
      setLessonId(c.lessons.some((l) => l.id === want) || want === "__certificate" ? want : first?.id || null);
      setBoot("ready");
      enrollFree(c);
    } catch (error) {
      console.error("Academy: could not start course", error);
      setBoot("error");
    }
  }, []);
  useEffect(() => { boots(); }, [boots]);

  useEffect(() => {
    const on = () => { const w = params().get("lesson"); if (w) setLessonId(w); };
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);

  useEffect(() => {
    const sync = () => setCartCount(window.LashtribeCart?.getCartCount?.() || 0);
    sync();
    window.addEventListener("lashtribe:cart-updated", sync);
    return () => window.removeEventListener("lashtribe:cart-updated", sync);
  }, []);

  // ---------- derived ----------
  const lessons = ctx?.lessons || [];
  const lesson = lessons.find((l) => l.id === lessonId) || null;
  const idx = lesson ? lessons.indexOf(lesson) : -1;
  const doneCount = lessons.filter((l) => progress[l.id]?.completed).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const certReady = lessons.length > 0 && doneCount === lessons.length;

  const stateOf = useCallback((l) => {
    if (!ctx) return "open";
    if (!ctx.access && !l.is_preview) return "paywall";
    if (ctx.course.sequential) {
      const i = lessons.indexOf(l);
      const prevDone = i === 0 || progress[lessons[i - 1].id]?.completed || progress[l.id]?.completed;
      if (!prevDone) return "sequence";
    }
    return "open";
  }, [ctx, lessons, progress]);

  const go = useCallback((id) => {
    if (id !== "__certificate") {
      const l = lessons.find((x) => x.id === id);
      if (l && stateOf(l) === "sequence") { say("Finish the previous lesson to unlock this one."); return; }
    }
    setLessonId(id); setTab("lesson"); setDrawer(false);
    const u = new URL(window.location.href);
    u.searchParams.set("lesson", id);
    window.history.pushState({}, "", u);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lessons, stateOf, say]);

  // ---------- lesson content ----------
  useEffect(() => {
    if (!ctx || !lesson) return;
    setSeenInfo({ n: 0, total: 0 });
    timeStore.set(0);
    if (stateOf(lesson) === "paywall") { setLessonState("locked"); return; }
    if (cache[lesson.id]) { setLessonState("idle"); return; }
    let live = true;
    setLessonState("loading");
    loadLessonContent(ctx, lesson)
      .then((c) => {
        if (!live) return;
        if (!c) { setLessonState("locked"); return; }
        setCache((x) => ({ ...x, [lesson.id]: c }));
        setLessonState("idle");
        const slugs = (c.video?.products || []).map((p) => p.slug);
        resolveProducts(slugs).then((p) => live && setProducts((x) => ({ ...x, ...p })));
      })
      .catch(() => live && setLessonState("error"));
    return () => { live = false; };
  }, [ctx, lessonId]); // eslint-disable-line

  useEffect(() => {
    if (!ctx || !lesson) return;
    let live = true;
    loadNotes(ctx, lesson.id).then((n) => live && setNotes(n)).catch(() => {});
    return () => { live = false; };
  }, [ctx, lessonId]); // eslint-disable-line

  // resolve products once content is cached (covers cache hits)
  useEffect(() => {
    const c = lesson && cache[lesson.id];
    if (!c) return;
    const missing = (c.video?.products || []).map((p) => p.slug).filter((s) => !products[s]);
    if (missing.length) resolveProducts(missing).then((p) => setProducts((x) => ({ ...x, ...p })));
  }, [lessonId, cache]); // eslint-disable-line

  const content = lesson ? cache[lesson.id] : null;
  const video = content?.video || null;
  const blocks = content?.blocks || [];
  const quiz = blocks.find((b) => b.type === "quiz");
  const bodyBlocks = blocks.filter((b) => b.type !== "quiz");
  const timed = useMemo(
    () => (video?.products || []).map((p) => ({ ...p, product: products[p.slug] })).filter((p) => p.product),
    [video, products]
  );
  const hasShop = timed.length > 0;
  const hasTranscript = !!video?.transcript?.length;
  const watermark = ctx?.user?.email || (ctx?.source === "demo" ? "Lashtribe Academy · Preview" : "Lashtribe Academy");

  // ---------- progress ----------
  const complete = useCallback((id, quiet) => {
    if (progress[id]?.completed) return;
    setProgress((p) => ({ ...p, [id]: { ...(p[id] || {}), completed: true } }));
    saveProgress(ctx, id, { completed: true });
    const left = lessons.filter((l) => l.id !== id && !progress[l.id]?.completed).length;
    if (left === 0) { burstConfetti(70); say("Course complete! 🎓"); }
    else { if (!quiet) burstConfetti(24); say("Lesson complete ✓"); }
  }, [ctx, lessons, progress, say]);

  const onSave = useCallback((t) => {
    if (!lesson) return;
    saveProgress(ctx, lesson.id, { position: t });
  }, [ctx, lesson]);

  const onAddProduct = (p) => {
    if (addToShopCart(p)) { setAdded((a) => ({ ...a, [p.slug]: true })); say(`Added ${p.name} to your cart`); }
    else say("Open the shop to add this product.");
  };
  const seek = (t) => playerApi.current?.seek(t);

  // ---------- render states ----------
  if (boot === "loading") return <div className="lx-root"><div className="lx-center"><div className="lx-loading" role="status"><div className="lx-spin" aria-hidden="true" /><span>Loading your course…</span></div></div></div>;
  if (boot === "error")
    return (
      <div className="lx-root"><div className="lx-center"><div className="lx-card">
        <div className="lx-eyebrow">Lashtribe Academy</div>
        <h1>We couldn't load this course</h1>
        <p className="lx-muted">Check your connection and try again.</p>
        <button className="lx-btn dark" onClick={boots}>Try again</button>
      </div></div></div>
    );
  if (boot === "notfound")
    return (
      <div className="lx-root"><div className="lx-center"><div className="lx-card">
        <div className="lx-eyebrow">Lashtribe Academy</div>
        <h1>This course isn't available yet</h1>
        <p className="lx-muted">We are still preparing it. Check back soon.</p>
        <a className="lx-btn dark" href="/academy/">Back to the academy</a>
      </div></div></div>
    );
  if (boot === "gate")
    return <div className="lx-root"><SignInGate course={ctx?.course} onDone={() => { setBoot("loading"); boots(); }} /></div>;

  const course = ctx.course;
  const isCert = lessonId === "__certificate";
  const done = lesson ? !!progress[lesson.id]?.completed : false;
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const sections = lesson?.kind === "reading" ? groupSections(bodyBlocks).length : 0;
  const readerReady = lesson?.kind !== "reading" || seenInfo.total === 0 || seenInfo.n >= seenInfo.total;

  const mainBar = (() => {
    if (!lesson || isCert) return null;
    if (lessonState === "locked") return <span className="lx-bar-hint">Full course access is required for this lesson</span>;
    if (lessonState === "loading") return <span className="lx-bar-hint">Loading lesson…</span>;
    if (lessonState === "error") return <span className="lx-bar-hint">Lesson content couldn't be loaded</span>;
    if (lesson.kind === "assessment" && !done) return <span className="lx-bar-hint">Pass the quiz to complete this lesson</span>;
    if (done) return next
      ? <button className="lx-btn dark" onClick={() => go(next.id)}>Next lesson →</button>
      : <button className="lx-btn dark" onClick={() => go("__certificate")}>Finish course →</button>;
    if (lesson.kind === "reading")
      return <button className="lx-btn dark" disabled={!readerReady} onClick={() => complete(lesson.id)}>{readerReady ? "Finish lesson ✓" : `Keep reading · ${seenInfo.n} of ${seenInfo.total}`}</button>;
    return <button className="lx-btn dark" onClick={() => complete(lesson.id)}>Mark complete ✓</button>;
  })();

  const stageEl = video && lessonState === "idle" && lesson ? (
    <VideoStage key={lesson.id} video={video} title={lesson.title} startAt={progress[lesson.id]?.position || 0}
      timeStore={timeStore} apiRef={playerApi} onSave={onSave} onNearEnd={() => !progress[lesson.id]?.completed && complete(lesson.id, true)}
      timed={timed} onAdd={onAddProduct} watermark={watermark} />
  ) : null;

  const lessonView = lesson && (
    <>
      <div className="lx-lesson-head">
        <div className="lx-eyebrow">{lesson.kind === "video" ? "Video lesson" : lesson.kind === "reading" ? "Reading lesson" : "Assessment"}
          <span>· {lesson.kind === "video" ? fmtMinutes(lesson.duration_seconds) : lesson.kind === "reading" ? `${lesson.read_minutes || 3} min read` : `${quiz?.questions?.length || 0} questions`}</span>
        </div>
        <h1>{lesson.title}</h1>
        {lesson.summary && <p className="lx-sum">{lesson.summary}</p>}
        {lesson.kind === "reading" && sections > 1 && (
          <div className="lx-modes" role="group" aria-label="Reading mode">
            <button className={mode === "scroll" ? "on" : ""} onClick={() => setMode("scroll")}>Scroll</button>
            <button className={mode === "cards" ? "on" : ""} onClick={() => setMode("cards")}>Cards</button>
          </div>
        )}
      </div>
      {lessonState === "loading" && <div className="lx-skel"><i /><i /><i /></div>}
      {lessonState === "error" && <div className="lx-err-box">We couldn't load this lesson. Check your connection and try again.</div>}
      {lessonState === "locked" && <Locked course={course} preview={lessons.some((l) => l.is_preview)} demoSession={demoSession} />}
      {lessonState === "idle" && content && (
        lesson.kind === "assessment"
          ? <Assessment key={lesson.id} quiz={quiz} completed={done} onPass={() => complete(lesson.id)} />
          : bodyBlocks.length > 0 && (
            video
              ? <div className="lx-notes-body"><div className="lx-sec-label">Lesson notes</div>
                  <div className="reader mode-scroll">{groupSections(bodyBlocks).map((s, i) => <section className="rd-section tight" key={i}>{s.title && <div className="rd-sec-head"><h2>{s.title}</h2></div>}{s.blocks.map((b, k) => <Block b={b} key={k} />)}</section>)}</div>
                </div>
              : <Reader key={lesson.id + mode} resetKey={lesson.id} blocks={bodyBlocks} mode={mode} watermark={watermark}
                  onProgress={(n, total) => setSeenInfo({ n, total })} />
          )
      )}
    </>
  );

  const panelTabs = [
    { id: "notes", label: "Notes", show: true },
    { id: "transcript", label: "Transcript", show: hasTranscript },
    { id: "shop", label: "Shop", show: hasShop },
  ].filter((t) => t.show);
  const activePanel = panelTabs.some((t) => t.id === panelTab) ? panelTab : "notes";

  const panelBody = (id) => id === "transcript"
    ? <Transcript lines={video?.transcript || []} timeStore={timeStore} onSeek={seek} />
    : id === "shop"
      ? <Shop items={timed} onAdd={onAddProduct} onSeek={seek} hasVideo={!!video} added={added} />
      : <Notes notes={notes} hasVideo={!!video} timeStore={timeStore} canNote={ctx.source === "demo" || !!ctx.user}
          onNeedSignIn={() => say("Sign in to save notes.")}
          onAdd={async (t, body) => { const n = await addNote(ctx, lesson.id, t, body); setNotes((x) => [...x, n]); }}
          onDelete={async (id) => { await deleteNote(ctx, lesson.id, id); setNotes((x) => x.filter((n) => n.id !== id)); }}
          onSeek={seek} />;

  const currProps = { course, modules: ctx.modules, lessons, progress, currentId: lessonId, stateOf, onPick: go, pct, doneCount, certReady, certEnabled: course.certificate_enabled };

  return (
    <div className={"lx-root" + (isWide && courseOpen ? " course-open" : "") + (!isMobile && notesOpen ? " notes-open" : "")}>
      <div className="lx-top">
        <a className="lx-back" href="/academy/" aria-label="Back to the academy">← <span>Academy</span></a>
        <div className="lx-top-title">{course.title}</div>
        <div className="lx-top-right">
          {ctx.source === "demo" && <span className="lx-preview-tag" title="Showing sample content">Preview</span>}
          <div className="lx-ring" style={{ "--p": pct }} title={`${pct}% complete`}><b>{pct}</b></div>
          {!isWide && <button className="lx-iconbtn" onClick={() => setDrawer(true)}>Course</button>}
          <a className="lx-cart" href="/ecommerce/checkout" aria-label="Cart">🛒{cartCount > 0 && <i>{cartCount}</i>}</a>
        </div>
      </div>

      <div className="lx-grid">
        {isWide && courseOpen && (
          <aside className="lx-left">
            <div className="lx-sidehead">
              <span>Course outline</span>
              <button className="lx-panel-close" onClick={() => setCourseOpen(false)} aria-label="Hide course outline">Hide</button>
            </div>
            <Curriculum {...currProps} />
          </aside>
        )}

        <main className="lx-main">
          {isCert ? (
            certReady ? <Certificate course={course} onBack={() => (window.location.href = "/academy/")} />
              : <div className="lx-locked"><div className="lx-lock-ic">★</div><h2>Almost there</h2><p>Complete every lesson to unlock your course completion.</p></div>
          ) : lesson ? (
            <>
              {!isMobile && (!notesOpen || (isWide && !courseOpen)) && (
                <div className="lx-panel-toggles">
                  {isWide && !courseOpen && <button className="lx-iconbtn" onClick={() => setCourseOpen(true)}>Show course outline</button>}
                  {!notesOpen && <button className="lx-iconbtn" onClick={() => setNotesOpen(true)}>Show notes</button>}
                </div>
              )}
              {stageEl}
              {isMobile && lesson && (
            <div className="lx-tabs" role="tablist">
              {[{ id: "lesson", l: "Lesson" }, { id: "notes", l: "Notes" }, ...(hasTranscript ? [{ id: "transcript", l: "Transcript" }] : []), ...(hasShop ? [{ id: "shop", l: "Shop" }] : []), { id: "course", l: "Course" }].map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.l}</button>
              ))}
            </div>
          )}
              {(!isMobile || tab === "lesson") && lessonView}
              {isMobile && tab !== "lesson" && (
                <div className="lx-m-panel">
                  {tab === "course" ? <Curriculum {...currProps} /> : panelBody(tab)}
                </div>
              )}
            </>
          ) : <p className="lx-muted">This course has no published lessons yet.</p>}

          {lesson && !isCert && (
            <div className="lx-bar-wrap">
              <div className="lx-bar-row">
                <button className="lx-btn ghost" disabled={!prev} onClick={() => prev && go(prev.id)} aria-label="Previous lesson">←<span> Prev</span></button>
                <div className="lx-bar-mid">{mainBar}</div>
                <button className="lx-btn ghost" disabled={!next} onClick={() => next && go(next.id)} aria-label="Next lesson"><span>Next </span>→</button>
              </div>
            </div>
          )}
        </main>

        {!isMobile && notesOpen && lesson && !isCert && (
          <aside className="lx-right">
            <div className="lx-ptabs" role="tablist">
              {panelTabs.map((t) => <button key={t.id} role="tab" aria-selected={activePanel === t.id} className={activePanel === t.id ? "on" : ""} onClick={() => setPanelTab(t.id)}>{t.label}</button>)}
              <button className="lx-panel-close" onClick={() => setNotesOpen(false)} aria-label="Hide notes panel">Hide</button>
            </div>
            <div className="lx-pbody">{panelBody(activePanel)}</div>
          </aside>
        )}
      </div>

      {drawer && (
        <div className="lx-drawer-wrap" onClick={() => setDrawer(false)}>
          <div className="lx-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="lx-iconbtn lx-drawer-x" onClick={() => setDrawer(false)}>Close</button>
            <Curriculum {...currProps} />
          </div>
        </div>
      )}
      <div className={"lx-toast" + (toast ? " in" : "")} role="status">{toast}</div>
    </div>
  );
}
