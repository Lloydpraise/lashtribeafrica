// Student-side data layer for the academy player.
// Uses Supabase when configured and the 0005 migration is applied; otherwise falls back to the
// demo courses in src/data/demo-courses.js with progress/notes kept in localStorage.

import { supabase } from "./service.js";
import { getDemoCourse, buildCourseCtx, DEMO_PRODUCTS } from "../data/demo-courses.js";

export const HAS_DB = Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const LS_KEY = "lashtribe_academy_demo_v1";
const readLS = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};
const writeLS = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
};

// ---------- auth ----------
export async function getUser() {
  if (!HAS_DB) return null;
  const { data } = await supabase.auth.getSession();
  const u = data?.session?.user;
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Student" };
}
export function hasAcademyDemoSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem("lashtribe_academy_session") || "null");
    return Boolean(session?.name);
  } catch {
    return false;
  }
}
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signUp(name, email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) throw error;
  if (!data.session) throw new Error("Check your email to confirm your account, then sign in.");
}

// ---------- course ----------
/** The admin course builder writes the course being edited here, then opens ?course=__preview__. */
export const PREVIEW_SLUG = "__preview__";
export const PREVIEW_KEY = "lashtribe_course_preview";

function loadPreviewCourse() {
  try {
    const c = JSON.parse(localStorage.getItem(PREVIEW_KEY) || "null");
    if (!c || !Array.isArray(c.modules)) return null;
    return { source: "demo", preview: true, ...buildCourseCtx({ ...c, slug: PREVIEW_SLUG }), access: true, user: null };
  } catch {
    return null;
  }
}

export async function loadCourse(slug) {
  if (slug === PREVIEW_SLUG) return loadPreviewCourse();
  if (HAS_DB) {
    try {
      const { data: course, error } = await supabase
        .from("courses").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (course) {
        const [mods, less] = await Promise.all([
          supabase.from("course_modules").select("*").eq("course_id", course.id).order("sort_order"),
          supabase.from("lessons").select("*").eq("course_id", course.id).eq("status", "published").order("sort_order"),
        ]);
        if (mods.error) throw mods.error;
        if (less.error) throw less.error;
        const user = await getUser();
        let access = false;
        if (user) {
          const r = await supabase.rpc("has_course_access", { p_course_id: course.id });
          access = r.data === true;
        }
        return { source: "db", course, modules: mods.data, lessons: less.data, access, user, content: {} };
      }
    } catch (e) {
      console.warn("Academy: database unavailable, trying demo content.", e?.message || e);
    }
  }
  const demo = getDemoCourse(slug);
  if (!demo) return null;
  return { source: "demo", ...demo, access: true, user: null };
}

/** A database function that isn't there yet (its migration hasn't been run). */
const missingFn = (error) =>
  !!error && (error.code === "PGRST202" || error.code === "42883" || /Could not find the function/i.test(error.message || ""));

/** Returns { video, blocks, graded } or null when the student isn't entitled to this lesson.
 *  graded: the quiz answers were left out (migration 0027), so quizzes are marked by the database. */
export async function loadLessonContent(ctx, lesson) {
  if (ctx.source === "demo") return ctx.content[lesson.id] || { video: null, blocks: [] };
  const rpc = await supabase.rpc("get_lesson_content", { p_lesson: lesson.id });
  if (!rpc.error) return rpc.data ? { video: rpc.data.video || null, blocks: rpc.data.blocks || [], graded: true } : null;
  if (!missingFn(rpc.error)) throw rpc.error;
  // before migration 0027: read the table directly
  const { data, error } = await supabase
    .from("lesson_content").select("video, blocks").eq("lesson_id", lesson.id).maybeSingle();
  if (error) throw error;
  return data ? { video: data.video || null, blocks: data.blocks || [] } : null;
}

// ---------- progress ----------
export async function loadProgress(ctx) {
  if (ctx.source === "demo" || !ctx.user) return readLS()[ctx.course.slug]?.progress || {};
  const { data, error } = await supabase
    .from("lesson_progress").select("lesson_id, completed, position_seconds").eq("course_id", ctx.course.id);
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => (map[r.lesson_id] = { completed: r.completed, position: r.position_seconds }));
  return map;
}

export async function saveProgress(ctx, lessonId, patch) {
  if (ctx.source === "demo" || !ctx.user) {
    const all = readLS();
    const c = (all[ctx.course.slug] ||= { progress: {}, notes: {} });
    c.progress[lessonId] = { ...(c.progress[lessonId] || {}), ...patch };
    c.lastActive = Date.now();
    writeLS(all);
    return;
  }
  if (!ctx.user || !ctx.access) return;
  const row = {
    user_id: ctx.user.id,
    lesson_id: lessonId,
    course_id: ctx.course.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.position != null) row.position_seconds = Math.max(0, Math.floor(patch.position));
  if (patch.completed != null) {
    row.completed = patch.completed;
    if (patch.completed) row.completed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("lesson_progress").upsert(row, { onConflict: "user_id,lesson_id" });
  if (error) console.warn("Academy: could not save progress", error.message);
}

/** The student opened a lesson: the database notes the time (first visit only). */
export async function startLesson(ctx, lessonId) {
  if (ctx.source === "demo" || !ctx.user || !ctx.access) return;
  const { error } = await supabase.rpc("start_lesson", { p_lesson: lessonId });
  if (error && !missingFn(error)) console.warn("Academy: could not record lesson start", error.message);
}

/** Asks the database to mark a lesson done. Returns { completed, reason?, wait_seconds? }.
 *  reason "quiz": the quiz hasn't been passed; "time": the lesson has been open too briefly. */
export async function completeLesson(ctx, lessonId) {
  if (ctx.source === "demo" || !ctx.user) {
    await saveProgress(ctx, lessonId, { completed: true });
    return { completed: true };
  }
  if (!ctx.access) return { completed: false };
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson: lessonId });
  if (!error) return data || { completed: false };
  if (!missingFn(error)) { console.warn("Academy: could not complete lesson", error.message); return { completed: false }; }
  // before migration 0027 the browser still records completion itself
  await saveProgress(ctx, lessonId, { completed: true });
  return { completed: true };
}

/** Sends one quiz answer to the database. Returns { attempt_id, correct, answer, explain, done, score, total, pct, passed }. */
export async function answerQuiz(lessonId, question, choice, attemptId) {
  const { data, error } = await supabase.rpc("quiz_answer", {
    p_lesson: lessonId, p_question: question, p_choice: choice, p_attempt: attemptId || null,
  });
  if (error) throw new Error(error.message || "Couldn't check that answer.");
  return data;
}

// ---------- final exam (migration 0028) ----------
/** The course's final exam without answers, or null when there is none.
 *  { title, intro, pass_score, auto_mark, questions, unlocked, latest } */
export async function loadExam(ctx) {
  // the admin preview carries the exam with its answers and marks it in the browser
  if (ctx.source === "demo") return ctx.course.exam?.questions?.length ? { ...ctx.course.exam, unlocked: true, latest: null } : null;
  if (!ctx.user) return null;
  const { data, error } = await supabase.rpc("get_course_exam", { p_course: ctx.course.id });
  if (error) {
    if (!missingFn(error)) console.warn("Academy: could not load the exam", error.message);
    return null;
  }
  return data || null;
}

/** Hands the exam in. answers: { [questionId]: optionIndex | "text" }. Returns the attempt
 *  { id, status: 'passed'|'failed'|'pending_review', pct, pass_score, marks, feedback }. */
export async function submitExam(ctx, answers) {
  if (ctx.source === "demo") return markExamLocally(ctx.course.exam, answers);
  const { data, error } = await supabase.rpc("submit_exam", { p_course: ctx.course.id, p_answers: answers });
  if (error) throw new Error(error.message || "Couldn't hand in the exam.");
  return data;
}

const norm = (t) => String(t ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** Admin preview only: marks the exam in the browser, the same way the database does. */
function markExamLocally(exam, answers) {
  let score = 0; let max = 0; let open = false;
  const marks = {};
  (exam?.questions || []).forEach((q) => {
    const pts = Number(q.points) > 0 ? Number(q.points) : 1;
    max += pts;
    const a = answers[q.id];
    let ok;
    if ((q.type || "choice") === "choice") ok = Number(a) === Number(q.answer);
    else if (exam.auto_mark) ok = (q.accepted || []).some((x) => norm(x) && norm(x) === norm(a));
    if (ok === undefined) { open = true; return; }
    marks[q.id] = ok;
    if (ok) score += pts;
  });
  const pct = open || !max ? null : Math.round((score * 100) / max);
  const status = open ? "pending_review" : pct >= exam.pass_score ? "passed" : "failed";
  return { id: "preview", status, pct, pass_score: exam.pass_score, marks: open ? {} : marks, feedback: null };
}

// ---------- "last course the student touched" (drives the dashboard hero) ----------
const TOUCH_KEY = "lashtribe_last_course_v1";
const readTouch = () => {
  try { return JSON.parse(localStorage.getItem(TOUCH_KEY) || "{}"); } catch { return {}; }
};

/** Call when a student opens a course, so the dashboard hero follows what they last used,
 *  even before they have finished or even started a lesson. */
export function touchCourse(ctx) {
  if (!ctx?.course?.slug || ctx.preview) return;
  const all = readTouch();
  all[ctx.user?.id || "anon"] = { slug: ctx.course.slug, t: Date.now() };
  try { localStorage.setItem(TOUCH_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
}

/** Slug of the course the student interacted with most recently: the later of their latest lesson
 *  activity (saved in the database), the last course opened on this device, and, failing both, their
 *  newest enrolment. Returns null when there is nothing to go on.
 *  With { startedOnly: true } the enrolment fallback is skipped, so a course only counts when the
 *  student has actually begun it (lesson activity, or they opened it). The dashboard hero uses this
 *  to decide between "continue learning" and the Academy landing hero. */
export async function getLastActiveCourseSlug({ startedOnly = false } = {}) {
  const user = await getUser();
  let best = null; // { slug, t }
  const consider = (slug, t) => { if (slug && Number.isFinite(t) && (!best || t > best.t)) best = { slug, t }; };

  const touched = readTouch()[user?.id || "anon"];
  if (touched) consider(touched.slug, touched.t);

  if (HAS_DB && user) {
    try {
      const { data: prog } = await supabase
        .from("lesson_progress").select("course_id, updated_at")
        .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1);
      if (prog?.[0]) {
        const { data: c } = await supabase.from("courses").select("slug").eq("id", prog[0].course_id).maybeSingle();
        consider(c?.slug, new Date(prog[0].updated_at).getTime());
      }
      if (!best && !startedOnly) {
        const { data: enr } = await supabase
          .from("enrollments").select("course_id, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
        if (enr?.[0]) {
          const { data: c } = await supabase.from("courses").select("slug").eq("id", enr[0].course_id).maybeSingle();
          consider(c?.slug, new Date(enr[0].created_at).getTime());
        }
      }
    } catch (err) {
      console.warn("Academy: couldn't work out the last course", err?.message || err);
    }
  } else if (!user) {
    const all = readLS();
    Object.entries(all).forEach(([slug, v]) => consider(slug, v?.lastActive));
  }
  return best?.slug || null;
}

/** Best effort: record a free self-enrolment so the course shows up under "My courses". */
export async function enrollFree(ctx) {
  if (ctx.source !== "db" || !ctx.user || !ctx.course.is_free) return;
  await supabase.from("enrollments").upsert(
    { user_id: ctx.user.id, course_id: ctx.course.id, source: "free" },
    { onConflict: "user_id,course_id", ignoreDuplicates: true }
  );
}

// ---------- notes ----------
export async function loadNotes(ctx, lessonId) {
  if (ctx.source === "demo" || !ctx.user) return (readLS()[ctx.course.slug]?.notes?.[lessonId] || []).slice();
  const { data } = await supabase
    .from("lesson_notes").select("id, t_seconds, body, created_at")
    .eq("lesson_id", lessonId).order("created_at", { ascending: true });
  return (data || []).map((n) => ({ id: n.id, t: n.t_seconds, body: n.body, at: n.created_at }));
}
export async function addNote(ctx, lessonId, t, body) {
  if (ctx.source === "demo" || !ctx.user) {
    const all = readLS();
    const c = (all[ctx.course.slug] ||= { progress: {}, notes: {} });
    const note = { id: "n" + Date.now(), t, body, at: new Date().toISOString() };
    (c.notes[lessonId] ||= []).push(note);
    writeLS(all);
    return note;
  }
  const { data, error } = await supabase
    .from("lesson_notes")
    .insert({ user_id: ctx.user.id, lesson_id: lessonId, course_id: ctx.course.id, t_seconds: t, body })
    .select("id, t_seconds, body, created_at").single();
  if (error) throw error;
  return { id: data.id, t: data.t_seconds, body: data.body, at: data.created_at };
}
export async function deleteNote(ctx, lessonId, id) {
  if (ctx.source === "demo" || !ctx.user) {
    const all = readLS();
    const list = all[ctx.course.slug]?.notes?.[lessonId];
    if (list) all[ctx.course.slug].notes[lessonId] = list.filter((n) => n.id !== id);
    writeLS(all);
    return;
  }
  await supabase.from("lesson_notes").delete().eq("id", id);
}

// ---------- shop products referenced inside video lessons ----------
export async function resolveProducts(slugs) {
  const out = {};
  const unique = [...new Set(slugs.filter(Boolean))];
  if (!unique.length) return out;
  if (HAS_DB) {
    const { data } = await supabase
      .from("products").select("id, slug, name, now_price, moq, images, status, options").in("slug", unique);
    (data || []).forEach((p) => {
      out[p.slug] = {
        id: p.id, slug: p.slug, name: p.name, price: Number(p.now_price), moq: p.moq || 1, image: p.images?.[0]?.url || null,
        hasOptions: Array.isArray(p.options) && p.options.length > 0, // needs curl / length etc: chosen on the product page
      };
    });
  }
  unique.forEach((s) => {
    if (!out[s] && DEMO_PRODUCTS[s]) out[s] = { id: null, slug: s, ...DEMO_PRODUCTS[s], moq: 1, image: null };
  });
  return out;
}

/** Adds to the same localStorage cart the shop uses. Products with options (curl, length...) can't be added
 *  blind: they return false and the caller sends the person to the product page. */
export function addToShopCart(product) {
  if (!product?.id || !window.LashtribeCart || product.hasOptions) return false;
  const already = Boolean(window.LashtribeCart.getCart()[product.id]);
  window.LashtribeCart.add(product.id, already ? 1 : Math.max(1, product.moq || 1));
  return true;
}
