// Turns an uploaded/pasted file into an editor-ready course.
//   .json  the portable course file (what "Export" produces, and what Claude/scripts can generate)
//   .md/.txt  the Markdown dialect described at the top of courseMarkdown.js

import { normalizeImported, parseVideoLink, parseDuration } from "./courseModel.js";
import { parseCourseMarkdown } from "./courseMarkdown.js";
import { restyleCourse } from "./restyle.js";

export function summarize(course) {
  let lessons = 0, blocks = 0, videos = 0, questions = 0, figures = 0;
  course.modules.forEach((m) =>
    m.lessons.forEach((l) => {
      lessons += 1;
      if (l.video) videos += 1;
      (l.blocks || []).forEach((b) => {
        blocks += 1;
        if (b.type === "quiz") questions += (b.questions || []).length;
        if (b.type === "checkpoint") questions += 1;
        if (b.type === "figure") figures += 1;
      });
    })
  );
  return { modules: course.modules.length, lessons, blocks, videos, questions, figures };
}

function resolveVideos(portable, warnings) {
  (portable.modules || []).forEach((m) =>
    (m.lessons || []).forEach((l) => {
      if (!l.video) return;
      let v = l.video;
      if (typeof v === "string") v = { link: v };
      if (v.link || (!v.provider && (v.src || v.url))) {
        const { video, error } = parseVideoLink(v.link || v.src || v.url);
        if (error) {
          warnings.push(`“${l.title}”: ${error}`);
          l.video = null;
          return;
        }
        const duration = typeof v.duration === "string" ? parseDuration(v.duration) : v.duration;
        l.video = { ...video, ...(duration ? { duration } : {}), ...(v.poster ? { poster: v.poster } : {}), ...(v.chapters ? { chapters: v.chapters } : {}), ...(v.transcript ? { transcript: v.transcript } : {}) };
      } else {
        l.video = v;
      }
    })
  );
}

/**
 * @returns {{ course, warnings: string[], stats, restyle }}
 * course is in the editor's shape (every module/lesson has a fresh id) plus `hero_url`.
 */
export function parseImport(text, { restyle = true } = {}) {
  const src = String(text || "").trim();
  if (!src) throw new Error("The file is empty.");
  const warnings = [];
  let portable;

  if (/^(export\s|const\s|import\s|\/\/)/.test(src)) {
    throw new Error(
      "This looks like a JavaScript data file. Convert it first with:  node scripts/course-to-json.mjs path/to/course.js > course.json  — then import the .json."
    );
  }

  if (src.startsWith("{") || src.startsWith("[")) {
    try {
      portable = JSON.parse(src);
    } catch (e) {
      throw new Error(`That isn't valid JSON (${e.message}).`);
    }
  } else {
    const md = parseCourseMarkdown(src);
    portable = md.course;
    warnings.push(...md.warnings);
  }

  // normalise every accepted shape first, then resolve video links on the unified structure
  const normalized = normalizeImported(portable);
  resolveVideos(normalized, warnings);
  normalized.modules.forEach((m) =>
    m.lessons.forEach((l) => {
      if (l.video?.duration) l.duration_seconds = Math.round(l.video.duration);
    })
  );

  let course = normalized;
  let styled = null;
  if (restyle) {
    const r = restyleCourse(normalized);
    course = r.course;
    styled = r.stats;
  }
  if (!course.modules.some((m) => m.lessons.length)) warnings.push("No lessons were found in this file.");
  return { course, warnings, stats: summarize(course), restyle: styled };
}
