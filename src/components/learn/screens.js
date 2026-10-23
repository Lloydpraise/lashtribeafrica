// Splits a reading lesson into the single-idea screens of the story view. It lives outside
// Story.jsx so the article view can map its scroll position onto the same screen numbers.
import { groupSections } from "./Reader.jsx";

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
