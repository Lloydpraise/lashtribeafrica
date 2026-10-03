// Shared helpers for the admin course builder: blank objects, video-link parsing, and the
// translation between the editor's in-memory course and (a) the database rows, (b) the
// portable "lashtribe-course" JSON file that import/export and scripts/course-to-sql.mjs use.

export const COURSE_FORMAT = "lashtribe-course@1";

export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : fallbackUuid());

function fallbackUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const STATUSES = ["draft", "published", "archived"];
export const LESSON_KINDS = [
  { value: "reading", label: "Story / reading" },
  { value: "video", label: "Video" },
  { value: "assessment", label: "Quiz" },
];

export const formatKsh = (n) => `Ksh ${Number(n || 0).toLocaleString()}`;

// ---------------------------------------------------------------------
// blanks
// ---------------------------------------------------------------------
export function newLesson(kind = "reading") {
  return {
    id: uid(),
    title: "",
    kind,
    summary: "",
    is_preview: false,
    status: "published",
    read_minutes: kind === "reading" ? 3 : 0,
    duration_seconds: 0,
    video: null,
    blocks: kind === "assessment" ? [newBlock("quiz")] : [],
  };
}

export function newModule(title = "", defaultKind = "reading") {
  return { id: uid(), title, lessons: [newLesson(defaultKind)] };
}

export function newCourse(type = "story") {
  return {
    id: uid(),
    isNew: true,
    slug: "",
    title: "",
    subtitle: "",
    description: "",
    level: "beginner",
    course_type: type,
    is_free: false,
    price: 0,
    compare_price: "",
    cover_url: "",
    hero_path: "",
    sequential: false,
    certificate_enabled: true,
    bonus_points: 0,
    status: "draft",
    sort_order: 0,
    modules: [newModule("Module 1", type === "video" ? "video" : "reading")],
  };
}

export function newBlock(type) {
  switch (type) {
    case "heading": return { type, text: "" };
    case "text": return { type, text: "" };
    case "list": return { type, style: "bullets", items: [""] };
    case "steps": return { type, items: [{ title: "", text: "" }, { title: "", text: "" }] };
    case "callout": return { type, tone: "tip", title: "", text: "" };
    case "quote": return { type, text: "", by: "" };
    case "figure": return { type, url: "", caption: "" };
    case "checkpoint": return { type, question: "", options: ["", "", ""], answer: 0, explain: "" };
    case "flip": return { type, prompt: "Myth or fact?", front: "", back: "" };
    case "compare": return { type, title: "", do: [""], dont: [""] };
    case "divider": return { type };
    case "quiz": return { type, passScore: 70, questions: [newQuestion()] };
    default: return { type: "text", text: "" };
  }
}

export const newQuestion = () => ({ q: "", options: ["", "", ""], answer: 0, explain: "" });

export const BLOCK_LABELS = {
  heading: "Chapter heading",
  text: "Statement",
  list: "List",
  steps: "Steps",
  callout: "Callout",
  quote: "Quote",
  figure: "Image",
  checkpoint: "Quick check",
  flip: "Flip card",
  compare: "Do / Don't",
  divider: "Divider",
  quiz: "Quiz",
};

// ---------------------------------------------------------------------
// video links
// ---------------------------------------------------------------------
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Turns a pasted link into the `video` object the student player understands.
 * Returns { video } on success or { error } with a human message.
 * Supported: YouTube links, direct .mp4/.webm/.mov/.m4v files, and .m3u8 (HLS) streams.
 */
export function parseVideoLink(raw, previous = null) {
  const text = String(raw || "").trim();
  if (!text) return { video: null };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { error: "That doesn't look like a link. Paste a full URL starting with https://" };
  }
  if (!/^https?:$/.test(url.protocol)) return { error: "Only http(s) links are supported." };
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const keep = pickKept(previous);

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1] || "";
    else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
      id = m ? m[1] : "";
    }
    if (!YT_ID.test(id)) return { error: "Couldn't find a YouTube video id in that link." };
    return { video: { ...keep, provider: "youtube", id, src: undefined } };
  }
  if (/vimeo\.com$/.test(host) || host === "drive.google.com" || host === "loom.com" || host === "wistia.com") {
    return { error: "That host can't be played inside the course player. Use a YouTube link, a direct .mp4/.m3u8 link, or upload the video." };
  }
  const path = url.pathname.toLowerCase();
  if (/\.m3u8$/.test(path)) return { video: { ...keep, provider: "hls", src: text, id: undefined } };
  if (/\.(mp4|webm|mov|m4v)$/.test(path) || /\/storage\/v1\/object\//.test(path)) {
    return { video: { ...keep, provider: "file", src: text, id: undefined } };
  }
  return { error: "Unrecognised video link. Use a YouTube link or a direct link ending in .mp4, .webm or .m3u8." };
}

function pickKept(previous) {
  const out = {};
  if (!previous) return out;
  ["duration", "poster", "chapters", "transcript", "products", "path"].forEach((k) => {
    if (previous[k] != null) out[k] = previous[k];
  });
  return out;
}

export function videoLink(video) {
  if (!video) return "";
  if (video.provider === "youtube" && video.id) return `https://youtu.be/${video.id}`;
  return video.src || "";
}

export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** "12:30", "1:02:03" or plain seconds -> seconds. Returns null when unparseable. */
export function parseDuration(text) {
  const t = String(text ?? "").trim();
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(":").map((p) => p.trim());
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Lines like "0:00 Welcome" -> [{t, title}] (chapters) or [{t, text}] (transcript). */
export function parseTimedLines(text, key) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+(?::\d{1,2}){0,2})\s+(.+)$/);
      if (!m) return null;
      const t = parseDuration(m[1]);
      return t == null ? null : { t, [key]: m[2].trim() };
    })
    .filter(Boolean);
}

export function timedLinesToText(items, key) {
  return (items || []).map((i) => `${fmtDuration(i.t)} ${i[key] || ""}`).join("\n");
}

// ---------------------------------------------------------------------
// reading time
// ---------------------------------------------------------------------
export function estimateReadMinutes(blocks = []) {
  return Math.max(2, Math.round(blocks.length * 0.22));
}

// ---------------------------------------------------------------------
// database <-> editor
// ---------------------------------------------------------------------
const COURSE_FIELDS = [
  "id", "slug", "title", "subtitle", "description", "level", "course_type", "is_free", "price",
  "compare_price", "cover_url", "hero_path", "sequential", "certificate_enabled", "bonus_points",
  "status", "sort_order",
];

/** Rows from fetchCourseFull -> editor course. */
export function courseFromRows({ course, modules, lessons, content }) {
  const byLesson = new Map(content.map((c) => [c.lesson_id, c]));
  const mods = modules
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      id: m.id,
      title: m.title,
      lessons: lessons
        .filter((l) => l.module_id === m.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          id: l.id,
          title: l.title,
          kind: l.kind,
          summary: l.summary || "",
          is_preview: !!l.is_preview,
          status: l.status || "published",
          read_minutes: l.read_minutes || 0,
          duration_seconds: l.duration_seconds || 0,
          video: byLesson.get(l.id)?.video || null,
          blocks: byLesson.get(l.id)?.blocks || [],
        })),
    }));
  // lessons whose module was deleted (module_id null) are kept in a rescue module so nothing is lost
  const orphans = lessons.filter((l) => !l.module_id || !modules.some((m) => m.id === l.module_id));
  if (orphans.length) {
    mods.push({
      id: uid(),
      title: "Ungrouped lessons",
      lessons: orphans.map((l) => ({
        id: l.id, title: l.title, kind: l.kind, summary: l.summary || "", is_preview: !!l.is_preview,
        status: l.status || "published", read_minutes: l.read_minutes || 0, duration_seconds: l.duration_seconds || 0,
        video: byLesson.get(l.id)?.video || null, blocks: byLesson.get(l.id)?.blocks || [],
      })),
    });
  }
  return {
    ...Object.fromEntries(COURSE_FIELDS.map((k) => [k, course[k] ?? ""])),
    price: Number(course.price || 0),
    compare_price: course.compare_price == null ? "" : Number(course.compare_price),
    bonus_points: Number(course.bonus_points || 0),
    sort_order: Number(course.sort_order || 0),
    course_type: course.course_type || "story",
    modules: mods,
  };
}

/** Editor course -> payload for the admin_save_course() SQL function. */
export function toSavePayload(course) {
  const free = !!course.is_free;
  return {
    course: {
      id: course.id,
      slug: course.slug.trim(),
      title: course.title.trim(),
      subtitle: course.subtitle || "",
      description: course.description || "",
      level: course.level,
      course_type: course.course_type,
      is_free: free,
      price: free ? 0 : Number(course.price) || 0,
      compare_price: free || course.compare_price === "" || course.compare_price == null ? null : Number(course.compare_price),
      cover_url: course.cover_url || "",
      hero_path: course.hero_path || "",
      sequential: !!course.sequential,
      certificate_enabled: !!course.certificate_enabled,
      bonus_points: Number(course.bonus_points) || 0,
      status: course.status,
      sort_order: Number(course.sort_order) || 0,
    },
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title.trim() || "Untitled module",
      lessons: m.lessons.map((l) => {
        const video = l.kind === "video" ? cleanVideo(l.video) : null;
        return {
          id: l.id,
          title: l.title.trim() || "Untitled lesson",
          kind: l.kind,
          summary: l.summary || "",
          is_preview: !!l.is_preview,
          status: l.status || "published",
          duration_seconds: l.kind === "video" ? Math.round(video?.duration || l.duration_seconds || 0) : 0,
          read_minutes: l.kind === "reading" ? Number(l.read_minutes) || estimateReadMinutes(l.blocks) : 0,
          video,
          blocks: l.blocks || [],
        };
      }),
    })),
  };
}

function cleanVideo(v) {
  if (!v || (!v.id && !v.src)) return null;
  const out = { provider: v.provider };
  if (v.provider === "youtube") out.id = v.id;
  else out.src = v.src;
  if (v.duration) out.duration = Math.round(v.duration);
  if (v.poster) out.poster = v.poster;
  if (v.path) out.path = v.path; // storage path, so an uploaded file can be removed later
  if (v.chapters?.length) out.chapters = v.chapters;
  if (v.transcript?.length) out.transcript = v.transcript;
  if (v.products?.length) out.products = v.products;
  return out;
}

// ---------------------------------------------------------------------
// portable JSON (import / export)
// ---------------------------------------------------------------------
export function toExport(course) {
  const p = toSavePayload(course);
  return {
    format: COURSE_FORMAT,
    slug: p.course.slug,
    title: p.course.title,
    subtitle: p.course.subtitle,
    description: p.course.description,
    level: p.course.level,
    course_type: p.course.course_type,
    is_free: p.course.is_free,
    price: p.course.price,
    compare_price: p.course.compare_price,
    sequential: p.course.sequential,
    certificate_enabled: p.course.certificate_enabled,
    bonus_points: p.course.bonus_points,
    hero_url: p.course.cover_url,
    modules: p.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => {
        const o = { title: l.title, kind: l.kind, summary: l.summary };
        if (l.is_preview) o.is_preview = true;
        if (l.kind === "reading") o.read_minutes = l.read_minutes;
        if (l.video) o.video = l.video;
        o.blocks = l.blocks;
        return o;
      }),
    })),
  };
}

/** Accepts the course shape, {course:{...}}, a bare module array, or a single lesson. */
export function normalizeImported(input) {
  let src = input;
  if (Array.isArray(src)) {
    src = src.every((m) => m && Array.isArray(m.lessons)) ? { modules: src } : { modules: [{ title: "Imported", lessons: src }] };
  }
  if (src && src.course && typeof src.course === "object" && Array.isArray(src.modules || src.course.modules)) {
    src = { ...src.course, modules: src.modules || src.course.modules };
  }
  if (!src || typeof src !== "object") throw new Error("This doesn't look like a course file.");
  if (!Array.isArray(src.modules)) {
    if (Array.isArray(src.blocks) || src.kind || src.title) {
      src = { title: src.title || "Imported course", modules: [{ title: "Lessons", lessons: [src] }] };
    } else throw new Error("No modules or lessons found in this file.");
  }
  const type = src.course_type === "video" || src.type === "video" ? "video" : "story";
  const free = src.is_free != null ? !!src.is_free : !(Number(src.price) > 0);
  return {
    slug: slugify(src.slug || src.title || ""),
    title: String(src.title || "").trim(),
    subtitle: src.subtitle || "",
    description: src.description || "",
    level: LEVELS.includes(src.level) ? src.level : "beginner",
    course_type: type,
    is_free: free,
    price: free ? 0 : Number(src.price) || 0,
    compare_price: src.compare_price == null ? "" : Number(src.compare_price) || "",
    sequential: !!src.sequential,
    certificate_enabled: src.certificate_enabled !== false,
    bonus_points: Number(src.bonus_points) || 0,
    hero_url: src.hero_url || src.cover_url || "",
    modules: src.modules.map((m, mi) => ({
      id: uid(),
      title: String(m.title || `Module ${mi + 1}`),
      lessons: (m.lessons || []).map((l) => normalizeLesson(l, type)),
    })),
  };
}

function normalizeLesson(l, courseType) {
  const kind = ["reading", "video", "assessment"].includes(l.kind)
    ? l.kind
    : l.video ? "video" : l.blocks?.some((b) => b.type === "quiz") ? "assessment" : courseType === "video" ? "video" : "reading";
  const blocks = Array.isArray(l.blocks) ? l.blocks.filter((b) => b && typeof b === "object" && b.type) : [];
  return {
    id: uid(),
    title: String(l.title || "Untitled lesson"),
    kind,
    summary: l.summary || "",
    is_preview: !!l.is_preview,
    status: "published",
    read_minutes: Number(l.read_minutes) || (kind === "reading" ? estimateReadMinutes(blocks) : 0),
    duration_seconds: Number(l.duration_seconds || l.video?.duration) || 0,
    video: kind === "video" ? l.video || null : null,
    blocks,
  };
}

/** Editor course -> the shape src/data/demo-courses.js understands (used for the live preview). */
export function toPreviewCourse(course, { includeHidden = true } = {}) {
  const p = toSavePayload(course);
  return {
    slug: "__preview__",
    title: p.course.title || "Untitled course",
    subtitle: p.course.subtitle,
    description: p.course.description,
    level: p.course.level,
    is_free: true,
    price: 0,
    sequential: p.course.sequential,
    certificate_enabled: p.course.certificate_enabled,
    bonus_points: p.course.bonus_points,
    modules: p.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons
        .filter((l) => l.status !== "draft" || includeHidden)
        .map((l) => ({
          id: l.id, title: l.title, kind: l.kind, summary: l.summary, read_minutes: l.read_minutes,
          is_preview: true, video: l.video, blocks: l.blocks,
        })),
    })),
  };
}

// ---------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------
export function lessonCount(course) {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0);
}

/** { errors: [...], warnings: [...] }. Errors block saving; warnings only block publishing nothing. */
export function validateCourse(course, { publishing = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!course.title.trim()) errors.push("Give the course a title.");
  if (!course.slug.trim()) errors.push("The course needs a URL slug.");
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(course.slug)) errors.push("The slug can only contain lowercase letters, numbers and dashes.");
  if (!course.is_free && !(Number(course.price) > 0)) errors.push("Set a price above 0, or mark the course free.");
  if (course.compare_price !== "" && !course.is_free && Number(course.compare_price) <= Number(course.price)) {
    warnings.push("The compare-at price should be higher than the price to show a saving.");
  }
  course.modules.forEach((m, mi) => {
    m.lessons.forEach((l, li) => {
      const where = `Module ${mi + 1}, lesson ${li + 1}`;
      if (!l.title.trim()) (publishing ? errors : warnings).push(`${where} has no title.`);
      if (l.kind === "video" && !(l.video && (l.video.id || l.video.src))) (publishing ? errors : warnings).push(`${where} (“${l.title || "untitled"}”) has no video yet.`);
      if (l.kind === "reading" && !l.blocks.length) (publishing ? errors : warnings).push(`${where} (“${l.title || "untitled"}”) has no content yet.`);
      if (l.kind === "assessment") {
        const q = l.blocks.find((b) => b.type === "quiz");
        if (!q || !q.questions?.length) (publishing ? errors : warnings).push(`${where} (“${l.title || "untitled"}”) has no quiz questions.`);
        else q.questions.forEach((x, i) => {
          if (!x.q.trim() || x.options.filter((o) => o.trim()).length < 2) (publishing ? errors : warnings).push(`${where}: quiz question ${i + 1} needs a question and at least two options.`);
        });
      }
      l.blocks.forEach((b, bi) => {
        if (b.type === "checkpoint" && (!b.question?.trim() || b.options.filter((o) => o.trim()).length < 2)) {
          warnings.push(`${where}: quick check ${bi + 1} needs a question and at least two options.`);
        }
      });
    });
  });
  if (publishing && lessonCount(course) === 0) errors.push("Add at least one lesson before publishing.");
  if (publishing && !course.cover_url) warnings.push("No hero image yet.");
  return { errors, warnings };
}
