// Build-time course catalog for the public course info pages (/academy/courses/<slug>).
// Reads published courses, their modules and lesson metadata from Supabase (all public by RLS).
// When the database isn't configured, the demo courses are used so the route still builds.

import { supabase } from "../services/service.js";
import { DEMO_COURSES, buildCourseCtx } from "./demo-courses.js";

const HAS_DB = Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

export const DEFAULT_DURATION = "2 weeks";

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

/** "12 min" / "1 h 05 min" from seconds. */
export function formatMinutes(seconds) {
  const mins = Math.round(Number(seconds || 0) / 60);
  if (mins <= 0) return "";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
}

/**
 * @typedef {{ id: string, title: string, kind: string, summary: string, is_preview: boolean, duration: string }} OutlineLesson
 * @typedef {{ id: string, title: string, lessons: OutlineLesson[] }} OutlineModule
 * @typedef {{
 *   id: string, slug: string, title: string, subtitle: string, description: string, about: string,
 *   learnPoints: string[], level: string, isFree: boolean, price: number, cover: string,
 *   duration: string, certificate: boolean, sortOrder: number, modules: OutlineModule[],
 *   lessonCount: number, videoLength: string
 * }} CourseInfo
 */

/** @returns {CourseInfo} */
function shape(ctx) {
  const { course, modules, lessons } = ctx;
  const mods = [...modules]
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
          is_preview: Boolean(l.is_preview),
          duration: l.kind === "reading" ? (l.read_minutes ? `${l.read_minutes} min read` : "") : formatMinutes(l.duration_seconds),
        })),
    }))
    .filter((m) => m.lessons.length);
  const lessonCount = mods.reduce((n, m) => n + m.lessons.length, 0);
  const totalSeconds = lessons.reduce((n, l) => n + (l.kind === "video" ? Number(l.duration_seconds || 0) : 0), 0);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle || "",
    description: course.description || "",
    about: course.about || "",
    learnPoints: Array.isArray(course.learn_points) ? course.learn_points.filter(Boolean) : [],
    level: course.level || "",
    isFree: Boolean(course.is_free),
    price: Number(course.price || 0),
    cover: course.cover_url || "",
    duration: course.duration_label || DEFAULT_DURATION,
    certificate: course.certificate_enabled !== false,
    sortOrder: course.sort_order ?? 0,
    modules: mods,
    lessonCount,
    videoLength: formatMinutes(totalSeconds),
  };
}

/** @type {CourseInfo[] | undefined} */
let cache;
/** @returns {Promise<CourseInfo[]>} */
export async function getPublishedCourses() {
  if (cache) return cache;
  /** @type {CourseInfo[]} */
  let list = [];
  if (HAS_DB) {
    const { data: courses, error } = await supabase
      .from("courses").select("*").eq("status", "published")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) {
      console.error("Course pages: could not load courses.", error);
    } else {
      for (const course of courses || []) {
        const [mods, less] = await Promise.all([
          supabase.from("course_modules").select("*").eq("course_id", course.id).order("sort_order"),
          supabase.from("lessons").select("id, course_id, module_id, title, kind, summary, duration_seconds, read_minutes, is_preview, sort_order")
            .eq("course_id", course.id).eq("status", "published").order("sort_order"),
        ]);
        if (mods.error || less.error) {
          console.error("Course pages: could not load outline for", course.slug, mods.error || less.error);
          continue;
        }
        list.push(shape({ course, modules: mods.data || [], lessons: less.data || [] }));
      }
    }
  } else {
    list = DEMO_COURSES.map((c) => shape(buildCourseCtx(c)));
  }
  cache = list;
  return list;
}
