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

/** Returns { video, blocks } or null when the student isn't entitled to this lesson. */
export async function loadLessonContent(ctx, lesson) {
  if (ctx.source === "demo") return ctx.content[lesson.id] || { video: null, blocks: [] };
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
      .from("products").select("id, slug, name, now_price, moq, images, status").in("slug", unique);
    (data || []).forEach((p) => {
      out[p.slug] = { id: p.id, slug: p.slug, name: p.name, price: Number(p.now_price), moq: p.moq || 1, image: p.images?.[0]?.url || null };
    });
  }
  unique.forEach((s) => {
    if (!out[s] && DEMO_PRODUCTS[s]) out[s] = { id: null, slug: s, ...DEMO_PRODUCTS[s], moq: 1, image: null };
  });
  return out;
}

/** Adds to the same localStorage cart the shop uses (keyed by product id). */
export function addToShopCart(product) {
  if (!product?.id || !window.LashtribeCart) return false;
  const cart = window.LashtribeCart.getCart();
  cart[product.id] = cart[product.id] ? cart[product.id] + 1 : Math.max(1, product.moq || 1);
  window.LashtribeCart.setCart(cart);
  window.LashtribeCart.syncCartBadges();
  return true;
}
