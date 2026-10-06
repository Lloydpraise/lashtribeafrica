import { supabase } from "../../../services/service.js";
import { courseFromRows, toSavePayload, uid, slugify } from "./courseModel.js";

export const BUCKET = "course-media";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // keep in step with file_size_limit in 0008_admin_courses.sql
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/** Turns Supabase/Postgres errors into something an admin can act on. */
export function explain(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  const msg = err.message || String(err);
  const code = err.code || "";
  if (code === "42501" || /row-level security|only academy admins/i.test(msg)) {
    return "Course access is blocked by database permissions. Run migration 0009_courses_anon_admin.sql, then try again.";
  }
  if (code === "23505" && /slug/i.test(msg)) return "That URL slug is already used by another one. Change the slug and save again.";
  if (code === "PGRST202" || code === "42883" || /Could not find the function/i.test(msg)) {
    return "The database is missing migration 0008_admin_courses.sql. Run it in the Supabase SQL editor, then reload.";
  }
  if (code === "42P01" || code === "PGRST205" || /relation .* does not exist|schema cache/i.test(msg)) {
    return "A course table is missing. Make sure migrations 0005 and 0008 have been run.";
  }
  if (/Bucket not found/i.test(msg)) return "The course-media storage bucket doesn't exist yet. Run migration 0008_admin_courses.sql.";
  if (/exceeded the maximum allowed size|too large|413/i.test(msg)) return "That file is larger than the storage limit allows.";
  return msg || fallback;
}

// ---------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------
export async function fetchCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, lessons(count), enrollments(count)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => ({
    ...c,
    price: Number(c.price || 0),
    compare_price: c.compare_price == null ? null : Number(c.compare_price),
    lesson_count: c.lessons?.[0]?.count ?? 0,
    student_count: c.enrollments?.[0]?.count ?? 0,
  }));
}

export async function fetchCourseFull(id) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, course_modules(*), lessons(*, lesson_content(video, blocks))")
    .eq("id", id)
    .single();
  if (error) throw error;
  const lessons = (data.lessons || []).map(({ lesson_content, ...l }) => l);
  const content = (data.lessons || []).map((l) => {
    const c = Array.isArray(l.lesson_content) ? l.lesson_content[0] : l.lesson_content;
    return { lesson_id: l.id, video: c?.video || null, blocks: c?.blocks || [] };
  });
  const { course_modules, lessons: _l, ...course } = data;
  return courseFromRows({ course, modules: course_modules || [], lessons, content });
}

export async function saveCourse(course) {
  const payload = toSavePayload(course);
  const { error } = await supabase.rpc("admin_save_course", { p: payload });
  if (error) throw error;
  return course.id;
}

export async function setCourseStatus(id, status) {
  const { error } = await supabase.from("courses").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateCoursePricing(id, { is_free, price, compare_price }) {
  const free = !!is_free;
  const { error } = await supabase
    .from("courses")
    .update({
      is_free: free,
      price: free ? 0 : Number(price) || 0,
      compare_price: free || compare_price === "" || compare_price == null ? null : Number(compare_price),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCourse(id) {
  await purgeFolder(`courses/${id}`);
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

/** Copies a course (as a draft) including its uploaded media, which is copied server-side. */
export async function duplicateCourse(id, existingSlugs = []) {
  const src = await fetchCourseFull(id);
  const newId = uid();
  let slug = `${src.slug}-copy`;
  for (let n = 2; existingSlugs.includes(slug); n += 1) slug = `${src.slug}-copy-${n}`;

  await copyFolder(`courses/${id}`, `courses/${newId}`);
  // uploaded files keep their names, so repointing the folder in every URL is enough
  const json = JSON.stringify(src).split(`courses/${id}/`).join(`courses/${newId}/`);
  const copy = JSON.parse(json);

  // fresh ids for modules and lessons
  copy.modules = copy.modules.map((m) => ({ ...m, id: uid(), lessons: m.lessons.map((l) => ({ ...l, id: uid() })) }));
  Object.assign(copy, { id: newId, slug, title: `${src.title} (copy)`, status: "draft" });
  await saveCourse(copy);
  return newId;
}

// ---------------------------------------------------------------------
// bundles
// ---------------------------------------------------------------------
export async function fetchBundles() {
  const { data, error } = await supabase
    .from("course_bundles")
    .select("*, items:course_bundle_items(course_id, sort_order)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((b) => ({
    ...b,
    price: Number(b.price || 0),
    compare_price: b.compare_price == null ? null : Number(b.compare_price),
    course_ids: (b.items || []).slice().sort((a, c) => a.sort_order - c.sort_order).map((i) => i.course_id),
  }));
}

export async function saveBundle(bundle) {
  const payload = {
    bundle: {
      id: bundle.id,
      slug: bundle.slug.trim(),
      title: bundle.title.trim(),
      description: bundle.description || "",
      price: Number(bundle.price) || 0,
      compare_price: bundle.compare_price === "" || bundle.compare_price == null ? null : Number(bundle.compare_price),
      cover_url: bundle.cover_url || "",
      cover_path: bundle.cover_path || "",
      status: bundle.status,
      sort_order: Number(bundle.sort_order) || 0,
    },
    course_ids: bundle.course_ids,
  };
  const { error } = await supabase.rpc("admin_save_bundle", { p: payload });
  if (error) throw error;
}

export async function setBundleStatus(id, status) {
  const { error } = await supabase.from("course_bundles").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteBundle(id) {
  await purgeFolder(`bundles/${id}`);
  const { error } = await supabase.from("course_bundles").delete().eq("id", id);
  if (error) throw error;
}

export function emptyBundle() {
  return { id: uid(), isNew: true, slug: "", title: "", description: "", price: "", compare_price: "", cover_url: "", cover_path: "", status: "draft", sort_order: 0, course_ids: [] };
}

export { slugify };

// ---------------------------------------------------------------------
// storage (bucket + admin-only write policies come from migration 0008)
// ---------------------------------------------------------------------
const extOf = (file) => {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return (file.type.split("/")[1] || "bin").replace("quicktime", "mov");
};

/** Downscales large photos and converts them to WebP in the browser (falls back to the original). */
export async function prepareImage(file, maxWidth = 1600) {
  if (!IMAGE_TYPES.includes(file.type) || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    if (scale === 1 && file.type === "image/webp") { bitmap.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.86));
    if (!blob || blob.size >= file.size) return file; // never make it bigger
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Uploads to course-media. `folder` is e.g. `courses/<courseId>/hero`.
 * @returns {{ url, path }}
 */
export async function uploadMedia(file, folder, { maxWidth } = {}) {
  const isVideo = VIDEO_TYPES.includes(file.type);
  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isVideo && !isImage) throw new Error("Unsupported file type. Use JPG, PNG, WebP or GIF images, or MP4/WebM/MOV videos.");
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    throw new Error(`That video is ${(file.size / 1048576).toFixed(0)} MB. Uploads are limited to ${MAX_VIDEO_BYTES / 1048576} MB; paste a YouTube or direct link for longer videos.`);
  }
  const body = isImage ? await prepareImage(file, maxWidth) : file;
  if (isImage && body.size > MAX_IMAGE_BYTES) throw new Error("That image is over 8 MB even after compression. Use a smaller one.");

  const path = `${folder}/${uid()}.${extOf(body)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { cacheControl: "31536000", upsert: false, contentType: body.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeMedia(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** Reads a video file's length in seconds without uploading it. */
export function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (n) => { URL.revokeObjectURL(url); resolve(n); };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : 0);
    v.onerror = () => done(0);
    v.src = url;
  });
}

async function listFolder(folder) {
  const out = [];
  for (const sub of ["hero", "cover", "figures", "videos"]) {
    const { data } = await supabase.storage.from(BUCKET).list(`${folder}/${sub}`, { limit: 1000 });
    (data || []).filter((f) => f.id).forEach((f) => out.push(`${folder}/${sub}/${f.name}`));
  }
  return out;
}

async function purgeFolder(folder) {
  try {
    const paths = await listFolder(folder);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    // orphaned files are harmless; never block deleting the course over them
  }
}

async function copyFolder(from, to) {
  const paths = await listFolder(from);
  for (const p of paths) {
    const { error } = await supabase.storage.from(BUCKET).copy(p, p.replace(from, to));
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------
// Course PDF (private "course-files" bucket + course_resources row, migration 0010)
// Saved immediately, independent of the course Save button.
// ---------------------------------------------------------------------
const PDF_BUCKET = "course-files";
export const MAX_PDF_MB = 50;

export async function fetchCoursePdf(courseId) {
  const { data, error } = await supabase.from("course_resources").select("pdf_path, pdf_name, pdf_size").eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return data?.pdf_path ? data : null;
}

export async function uploadCoursePdf(courseId, file, old) {
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error("Please choose a PDF file.");
  if (file.size > MAX_PDF_MB * 1048576) throw new Error(`That PDF is over ${MAX_PDF_MB} MB.`);
  const path = `${courseId}/${uid()}.pdf`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  const row = { course_id: courseId, pdf_path: path, pdf_name: file.name, pdf_size: file.size, updated_at: new Date().toISOString() };
  const { error: e2 } = await supabase.from("course_resources").upsert(row, { onConflict: "course_id" });
  if (e2) { await supabase.storage.from(PDF_BUCKET).remove([path]); throw e2; }
  if (old?.pdf_path) await supabase.storage.from(PDF_BUCKET).remove([old.pdf_path]);
  return { pdf_path: path, pdf_name: file.name, pdf_size: file.size };
}

export async function removeCoursePdf(courseId, old) {
  const { error } = await supabase.from("course_resources").delete().eq("course_id", courseId);
  if (error) throw error;
  if (old?.pdf_path) await supabase.storage.from(PDF_BUCKET).remove([old.pdf_path]);
}

/** Admin-only: saves the private PDF to the admin's computer. */
export async function downloadCoursePdf(pdf) {
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(pdf.pdf_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = pdf.pdf_name || "course.pdf"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
