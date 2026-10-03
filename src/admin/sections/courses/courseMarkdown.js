// A small Markdown dialect for writing story courses by hand (or with an AI) and importing them.
// The same dialect powers the "Quick write" tab of the lesson editor and the Markdown export,
// so a lesson can go editor -> text -> editor without losing anything.
//
// Course file                              Lesson body (also usable in Quick write)
//   # Course title                          ## Chapter heading
//   subtitle: ...                           A paragraph becomes one statement screen.
//   type: story | video                     - bullets      1. numbered      - [ ] checklist
//   price: 4500   (or: free: true)          steps:
//   hero: https://...                       1. Step title :: What to do
//   ## Module title                         > Tip: text      > Mistake: text     > Remember: text
//   ### Lesson title                        > Tip [Custom title]: text
//   kind: reading | video | quiz            > A quote. — Someone
//   video: https://youtu.be/...             ![Caption](https://image-url)
//   #### Chapter heading                    ?? Quick check question
//                                           - Option A
//                                           - *Correct option
//                                           = Explanation shown after answering
//                                           flip[Myth or fact?]: Front text || Back text
//                                           compare[Do|Don't]: Title
//                                           + a do item
//                                           - a don't item
//                                           ---

const TONE_BY_WORD = {
  tip: "tip", "pro tip": "tip",
  mistake: "mistake", warning: "mistake", avoid: "mistake",
  remember: "key", key: "key",
  note: "note", info: "note",
};
const WORD_BY_TONE = { tip: "Tip", mistake: "Mistake", key: "Remember", note: "Note" };

const COURSE_KEYS = ["slug", "subtitle", "description", "level", "type", "price", "compare_price", "free", "sequential", "certificate", "bonus_points", "hero"];
const LESSON_KEYS = ["kind", "summary", "preview", "video", "duration", "read_minutes", "poster", "pass"];

const isTrue = (v) => /^(true|yes|1|on)$/i.test(String(v).trim());
const clean = (s) => String(s).replace(/\s+/g, " ").trim();

const RE = {
  heading: /^#{1,6}\s+(.*)$/,
  divider: /^(-{3,}|\*{3,}|_{3,})$/,
  figure: /^!\[(.*?)\]\((\S+?)\)\s*$/,
  steps: /^steps(?:\[(\d+)\s*\/\s*(\d+)\])?\s*:\s*$/i,
  compare: /^compare(?:\[(.*?)\])?\s*:\s*(.*)$/i,
  flip: /^flip(?:\[(.*?)\])?\s*:\s*(.+?)\s*\|\|\s*(.+)$/i,
  question: /^\?\?\s*(.+)$/,
  quote: /^>\s?(.*)$/,
  bullet: /^[-*]\s+(.*)$/,
  numbered: /^\d+[.)]\s+(.*)$/,
  pass: /^pass\s*:\s*(\d+)\s*%?\s*$/i,
};

function startsSpecial(t) {
  return (
    RE.heading.test(t) || RE.divider.test(t) || RE.figure.test(t) || RE.steps.test(t) || RE.compare.test(t) ||
    RE.flip.test(t) || RE.question.test(t) || RE.quote.test(t) || RE.bullet.test(t) || RE.numbered.test(t) || RE.pass.test(t)
  );
}

// ---------------------------------------------------------------------
// body -> blocks
// ---------------------------------------------------------------------
export function parseBody(text, { quiz = false } = {}) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  const warnings = [];
  let passScore = null;
  let i = 0;

  const peek = () => (i < lines.length ? lines[i].trim() : null);

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }

    let m;
    if ((m = t.match(RE.pass))) { passScore = Number(m[1]); i++; continue; }
    if ((m = t.match(RE.heading))) { blocks.push({ type: "heading", text: clean(m[1]) }); i++; continue; }
    if (RE.divider.test(t)) { blocks.push({ type: "divider" }); i++; continue; }
    if ((m = t.match(RE.figure))) { blocks.push({ type: "figure", url: m[2], caption: clean(m[1]) }); i++; continue; }

    if ((m = t.match(RE.steps))) {
      i++;
      const items = [];
      while (i < lines.length && RE.numbered.test(peek() || "")) {
        const body = peek().match(RE.numbered)[1];
        const [title, ...rest] = body.split("::");
        items.push({ title: clean(title), text: clean(rest.join("::")) });
        i++;
      }
      if (items.length) {
        const b = { type: "steps", items };
        // "steps[5/18]:" = this block shows steps 5.. of 18 (long sequences are split across blocks)
        if (m[1]) { b.start = Number(m[1]); b.of = Number(m[2]); }
        blocks.push(b);
      } else warnings.push("A “steps:” line had no numbered steps under it.");
      continue;
    }

    if ((m = t.match(RE.compare))) {
      i++;
      const b = { type: "compare", title: clean(m[2] || ""), do: [], dont: [] };
      if (m[1]) {
        const [d, n] = m[1].split("|").map(clean);
        if (d && d !== "Do") b.doLabel = d;
        if (n && n !== "Don't") b.dontLabel = n;
      }
      while (i < lines.length && /^[+-]\s+/.test(peek() || "")) {
        const row = peek();
        (row.startsWith("+") ? b.do : b.dont).push(clean(row.slice(1)));
        i++;
      }
      blocks.push(b);
      continue;
    }

    if ((m = t.match(RE.flip))) {
      const [prompt, frontLabel, backLabel] = (m[1] || "").split("|").map(clean);
      const b = { type: "flip", prompt: prompt || "Tap the card", front: clean(m[2]), back: clean(m[3]) };
      if (frontLabel) b.frontLabel = frontLabel;
      if (backLabel) b.backLabel = backLabel;
      blocks.push(b);
      i++;
      continue;
    }

    if ((m = t.match(RE.question))) {
      i++;
      const q = { question: clean(m[1]), options: [], answer: -1, explain: "" };
      while (i < lines.length && peek()) {
        const row = peek();
        if (row.startsWith("=")) q.explain = clean(row.slice(1));
        else if (/^explain\s*:/i.test(row)) q.explain = clean(row.replace(/^explain\s*:/i, ""));
        else if (RE.bullet.test(row)) {
          let opt = row.match(RE.bullet)[1].trim();
          // a single leading * marks the correct option ("**bold**" at the start is just bold text)
          if (/^\*(?!\*)/.test(opt)) {
            q.answer = q.options.length;
            opt = opt.replace(/^\*\s*/, "");
          }
          q.options.push(clean(opt));
        } else break;
        i++;
      }
      if (q.options.length < 2) warnings.push(`Question “${q.question.slice(0, 40)}” needs at least two “- option” lines.`);
      if (q.answer < 0) { warnings.push(`Question “${q.question.slice(0, 40)}” has no correct answer marked with *. The first option was used.`); q.answer = 0; }
      blocks.push({ type: "checkpoint", ...q });
      continue;
    }

    if (RE.quote.test(t)) {
      const parts = [];
      while (i < lines.length && RE.quote.test(peek() || "")) { parts.push(peek().match(RE.quote)[1]); i++; }
      blocks.push(quoteOrCallout(clean(parts.join(" "))));
      continue;
    }

    if (RE.bullet.test(t) || RE.numbered.test(t)) {
      const numbered = RE.numbered.test(t);
      const re = numbered ? RE.numbered : RE.bullet;
      const items = [];
      while (i < lines.length && re.test(peek() || "")) { items.push(peek().match(re)[1].trim()); i++; }
      const check = !numbered && items.every((x) => /^\[[ xX]\]\s*/.test(x));
      blocks.push({
        type: "list",
        style: numbered ? "numbered" : check ? "checklist" : "bullets",
        items: items.map((x) => clean(check ? x.replace(/^\[[ xX]\]\s*/, "") : x)),
      });
      continue;
    }

    // paragraph: consecutive plain lines
    const para = [];
    while (i < lines.length && peek() && (para.length === 0 || !startsSpecial(peek()))) {
      para.push(peek().replace(/^\\/, ""));
      i++;
    }
    blocks.push({ type: "text", text: clean(para.join(" ")) });
  }

  if (quiz) {
    const questions = blocks
      .filter((b) => b.type === "checkpoint")
      .map((b) => ({ q: b.question, options: b.options, answer: b.answer, explain: b.explain }));
    const rest = blocks.filter((b) => b.type !== "checkpoint");
    if (rest.length) warnings.push("Only “??” questions are used in a quiz lesson. Other content was ignored.");
    return { blocks: [{ type: "quiz", passScore: passScore ?? 70, questions }], warnings };
  }
  return { blocks, warnings };
}

function quoteOrCallout(text) {
  const m = text.match(/^(tip|pro tip|mistake|warning|avoid|remember|key|note|info)(?:\s*\[(.*?)\])?\s*:\s*(.+)$/i);
  if (m) {
    const b = { type: "callout", tone: TONE_BY_WORD[m[1].toLowerCase()], text: m[3].trim() };
    if (m[2]) b.title = m[2].trim();
    return b;
  }
  const by = text.match(/^(.*\S)\s+(?:—|–|--)\s+(.+)$/);
  return by ? { type: "quote", text: by[1], by: by[2] } : { type: "quote", text };
}

// ---------------------------------------------------------------------
// blocks -> body
// ---------------------------------------------------------------------
export function blocksToMarkdown(blocks = [], { headingMark = "##" } = {}) {
  const out = [];
  const one = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();
  const esc = (s) => (startsSpecial(s) || /^\\/.test(s) ? "\\" + s : s);

  blocks.forEach((b) => {
    switch (b.type) {
      case "heading": out.push(`${headingMark} ${one(b.text)}`); break;
      case "text": out.push(esc(one(b.text))); break;
      case "list":
        out.push(
          (b.items || [])
            .map((it, k) => (b.style === "numbered" ? `${k + 1}. ${one(it)}` : b.style === "checklist" ? `- [ ] ${one(it)}` : `- ${one(it)}`))
            .join("\n")
        );
        break;
      case "steps": {
        const first = b.start || 1;
        const head = b.start || b.of ? `steps[${first}/${b.of || first - 1 + (b.items || []).length}]:` : "steps:";
        out.push(
          head + "\n" +
            (b.items || []).map((s, k) => `${first + k}. ${one(s.title)}${s.text ? ` :: ${one(s.text)}` : ""}`).join("\n")
        );
        break;
      }
      case "callout": {
        const word = WORD_BY_TONE[b.tone] || "Note";
        out.push(`> ${word}${b.title ? ` [${one(b.title)}]` : ""}: ${one(b.text)}`);
        break;
      }
      case "quote": out.push(`> ${one(b.text)}${b.by ? ` — ${one(b.by)}` : ""}`); break;
      case "figure": out.push(`![${one(b.caption)}](${b.url || ""})`); break;
      case "checkpoint":
        out.push(questionLines(b.question, b.options, b.answer, b.explain, one));
        break;
      case "quiz":
        out.push(`pass: ${b.passScore ?? 70}`);
        (b.questions || []).forEach((q) => out.push(questionLines(q.q, q.options, q.answer, q.explain, one)));
        break;
      case "flip": {
        const head = [b.prompt, b.frontLabel, b.backLabel];
        while (head.length && !head[head.length - 1]) head.pop();
        out.push(`flip${head.length ? `[${head.map((h) => one(h || "")).join("|")}]` : ""}: ${one(b.front)} || ${one(b.back)}`);
        break;
      }
      case "compare": {
        const labels = b.doLabel || b.dontLabel ? `[${one(b.doLabel || "Do")}|${one(b.dontLabel || "Don't")}]` : "";
        out.push(
          `compare${labels}: ${one(b.title)}\n` +
            [...(b.do || []).map((x) => `+ ${one(x)}`), ...(b.dont || []).map((x) => `- ${one(x)}`)].join("\n")
        );
        break;
      }
      case "divider": out.push("---"); break;
      default: break;
    }
  });
  return out.join("\n\n") + (out.length ? "\n" : "");
}

function questionLines(question, options = [], answer = 0, explain = "", one) {
  return [
    `?? ${one(question)}`,
    ...options.map((o, k) => `- ${k === answer ? "*" : ""}${one(o)}`),
    ...(explain ? [`= ${one(explain)}`] : []),
  ].join("\n");
}

// ---------------------------------------------------------------------
// course file -> portable course object
// ---------------------------------------------------------------------
export function parseCourseMarkdown(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const warnings = [];
  const course = { title: "", modules: [] };
  let mod = null;
  let lesson = null;
  let buf = [];
  let seenTitle = false;
  let inMeta = true; // course-level key: value lines, until the first module/lesson

  const kindOf = (l) => {
    const k = String(l.meta.kind || "").toLowerCase();
    if (/^(quiz|assessment|test)$/.test(k)) return "assessment";
    if (k === "video" || l.meta.video) return "video";
    return "reading";
  };

  const finishLesson = () => {
    if (!lesson) return;
    const kind = kindOf(lesson);
    const parsed = parseBody(buf.join("\n"), { quiz: kind === "assessment" });
    parsed.warnings.forEach((w) => warnings.push(`${lesson.title}: ${w}`));
    const o = { title: lesson.title, kind, summary: lesson.meta.summary || "", blocks: parsed.blocks };
    if (lesson.meta.preview != null) o.is_preview = isTrue(lesson.meta.preview);
    if (lesson.meta.read_minutes) o.read_minutes = Number(lesson.meta.read_minutes) || undefined;
    if (kind === "video") {
      o.video = lesson.meta.video ? { link: lesson.meta.video } : null;
      if (o.video && lesson.meta.duration) o.video.duration = lesson.meta.duration;
      if (o.video && lesson.meta.poster) o.video.poster = lesson.meta.poster;
    }
    if (kind === "assessment" && lesson.meta.pass && o.blocks[0]) o.blocks[0].passScore = Number(lesson.meta.pass) || 70;
    mod.lessons.push(o);
    lesson = null;
    buf = [];
  };

  const ensureModule = (title = "Lessons") => {
    if (!mod) { mod = { title, lessons: [] }; course.modules.push(mod); }
  };

  const flushLoose = () => {
    // text sitting under a module heading before any lesson
    if (!lesson && mod && buf.some((x) => x.trim())) {
      lesson = { title: "Introduction", meta: {} };
      finishLesson();
    }
    buf = [];
  };

  let metaOpen = false; // lesson-level metadata lines directly after "### Title"

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    let m;

    if ((m = t.match(/^#\s+(.*)$/)) && !seenTitle && !mod) { course.title = clean(m[1]); seenTitle = true; continue; }

    if ((m = t.match(/^##\s+(.*)$/))) {
      finishLesson();
      if (!mod && buf.some((x) => x.trim())) warnings.push("Text before the first “## Module” heading was ignored.");
      else flushLoose();
      buf = [];
      inMeta = false; metaOpen = false;
      mod = { title: clean(m[1]), lessons: [] };
      course.modules.push(mod);
      continue;
    }
    if ((m = t.match(/^###\s+(.*)$/))) {
      finishLesson();
      inMeta = false;
      ensureModule();
      flushLoose();
      lesson = { title: clean(m[1]), meta: {} };
      metaOpen = true;
      continue;
    }

    if (inMeta && !mod) {
      const km = t.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (km && COURSE_KEYS.includes(km[1].toLowerCase())) { course[km[1].toLowerCase()] = km[2].trim(); continue; }
      if (t) { // free text before any module: keep it as the start of an intro lesson
        buf.push(line);
        continue;
      }
      continue;
    }

    if (lesson && metaOpen) {
      const km = t.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (km && LESSON_KEYS.includes(km[1].toLowerCase())) { lesson.meta[km[1].toLowerCase()] = km[2].trim(); continue; }
      metaOpen = false; // the first blank or non-meta line ends the metadata block
      if (!t) continue;
    }
    buf.push(line);
  }
  finishLesson();
  if (!lesson && mod == null && buf.some((x) => x.trim())) {
    // a plain document with no ## / ### structure: one lesson
    ensureModule("Lessons");
    lesson = { title: course.title || "Imported lesson", meta: {} };
  }
  if (lesson) finishLesson(); else if (mod) flushLoose();

  // convert collected meta to the portable shape
  const c = {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    level: course.level,
    course_type: String(course.type || "").toLowerCase() === "video" ? "video" : "story",
    hero_url: course.hero,
    sequential: course.sequential != null ? isTrue(course.sequential) : false,
    certificate_enabled: course.certificate != null ? isTrue(course.certificate) : true,
    bonus_points: Number(course.bonus_points) || 0,
    modules: course.modules.filter((x) => x.lessons.length),
  };
  const price = Number(String(course.price ?? "").replace(/[^\d.]/g, ""));
  if (course.free != null) c.is_free = isTrue(course.free);
  if (price > 0 && !(course.free != null && isTrue(course.free))) { c.price = price; c.is_free = false; }
  if (course.compare_price) c.compare_price = Number(String(course.compare_price).replace(/[^\d.]/g, "")) || null;
  if (!c.modules.length) warnings.push("No lessons were found. Use “## Module” and “### Lesson” headings.");
  return { course: c, warnings };
}

// ---------------------------------------------------------------------
// portable course object -> course file
// ---------------------------------------------------------------------
export function courseToMarkdown(c) {
  const out = [`# ${c.title || "Untitled course"}`];
  const meta = [
    ["slug", c.slug], ["subtitle", c.subtitle], ["description", c.description], ["level", c.level],
    ["type", c.course_type], ["free", c.is_free ? "true" : ""], ["price", !c.is_free && c.price ? c.price : ""],
    ["compare_price", c.compare_price], ["sequential", c.sequential ? "true" : ""],
    ["certificate", c.certificate_enabled === false ? "false" : ""], ["bonus_points", c.bonus_points || ""],
    ["hero", c.hero_url],
  ];
  out.push(meta.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}: ${String(v).replace(/\s*\n\s*/g, " ")}`).join("\n"));
  (c.modules || []).forEach((m) => {
    out.push(`## ${m.title}`);
    (m.lessons || []).forEach((l) => {
      const lm = [["kind", l.kind === "assessment" ? "quiz" : l.kind], ["summary", l.summary], ["preview", l.is_preview ? "true" : ""]];
      if (l.kind === "reading" && l.read_minutes) lm.push(["read_minutes", l.read_minutes]);
      if (l.video) {
        const link = l.video.provider === "youtube" ? `https://youtu.be/${l.video.id}` : l.video.src;
        lm.push(["video", link], ["duration", l.video.duration || ""]);
      }
      out.push(`### ${l.title}\n` + lm.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${k}: ${String(v).replace(/\s*\n\s*/g, " ")}`).join("\n"));
      const body = blocksToMarkdown(l.blocks || [], { headingMark: "####" }).trim();
      if (body) out.push(body);
    });
  });
  return out.join("\n\n") + "\n";
}
