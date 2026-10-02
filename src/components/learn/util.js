import { useEffect, useState, useSyncExternalStore, createElement, Fragment } from "react";

export const pad2 = (n) => String(n).padStart(2, "0");

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
}

export function fmtMinutes(seconds) {
  const m = Math.max(1, Math.round((seconds || 0) / 60));
  return `${m} min`;
}

export function useMedia(query) {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/** Tiny external store so the 4Hz playback clock re-renders only the components that read it. */
export function createTimeStore() {
  let t = 0;
  const subs = new Set();
  return {
    get: () => t,
    set(v) {
      if (v === t) return;
      t = v;
      subs.forEach((f) => f());
    },
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}
export function useStoreValue(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** **bold** and *italic* only. Returns React nodes, never raw HTML. */
export function inline(text = "") {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**")) return createElement("strong", { key: i }, p.slice(2, -2));
    if (p.startsWith("*")) return createElement("em", { key: i }, p.slice(1, -1));
    return createElement(Fragment, { key: i }, p);
  });
}

/** Faint repeating identity text. A deterrent against sharing screenshots, not real protection. */
export function watermarkUrl(text) {
  const safe = String(text || "Lashtribe Academy").replace(/[<>&"']/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">` +
    `<text x="50%" y="50%" text-anchor="middle" transform="rotate(-24 160 100)" ` +
    `font-family="Montserrat, Arial, sans-serif" font-size="14" font-weight="600" fill="#000">${safe}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export function burstConfetti(count = 36) {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#E8B4BC", "#C9707F", "#111", "#F5E6E8", "#B98A4B"];
  const layer = document.createElement("div");
  layer.className = "lx-confetti";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.style.left = 10 + Math.random() * 80 + "%";
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.25 + "s";
    s.style.setProperty("--dx", (Math.random() * 2 - 1) * 160 + "px");
    s.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2200);
}

export function art(draw, bg = "#F3E4E7") {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="${bg}"/>` +
    `<g fill="none" stroke="#C9707F" stroke-width="3" stroke-linecap="round">${draw}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
