import { useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState.jsx";
import { formatKsh, toExport } from "./courseModel.js";
import { courseToMarkdown } from "./courseMarkdown.js";
import { fetchCourseFull, setCourseStatus, updateCoursePricing, deleteCourse, duplicateCourse, explain } from "./courses.api.js";
import { Field, Toggle, StatusBadge, ConfirmModal, Notice } from "./fields.jsx";
import PreviewModal from "./PreviewModal.jsx";

function PriceCell({ c }) {
  if (c.is_free) return <span className="admin-badge">Free</span>;
  return (
    <div>
      <div className="table-primary">{formatKsh(c.price)}</div>
      {c.compare_price > c.price && <div className="table-secondary strike">{formatKsh(c.compare_price)}</div>}
    </div>
  );
}

function PriceModal({ course, onSave, onCancel }) {
  const [f, setF] = useState({ is_free: course.is_free, price: course.price || "", compare_price: course.compare_price ?? "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!f.is_free && !(Number(f.price) > 0)) { setErr("Enter a price above 0, or mark the course free."); return; }
    setBusy(true);
    try { await onSave(f); } catch (x) { setErr(explain(x)); setBusy(false); }
  }
  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <form className="admin-modal confirm-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="admin-modal-header"><h2>Price: {course.title}</h2><button type="button" className="admin-modal-close" onClick={onCancel}>×</button></div>
        <div className="admin-modal-body cs-stack">
          <Toggle checked={f.is_free} onChange={(v) => setF({ ...f, is_free: v })} label="Free course" />
          {!f.is_free && (
            <div className="form-grid">
              <Field label="Price (Ksh)"><input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} autoFocus /></Field>
              <Field label="Compare-at (optional)"><input type="number" min={0} value={f.compare_price} onChange={(e) => setF({ ...f, compare_price: e.target.value })} /></Field>
            </div>
          )}
          {err && <p className="admin-gate-error">{err}</p>}
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="admin-btn" disabled={busy}>{busy ? "Saving…" : "Save price"}</button>
        </div>
      </form>
    </div>
  );
}

export default function CourseList({ courses, bundles, onEdit, onReload, onCreate }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [del, setDel] = useState(null);
  const [preview, setPreview] = useState(null);

  const bundleNames = useMemo(() => {
    const m = {};
    bundles.forEach((b) => b.course_ids.forEach((id) => (m[id] ||= []).push(b.title)));
    return m;
  }, [bundles]);

  const rows = courses.filter((c) =>
    (status === "all" || c.status === status) &&
    (type === "all" || c.course_type === type) &&
    (!q.trim() || `${c.title} ${c.slug}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  async function run(id, fn, ok) {
    setBusy(id);
    setNotice(null);
    try { await fn(); if (ok) setNotice({ kind: "ok", text: ok }); await onReload(); }
    catch (err) { setNotice({ kind: "error", text: explain(err) }); }
    finally { setBusy(null); }
  }

  async function openPreview(c) {
    setBusy(c.id);
    try { setPreview(await fetchCourseFull(c.id)); }
    catch (err) { setNotice({ kind: "error", text: explain(err) }); }
    finally { setBusy(null); }
  }

  async function exportAs(c, kind) {
    setBusy(c.id);
    try {
      const full = await fetchCourseFull(c.id);
      const ex = toExport(full);
      const text = kind === "json" ? JSON.stringify(ex, null, 2) : courseToMarkdown(ex);
      const url = URL.createObjectURL(new Blob([text], { type: kind === "json" ? "application/json" : "text/markdown" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${c.slug}.${kind === "json" ? "json" : "md"}` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setNotice({ kind: "error", text: explain(err) }); }
    finally { setBusy(null); }
  }

  const closeMenu = (e) => e.currentTarget.closest("details")?.removeAttribute("open");

  return (
    <div>
      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}

      <div className="cs-filters">
        <input type="text" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">All types</option><option value="story">Story-based</option><option value="video">Video-based</option>
        </select>
        <span className="form-hint">{rows.length} of {courses.length}</span>
      </div>

      {courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create a video or story course, or import one you've built elsewhere." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing matches" description="Try a different search or filter." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead><tr><th>Course</th><th>Lessons</th><th>Price</th><th>Bundles</th><th>Students</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={busy === c.id ? "cs-busy" : ""}>
                  <td>
                    <div className="cs-course-cell">
                      <div className="table-thumb">{c.cover_url ? <img src={c.cover_url} alt="" /> : <div className="table-thumb-placeholder" />}</div>
                      <div>
                        <button type="button" className="cs-linkish table-primary" onClick={() => onEdit(c.id)}>{c.title}</button>
                        <div className="table-secondary">{c.course_type === "video" ? "Video" : "Story"} · {c.level} · /{c.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-secondary">{c.lesson_count}</td>
                  <td>
                    <button type="button" className="cs-linkish" onClick={() => setPricing(c)} title="Edit price"><PriceCell c={c} /></button>
                  </td>
                  <td className="table-secondary">
                    {(bundleNames[c.id] || []).length ? bundleNames[c.id].map((n) => <span className="admin-badge cs-mini" key={n}>{n}</span>) : "—"}
                  </td>
                  <td className="table-secondary">{c.student_count}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="admin-btn secondary" onClick={() => onEdit(c.id)}>Edit</button>
                      <button className="admin-btn secondary" onClick={() => openPreview(c)} disabled={busy === c.id}>Preview</button>
                      {c.status === "published" ? (
                        <button className="admin-btn secondary" disabled={busy === c.id} onClick={() => run(c.id, () => setCourseStatus(c.id, "draft"), `“${c.title}” is now a draft.`)}>Unpublish</button>
                      ) : (
                        <button className="admin-btn" disabled={busy === c.id || c.lesson_count === 0} title={c.lesson_count === 0 ? "Add lessons first" : ""} onClick={() => run(c.id, () => setCourseStatus(c.id, "published"), `“${c.title}” is live.`)}>Publish</button>
                      )}
                      <details className="cs-menu">
                        <summary className="admin-btn secondary" aria-label="More actions">⋯</summary>
                        <div className="cs-menu-pop">
                          <button type="button" onClick={(e) => { closeMenu(e); run(c.id, () => duplicateCourse(c.id, courses.map((x) => x.slug)), "Duplicated as a draft.") }}>Duplicate</button>
                          <button type="button" onClick={(e) => { closeMenu(e); exportAs(c, "json"); }}>Export .json</button>
                          <button type="button" onClick={(e) => { closeMenu(e); exportAs(c, "md"); }}>Export .md</button>
                          {c.status !== "archived" && <button type="button" onClick={(e) => { closeMenu(e); run(c.id, () => setCourseStatus(c.id, "archived"), "Archived."); }}>Archive</button>}
                          <button type="button" className="danger" onClick={(e) => { closeMenu(e); setDel(c); }}>Delete…</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pricing && (
        <PriceModal course={pricing} onCancel={() => setPricing(null)}
          onSave={async (f) => { await updateCoursePricing(pricing.id, f); setPricing(null); setNotice({ kind: "ok", text: "Price updated." }); await onReload(); }} />
      )}
      {del && (
        <ConfirmModal title={`Delete “${del.title}”?`} confirmLabel="Delete course" danger busy={busy === del.id}
          onCancel={() => setDel(null)}
          onConfirm={async () => { const c = del; await run(c.id, () => deleteCourse(c.id), "Course deleted."); setDel(null); }}>
          {del.student_count > 0
            ? `${del.student_count} student${del.student_count === 1 ? " is" : "s are"} enrolled. Deleting removes the course, its lessons, uploaded files and all their progress for good. Archive it instead to hide it without losing anything.`
            : "This removes the course, its lessons and uploaded files for good. Archive it instead if you might want it back."}
        </ConfirmModal>
      )}
      {preview && <PreviewModal course={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
