import { useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS, STATUSES, formatKsh, slugify, newModule, newLesson, uid, validateCourse, lessonCount,
} from "./courseModel.js";
import { saveCourse, explain } from "./courses.api.js";
import { Field, Segmented, Toggle, StatusBadge, Notice, ConfirmModal } from "./fields.jsx";
import ImageField from "./ImageField.jsx";
import PdfField from "./PdfField.jsx";
import LessonEditor from "./LessonEditor.jsx";
import ImportPanel from "./ImportPanel.jsx";
import PreviewModal from "./PreviewModal.jsx";

const KIND_ICON = { reading: "▤", video: "▶", assessment: "?" };

export default function CourseEditor({ initial, existingSlugs, startTab = "details", onBack, onSaved }) {
  const [course, setCourse] = useState(initial);
  const [dirty, setDirty] = useState(!!initial.isNew);
  const [tab, setTab] = useState(startTab);
  const [selected, setSelected] = useState(() => initial.modules[0]?.lessons[0]?.id || null);
  const [slugTouched, setSlugTouched] = useState(!initial.isNew);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind, text }
  const [problems, setProblems] = useState(null);
  const [preview, setPreview] = useState(null); // { lessonId? }
  const [confirm, setConfirm] = useState(null);
  const savedRef = useRef(initial);

  const set = (patch) => { setCourse((c) => ({ ...c, ...patch })); setDirty(true); };

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const lessonRef = useMemo(() => {
    for (const m of course.modules) for (const l of m.lessons) if (l.id === selected) return { m, l };
    return null;
  }, [course, selected]);

  // ----- details -----
  function setTitle(title) {
    set({ title, ...(slugTouched ? {} : { slug: slugify(title) }) });
  }
  const saving$ = course.compare_price !== "" && !course.is_free && Number(course.compare_price) > Number(course.price)
    ? Math.round((1 - Number(course.price) / Number(course.compare_price)) * 100) : 0;

  // ----- curriculum edits -----
  const mapModules = (fn) => set({ modules: fn(course.modules) });
  const defaultKind = course.course_type === "video" ? "video" : "reading";

  const patchLesson = (lesson) =>
    mapModules((ms) => ms.map((m) => ({ ...m, lessons: m.lessons.map((l) => (l.id === lesson.id ? lesson : l)) })));

  function addModule() {
    const m = newModule(`Module ${course.modules.length + 1}`, defaultKind);
    mapModules((ms) => [...ms, m]);
    setSelected(m.lessons[0].id);
  }
  function addLesson(mid, kind = defaultKind) {
    const l = newLesson(kind);
    mapModules((ms) => ms.map((m) => (m.id === mid ? { ...m, lessons: [...m.lessons, l] } : m)));
    setSelected(l.id);
  }
  const moveIn = (arr, i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const n = arr.slice();
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  };
  const moveModule = (i, d) => mapModules((ms) => moveIn(ms, i, d));
  const moveLesson = (mid, i, d) => mapModules((ms) => ms.map((m) => (m.id === mid ? { ...m, lessons: moveIn(m.lessons, i, d) } : m)));
  function removeLesson(mid, lid) {
    mapModules((ms) => ms.map((m) => (m.id === mid ? { ...m, lessons: m.lessons.filter((l) => l.id !== lid) } : m)));
    if (selected === lid) setSelected(null);
  }
  function removeModule(mid) {
    mapModules((ms) => ms.filter((m) => m.id !== mid));
    if (lessonRef?.m.id === mid) setSelected(null);
  }
  const askRemoveLesson = (m, l) =>
    setConfirm({
      title: `Delete “${l.title || "Untitled lesson"}”?`,
      body: "The lesson and its content are removed when you save. Students lose their progress on it.",
      run: () => removeLesson(m.id, l.id),
    });
  const askRemoveModule = (m) =>
    setConfirm({
      title: `Delete “${m.title || "Untitled module"}”?`,
      body: `This removes the module and its ${m.lessons.length} lesson${m.lessons.length === 1 ? "" : "s"} when you save.`,
      run: () => removeModule(m.id),
    });

  // ----- import -----
  function applyImport({ imported, mode, details }) {
    const mods = imported.modules;
    const patch = { modules: mode === "replace" ? mods : [...course.modules, ...mods] };
    if (details) {
      ["title", "subtitle", "description", "level", "course_type", "is_free", "price", "compare_price", "sequential", "certificate_enabled", "bonus_points"].forEach((k) => {
        if (imported[k] !== "" && imported[k] != null) patch[k] = imported[k];
      });
      if (imported.title && !slugTouched) patch.slug = imported.slug || slugify(imported.title);
      if (imported.hero_url && !course.cover_url) patch.cover_url = imported.hero_url;
    }
    set(patch);
    setSelected(mods[0]?.lessons[0]?.id || null);
    setTab("curriculum");
    setNotice({ kind: "ok", text: `Imported ${mods.length} module${mods.length === 1 ? "" : "s"}. Review it, then press Save.` });
  }

  // ----- save -----
  async function save(nextStatus) {
    const next = { ...course, ...(nextStatus ? { status: nextStatus } : {}) };
    const { errors, warnings } = validateCourse(next, { publishing: next.status === "published" });
    if (existingSlugs.includes(next.slug.trim())) errors.push("Another course already uses that URL slug.");
    if (errors.length) { setProblems({ errors, warnings }); setNotice(null); return; }
    setProblems(warnings.length ? { errors: [], warnings } : null);
    setSaving(true);
    try {
      await saveCourse(next);
      setCourse({ ...next, isNew: false });
      savedRef.current = next;
      setDirty(false);
      setNotice({ kind: "ok", text: next.status === "published" ? "Saved and live for students." : "Saved." });
      onSaved?.({ ...next, isNew: false });
    } catch (err) {
      setNotice({ kind: "error", text: explain(err, "Couldn't save the course.") });
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (!dirty) { onBack(); return; }
    setConfirm({ title: "Leave without saving?", body: "Your unsaved changes will be lost.", confirmLabel: "Leave", run: onBack });
  }

  const total = lessonCount(course);

  return (
    <div className="cs-editor">
      <div className="cs-editor-bar">
        <button type="button" className="admin-btn secondary" onClick={back}>← Courses</button>
        <div className="cs-editor-title">
          <b>{course.title || "Untitled course"}</b>
          <StatusBadge status={course.status} />
          {dirty && <span className="cs-dirty">Unsaved changes</span>}
        </div>
        <div className="cs-editor-actions">
          <button type="button" className="admin-btn secondary" onClick={() => setPreview({})}>Preview</button>
          <button type="button" className="admin-btn secondary" disabled={saving} onClick={() => save()}>{saving ? "Saving…" : "Save"}</button>
          {course.status === "published" ? (
            <button type="button" className="admin-btn secondary" disabled={saving} onClick={() => save("draft")}>Unpublish</button>
          ) : (
            <button type="button" className="admin-btn" disabled={saving} onClick={() => save("published")}>Publish</button>
          )}
        </div>
      </div>

      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      {problems && (
        <Notice kind={problems.errors.length ? "error" : "warn"} onClose={() => setProblems(null)}>
          {problems.errors.length > 0 && <><b>Fix these before saving:</b><ul>{problems.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></>}
          {problems.warnings.length > 0 && <><b>Worth a look:</b><ul>{problems.warnings.map((e, i) => <li key={i}>{e}</li>)}</ul></>}
        </Notice>
      )}

      <div className="cs-tabs" role="tablist">
        {[["details", "Details & pricing"], ["curriculum", `Curriculum (${total})`], ["import", "Import & export"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "details" && (
        <div className="cs-two">
          <section className="admin-card cs-card">
            <h3>Course</h3>
            <div className="form-grid">
              <div className="form-field span-2">
                <span>Course type</span>
                <Segmented value={course.course_type} onChange={(v) => set({ course_type: v })} label="Course type"
                  options={[{ value: "story", label: "Story-based" }, { value: "video", label: "Video-based" }]} />
                <span className="form-hint">Sets what new lessons start as. You can still mix story, video and quiz lessons in one course.</span>
              </div>
              <Field label="Title" span><input type="text" value={course.title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="URL slug" hint={`/academy/learn/?course=${course.slug || "…"}${!course.isNew ? " · changing this breaks existing links" : ""}`}>
                <input type="text" value={course.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} />
              </Field>
              <Field label="Level">
                <select value={course.level} onChange={(e) => set({ level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Subtitle" span><input type="text" value={course.subtitle || ""} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
              <Field label="Description" span><textarea rows={4} value={course.description || ""} onChange={(e) => set({ description: e.target.value })} /></Field>
              <Field label="Status">
                <select value={course.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Display order" hint="Lower numbers show first.">
                <input type="number" value={course.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) || 0 })} />
              </Field>
            </div>
          </section>

          <div className="cs-stack">
            <section className="admin-card cs-card">
              <h3>Hero image</h3>
              <ImageField url={course.cover_url} folder={`courses/${course.id}/hero`} label="hero image" maxWidth={1600}
                onChange={({ url, path }) => set({ cover_url: url, hero_path: path })} />
              <p className="form-hint">Shown on the course card and page. Large photos are shrunk and converted to WebP automatically.</p>
            </section>

            <section className="admin-card cs-card">
              <h3>Course PDF</h3>
              <PdfField courseId={course.id} disabled={!!course.isNew} />
            </section>

            <section className="admin-card cs-card">
              <h3>Price</h3>
              <Toggle checked={course.is_free} onChange={(v) => set({ is_free: v })} label="Free course" hint="Students only need an account." />
              {!course.is_free && (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <Field label="Price (Ksh)"><input type="number" min={0} value={course.price} onChange={(e) => set({ price: e.target.value === "" ? "" : Number(e.target.value) })} /></Field>
                  <Field label="Compare-at price (optional)" hint="Shown struck through.">
                    <input type="number" min={0} value={course.compare_price} onChange={(e) => set({ compare_price: e.target.value === "" ? "" : Number(e.target.value) })} />
                  </Field>
                  <p className="form-hint span-2" style={{ gridColumn: "span 2" }}>
                    Students pay <b>{formatKsh(course.price)}</b>{saving$ > 0 && <> · shows a <b>{saving$}% saving</b></>}.
                  </p>
                </div>
              )}
            </section>

            <section className="admin-card cs-card">
              <h3>Learning options</h3>
              <div className="cs-toggles col">
                <Toggle checked={course.sequential} onChange={(v) => set({ sequential: v })} label="Unlock lessons one by one" hint="A lesson opens after the previous one is finished." />
                <Toggle checked={course.certificate_enabled} onChange={(v) => set({ certificate_enabled: v })} label="Certificate on completion" />
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <Field label="Bonus points on completion"><input type="number" min={0} value={course.bonus_points} onChange={(e) => set({ bonus_points: Number(e.target.value) || 0 })} /></Field>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "curriculum" && (
        <div className="cs-curr">
          <aside className="cs-outline">
            {course.modules.map((m, mi) => (
              <div className="cs-module" key={m.id}>
                <div className="cs-module-head">
                  <input type="text" value={m.title} placeholder="Module title" aria-label="Module title"
                    onChange={(e) => mapModules((ms) => ms.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))} />
                  <span className="cs-block-actions">
                    <button type="button" onClick={() => moveModule(mi, -1)} disabled={mi === 0} aria-label="Move module up">▲</button>
                    <button type="button" onClick={() => moveModule(mi, 1)} disabled={mi === course.modules.length - 1} aria-label="Move module down">▼</button>
                    <button type="button" onClick={() => askRemoveModule(m)} aria-label="Delete module">✕</button>
                  </span>
                </div>
                <ul className="cs-lessons">
                  {m.lessons.map((l, li) => (
                    <li key={l.id} className={(selected === l.id ? "on " : "") + (l.status === "draft" ? "hidden" : "")}>
                      <button type="button" className="cs-lesson-pick" onClick={() => setSelected(l.id)}>
                        <i aria-hidden>{KIND_ICON[l.kind]}</i>
                        <span>{l.title || "Untitled lesson"}</span>
                        {l.is_preview && <em>free</em>}
                        {l.status === "draft" && <em>hidden</em>}
                      </button>
                      <span className="cs-block-actions">
                        <button type="button" onClick={() => moveLesson(m.id, li, -1)} disabled={li === 0} aria-label="Move up">▲</button>
                        <button type="button" onClick={() => moveLesson(m.id, li, 1)} disabled={li === m.lessons.length - 1} aria-label="Move down">▼</button>
                        <button type="button" onClick={() => askRemoveLesson(m, l)} aria-label="Delete lesson">✕</button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="cs-addrow">
                  <button type="button" className="cs-chip" onClick={() => addLesson(m.id, "reading")}>+ Story</button>
                  <button type="button" className="cs-chip" onClick={() => addLesson(m.id, "video")}>+ Video</button>
                  <button type="button" className="cs-chip" onClick={() => addLesson(m.id, "assessment")}>+ Quiz</button>
                </div>
              </div>
            ))}
            <button type="button" className="admin-btn secondary" onClick={addModule}>+ Add module</button>
          </aside>

          <div className="cs-lesson-pane">
            {lessonRef ? (
              <LessonEditor key={lessonRef.l.id} lesson={lessonRef.l} courseId={course.id} onChange={patchLesson}
                onPreview={() => setPreview({ lessonId: lessonRef.l.id })} />
            ) : (
              <div className="cs-empty">
                <p>{total ? "Pick a lesson on the left to edit it." : "This course has no lessons yet."}</p>
                {!total && <button type="button" className="admin-btn" onClick={addModule}>Add the first module</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "import" && <ImportPanel course={course} onApply={applyImport} />}

      {preview && <PreviewModal course={course} lessonId={preview.lessonId} onClose={() => setPreview(null)} />}
      {confirm && (
        <ConfirmModal title={confirm.title} confirmLabel={confirm.confirmLabel || "Delete"} danger onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.run(); setConfirm(null); }}>
          {confirm.body}
        </ConfirmModal>
      )}
    </div>
  );
}
