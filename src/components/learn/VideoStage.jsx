import { useEffect, useRef, useState, useCallback } from "react";
import { fmtTime, useStoreValue, watermarkUrl } from "./util.js";

const RATES = [0.75, 1, 1.25, 1.5, 2];
let ytPromise;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytPromise;
}

const Icon = {
  play: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>,
  pause: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>,
  back: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /><text x="12" y="15.5" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="700">10</text></svg>,
  fwd: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v4h-4" /><text x="12" y="15.5" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="700">10</text></svg>,
  full: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  up: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 14l5-5 5 5" /></svg>,
};

export default function VideoStage({ video, startAt = 0, timeStore, apiRef, onSave, onNearEnd, timed = [], onAdd, watermark, title }) {
  const wrapRef = useRef(null);
  const boxRef = useRef(null);
  const mediaRef = useRef(null);
  const ytHostRef = useRef(null);
  const adapter = useRef(null);
  const hideTimer = useRef(null);
  const nearFired = useRef(false);
  const lastSave = useRef(0);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [dur, setDur] = useState(video?.duration || 0);
  const [rate, setRate] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [controls, setControls] = useState(true);
  const [mini, setMini] = useState(false);
  const [dismissed, setDismissed] = useState({});
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const time = useStoreValue(timeStore);

  // ---------- adapter lifecycle ----------
  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    let hls, poll;
    nearFired.current = false;
    setReady(false); setPlaying(false); setStarted(false); setDismissed({}); setFailed(false);
    timeStore.set(startAt || 0);

    const handleTime = (t, d) => {
      timeStore.set(t);
      if (d && d !== dur) setDur(d);
      const now = Date.now();
      if (now - lastSave.current > 5000) { lastSave.current = now; onSave?.(t, d); }
      if (!nearFired.current && d && t / d >= 0.9) { nearFired.current = true; onNearEnd?.(); }
    };

    if (video.provider === "youtube") {
      loadYT().then((YT) => {
        if (cancelled || !ytHostRef.current) return;
        const player = new YT.Player(ytHostRef.current, {
          videoId: video.id,
          playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, fs: 0, iv_load_policy: 3, start: Math.floor(startAt || 0) },
          events: {
            onReady: () => { if (cancelled) return; setDur(player.getDuration() || video.duration || 0); setReady(true); },
            onStateChange: (e) => {
              const st = e.data;
              setPlaying(st === 1);
              if (st === 1) setStarted(true);
              if (st === 0) onNearEnd?.();
            },
          },
        });
        poll = setInterval(() => {
          if (player.getCurrentTime && player.getPlayerState?.() === 1) handleTime(player.getCurrentTime(), player.getDuration());
        }, 250);
        adapter.current = {
          play: () => player.playVideo(), pause: () => player.pauseVideo(),
          seek: (t) => { player.seekTo(t, true); timeStore.set(t); },
          setRate: (r) => player.setPlaybackRate(r),
          isPlaying: () => player.getPlayerState() === 1,
          destroy: () => player.destroy(),
        };
      });
    } else {
      const v = mediaRef.current;
      if (!v) return;
      const src = video.src;
      const isHls = /\.m3u8(\?|$)/.test(src);
      const attach = async () => {
        if (isHls && !v.canPlayType("application/vnd.apple.mpegurl")) {
          const { default: Hls } = await import("hls.js");
          if (cancelled) return;
          if (Hls.isSupported()) { hls = new Hls(); hls.loadSource(src); hls.attachMedia(v); return; }
        }
        v.src = src;
      };
      attach();
      const onMeta = () => { setDur(v.duration || video.duration || 0); setReady(true); if (startAt > 1) v.currentTime = startAt; };
      const onTimeUpdate = () => handleTime(v.currentTime, v.duration);
      const onPlay = () => { setPlaying(true); setStarted(true); };
      const onPause = () => { setPlaying(false); onSave?.(v.currentTime, v.duration); };
      const onEnd = () => { setPlaying(false); onNearEnd?.(); };
      v.addEventListener("loadedmetadata", onMeta);
      v.addEventListener("timeupdate", onTimeUpdate);
      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("ended", onEnd);
      const onErr = () => setFailed(true);
      v.addEventListener("error", onErr);
      adapter.current = {
        play: () => v.play().catch(() => {}), pause: () => v.pause(),
        seek: (t) => { v.currentTime = t; timeStore.set(t); },
        setRate: (r) => { v.playbackRate = r; },
        isPlaying: () => !v.paused,
        destroy: () => {
          v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("timeupdate", onTimeUpdate);
          v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); v.removeEventListener("ended", onEnd); v.removeEventListener("error", onErr);
          hls?.destroy(); v.removeAttribute("src"); v.load();
        },
      };
    }
    return () => {
      cancelled = true; clearInterval(poll);
      const a = adapter.current;
      try { onSave?.(timeStore.get(), dur); } catch { /* ignore */ }
      a?.destroy?.(); adapter.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.src, video?.id, video?.provider, attempt]);

  // expose imperative API to the page (seek from transcript, notes, products)
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      seek: (t) => { adapter.current?.seek(t); adapter.current?.play(); setStarted(true); },
      toggle: () => (adapter.current?.isPlaying() ? adapter.current.pause() : adapter.current?.play()),
      now: () => timeStore.get(),
    };
    return () => { apiRef.current = null; };
  }, [apiRef, timeStore]);

  const toggle = useCallback(() => (adapter.current?.isPlaying() ? adapter.current.pause() : adapter.current?.play()), []);
  const skip = useCallback((d) => adapter.current?.seek(Math.max(0, Math.min((dur || 1e9), timeStore.get() + d))), [dur, timeStore]);
  const fullscreen = useCallback(() => {
    const box = boxRef.current;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (box?.requestFullscreen) box.requestFullscreen();
    else mediaRef.current?.webkitEnterFullscreen?.();
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (["input", "textarea", "select", "button"].includes(tag) || document.activeElement?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") { e.preventDefault(); toggle(); }
      else if (k === "arrowleft") skip(-5);
      else if (k === "arrowright") skip(5);
      else if (k === "j") skip(-10);
      else if (k === "l") skip(10);
      else if (k === "f") fullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip, fullscreen]);

  // mini player once the video scrolls out of view (tablet/desktop only; phones use a sticky stage)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const wide = window.matchMedia("(min-width: 700px)").matches;
      setMini(wide && !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // auto-hide controls while playing
  const poke = () => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 2600);
  };
  useEffect(() => { if (!playing) { clearTimeout(hideTimer.current); setControls(true); } else poke(); }, [playing]); // eslint-disable-line

  const chapters = video?.chapters || [];
  const chapter = [...chapters].reverse().find((c) => time >= c.t);
  const activeProduct = timed.find((p) => time >= p.t && time < p.t + 12 && !dismissed[p.slug + p.t]);
  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;
  const showMini = mini && started;
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const onSurface = () => {
    if (isTouch && !controls) { poke(); return; }
    toggle(); poke();
  };

  if (!video) return null;
  return (
    <div className="lx-stage-wrap">
      <div className="lx-stage-slot" ref={wrapRef}>
      <div className={"lx-stage" + (showMini ? " is-mini" : "") + (controls ? " show-controls" : "")} ref={boxRef}
           onMouseMove={poke} onContextMenu={(e) => e.preventDefault()}>
        {video.provider === "youtube" ? (
          <div className="lx-yt"><div ref={ytHostRef} /></div>
        ) : (
          <video ref={mediaRef} playsInline preload="metadata" poster={video.poster || undefined}
                 controlsList="nodownload noremoteplayback" disablePictureInPicture disableRemotePlayback
                 onContextMenu={(e) => e.preventDefault()} />
        )}
        <div className="lx-wm lx-wm-video" aria-hidden style={{ backgroundImage: watermarkUrl(watermark) }} />

        {/* click/tap surface */}
        <button className="lx-surface" aria-label={playing ? "Pause" : "Play"} onClick={onSurface} />

        {failed && (
          <div className="lx-vfail" role="alert">
            <p>This video couldn't be loaded. Check your connection and try again.</p>
            <button className="lx-btn dark sm" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          </div>
        )}

        {!started && !failed && (
          <button className="lx-bigplay" onClick={() => { adapter.current?.play(); setStarted(true); }} aria-label="Play lesson">
            <span>{Icon.play}</span>
            <em>{ready ? "Play lesson" : "Loading…"}</em>
          </button>
        )}

        {activeProduct && (
          <div className="lx-prodpop" role="status">
            <div className="lx-prodpop-img">{activeProduct.product.image ? <img src={activeProduct.product.image} alt="" /> : <span>✦</span>}</div>
            <div className="lx-prodpop-body">
              <small>{activeProduct.note || "Used in this lesson"}</small>
              <strong>{activeProduct.product.name}</strong>
              <span>Ksh {Number(activeProduct.product.price).toLocaleString()}</span>
            </div>
            <button className="lx-prodpop-add" onClick={() => onAdd?.(activeProduct.product)}>+ Add</button>
            <button className="lx-prodpop-x" aria-label="Dismiss" onClick={() => setDismissed((d) => ({ ...d, [activeProduct.slug + activeProduct.t]: true }))}>{Icon.close}</button>
          </div>
        )}

        {showMini ? (
          <div className="lx-minibar">
            <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? Icon.pause : Icon.play}</button>
            <span>{title}</span>
            <button onClick={() => wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} aria-label="Back to video">{Icon.up}</button>
            <button onClick={() => { adapter.current?.pause(); setStarted(false); setMini(false); }} aria-label="Close mini player">{Icon.close}</button>
          </div>
        ) : (
          <div className="lx-controls">
            <div className="lx-scrub">
              <div className="lx-scrub-track">
                <div className="lx-scrub-fill" style={{ width: pct + "%" }} />
                {dur > 0 && chapters.slice(1).map((c) => <i key={c.t} className="lx-tick" style={{ left: (c.t / dur) * 100 + "%" }} />)}
              </div>
              <input type="range" min="0" max={dur || 0} step="0.5" value={Math.min(time, dur || 0)}
                     aria-label="Seek" onChange={(e) => adapter.current?.seek(Number(e.target.value))} />
            </div>
            <div className="lx-ctrl-row">
              <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? Icon.pause : Icon.play}</button>
              <button onClick={() => skip(-10)} aria-label="Back 10 seconds">{Icon.back}</button>
              <button onClick={() => skip(10)} aria-label="Forward 10 seconds">{Icon.fwd}</button>
              <span className="lx-time">{fmtTime(time)} / {fmtTime(dur)}</span>
              {chapter && <span className="lx-chap">{chapter.title}</span>}
              <span className="lx-grow" />
              <div className="lx-rate">
                <button onClick={() => setRateOpen((o) => !o)} aria-label="Playback speed">{rate}×</button>
                {rateOpen && (
                  <div className="lx-rate-menu">
                    {RATES.map((r) => (
                      <button key={r} className={r === rate ? "on" : ""} onClick={() => { setRate(r); adapter.current?.setRate(r); setRateOpen(false); }}>{r}×</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={fullscreen} aria-label="Fullscreen">{Icon.full}</button>
            </div>
          </div>
        )}
      </div>
      </div>

      {chapters.length > 1 && (
        <div className="lx-chapters" role="list" aria-label="Chapters">
          {chapters.map((c, i) => {
            const next = chapters[i + 1];
            const on = time >= c.t && (!next || time < next.t);
            return (
              <button key={c.t} role="listitem" className={"lx-chip" + (on ? " on" : "")}
                      onClick={() => apiRef?.current?.seek(c.t)}>
                <b>{fmtTime(c.t)}</b> {c.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
