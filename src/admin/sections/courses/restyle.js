// "Restyle for story mode": a deterministic clean-up that makes imported content read well as
// single-idea screens. It never invents or rewrites facts: it only tidies text, promotes
// "Tip:"-style paragraphs to callouts, and breaks long paragraphs at sentence boundaries.

import { estimateReadMinutes } from "./courseModel.js";

const MAX_STATEMENT = 230; // matches the story player's own splitter
const SPLIT_ABOVE = 260;

const CALLOUT_RE = /^(pro tip|tip|common mistake|mistake|warning|important|remember|key point|key|note)\s*[:—–-]\s+(.+)$/i;
const TONE = {
  "pro tip": "tip", tip: "tip",
  "common mistake": "mistake", mistake: "mistake", warning: "mistake", important: "key",
  remember: "key", "key point": "key", key: "key", note: "note",
};

export function stripHtml(s) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ ​]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** **bold** and *italic* must open and close inside the same chunk, or the player shows stray asterisks. */
function balanced(s) {
  const bold = (s.match(/\*\*/g) || []).length;
  const single = (s.replace(/\*\*/g, "").match(/\*/g) || []).length;
  return bold % 2 === 0 && single % 2 === 0;
}

export function splitStatement(text) {
  const t = text.trim();
  if (t.length <= SPLIT_ABOVE) return [t];
  const sentences = t.match(/[^.!?]+[.!?]+["')\]”’]*\s*|[^.!?]+$/g) || [t];
  const out = [];
  let cur = "";
  sentences.forEach((s) => {
    if (cur && (cur + s).length > MAX_STATEMENT && balanced(cur)) {
      out.push(cur.trim());
      cur = s;
    } else cur += s;
  });
  if (cur.trim()) out.push(cur.trim());
  return out.length && out.every(balanced) ? out : [t];
}

export function restyleBlocks(blocks = []) {
  const stats = { split: 0, callouts: 0, removed: 0, cleaned: 0 };
  const out = [];

  const tidy = (v) => {
    const c = stripHtml(v);
    if (c !== v) stats.cleaned += 1;
    return c;
  };

  blocks.forEach((raw) => {
    const b = { ...raw };
    switch (b.type) {
      case "heading": {
        b.text = tidy(b.text);
        if (!b.text) { stats.removed += 1; return; }
        out.push(b);
        break;
      }
      case "text": {
        const text = tidy(b.text);
        if (!text) { stats.removed += 1; return; }
        const m = text.match(CALLOUT_RE);
        if (m) {
          out.push({ type: "callout", tone: TONE[m[1].toLowerCase()], text: m[2].trim() });
          stats.callouts += 1;
          return;
        }
        const parts = splitStatement(text);
        if (parts.length > 1) stats.split += parts.length - 1;
        parts.forEach((p) => out.push({ type: "text", text: p }));
        break;
      }
      case "list": {
        const items = (b.items || []).map(tidy).filter(Boolean);
        if (!items.length) { stats.removed += 1; return; }
        out.push({ ...b, items });
        break;
      }
      case "steps": {
        const items = (b.items || [])
          .map((s) => {
            const o = { title: tidy(s.title) };
            if (s.text != null) o.text = tidy(s.text);
            return o;
          })
          .filter((s) => s.title || s.text);
        if (!items.length) { stats.removed += 1; return; }
        out.push({ ...b, items });
        break;
      }
      case "callout": {
        const next = { ...b, text: tidy(b.text) };
        if (b.title) next.title = tidy(b.title);
        out.push(next);
        break;
      }
      case "quote": {
        const next = { ...b, text: tidy(b.text) };
        if (b.by) next.by = tidy(b.by);
        out.push(next);
        break;
      }
      default:
        out.push(b);
    }
  });
  return { blocks: out, stats };
}

/** Applies restyleBlocks to every story (reading) lesson of an imported course. */
export function restyleCourse(course) {
  const total = { split: 0, callouts: 0, removed: 0, cleaned: 0 };
  const modules = course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      if (l.kind !== "reading") return l;
      const { blocks, stats } = restyleBlocks(l.blocks);
      Object.keys(total).forEach((k) => (total[k] += stats[k]));
      return { ...l, blocks, read_minutes: estimateReadMinutes(blocks) };
    }),
  }));
  return { course: { ...course, modules }, stats: total };
}
