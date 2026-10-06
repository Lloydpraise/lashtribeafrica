// Image "slots" for imported courses.
//
// A course file never carries image files, only references (export writes each image's public URL).
// When a file is written by hand or by an AI from a PDF, it can't know any URL yet, so it uses a
// slot instead:      ![Eye anatomy](image:eye-anatomy)      (Markdown)
//                    { "type": "figure", "url": "image:eye-anatomy", ... }   (JSON)
// A bare filename (images/eye-anatomy.webp) or an empty () works the same way.
// On import, the admin picks the image files (matched by name) or uploads each slot one by one;
// the uploads go to the course-media bucket and the references are replaced by real URLs.

export const isRealUrl = (u) => /^(https?:)?\/\//i.test(u || "") || /^\/[^/]/.test(u || "") || /^data:image\//i.test(u || "");

const stem = (ref) =>
  String(ref || "")
    .replace(/^image:/i, "")
    .split(/[\\/]/).pop()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const fileStem = (name) => stem(name);

/** Lists every image reference that still needs a real file. Each slot may be used in several places. */
export function collectImageSlots(course) {
  const slots = new Map();
  const add = (ref, label, where) => {
    const key = stem(ref) || `unnamed-${slots.size + 1}`;
    if (!slots.has(key)) slots.set(key, { key, ref: ref || "", label, where: [], url: "" });
    slots.get(key).where.push(where);
  };
  if (course.hero_url && !isRealUrl(course.hero_url)) add(course.hero_url, "Hero image", "Course hero");
  (course.modules || []).forEach((m, mi) =>
    (m.lessons || []).forEach((l) =>
      (l.blocks || []).forEach((b) => {
        if (b.type === "figure" && !isRealUrl(b.url)) add(b.url, b.caption || "Image", `${l.title || "Lesson"}`);
      })
    )
  );
  return [...slots.values()];
}

/** Replaces slot references with the uploaded URLs. Slots without a URL are left empty ("No image yet"). */
export function applyImageUrls(course, urlByKey, { clearMissing = true } = {}) {
  const next = JSON.parse(JSON.stringify(course));
  const fix = (ref, i) => {
    if (isRealUrl(ref)) return ref;
    const key = stem(ref);
    return urlByKey[key] || (clearMissing ? "" : ref);
  };
  if (next.hero_url && !isRealUrl(next.hero_url)) next.hero_url = fix(next.hero_url);
  next.modules.forEach((m) =>
    m.lessons.forEach((l) =>
      (l.blocks || []).forEach((b) => {
        if (b.type === "figure") b.url = fix(b.url);
      })
    )
  );
  return next;
}

/** Splits chosen files into { matched: {key: File}, extra: File[] } by filename. */
export function matchFiles(slots, files) {
  const byKey = new Map(slots.map((s) => [s.key, s]));
  const matched = {};
  const extra = [];
  files.forEach((f) => {
    const k = fileStem(f.name);
    if (byKey.has(k) && !matched[k]) matched[k] = f;
    else extra.push(f);
  });
  return { matched, extra };
}
