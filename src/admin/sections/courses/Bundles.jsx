import { useState } from "react";
import EmptyState from "../../components/EmptyState.jsx";
import { formatKsh } from "./courseModel.js";
import { emptyBundle, saveBundle, setBundleStatus, deleteBundle, slugify, explain } from "./courses.api.js";
import { Field, StatusBadge, ConfirmModal, Notice } from "./fields.jsx";
import ImageField from "./ImageField.jsx";

function BundleForm({ initial, courses, existingSlugs, onSave, onCancel }) {
  const [b, setB] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!initial.isNew);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p) => setB((x) => ({ ...x, ...p }));

  const chosen = b.course_ids.map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  const separate = chosen.reduce((n, c) => n + (c.is_free ? 0 : c.price), 0);
  const price = Number(b.price) || 0;
  const saved = separate > price && price > 0 ? Math.round((1 - price / separate) * 100) : 0;

  const toggle = (id) => set({ course_ids: b.course_ids.includes(id) ? b.course_ids.filter((x) => x !== id) : [...b.course_ids, id] });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= b.course_ids.length) return;
    const n = b.course_ids.slice();
    [n[i], n[j]] = [n[j], n[i]];
    set({ course_ids: n });
  };

  async function submit(e) {
    e.preventDefault();
    if (!b.title.trim()) return setErr("Give the bundle a title.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug)) return setErr("The slug can only contain lowercase letters, numbers and dashes.");
    if (existingSlugs.includes(b.slug)) return setErr("Another bundle already uses that slug.");
    if (b.course_ids.length < 2) return setErr("A bundle needs at least two courses.");
    if (!(price > 0)) return setErr("Set a bundle price above 0.");
    setBusy(true);
    setErr("");
    try { await onSave(b); } catch (x) { setErr(explain(x)); setBusy(false); }
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <form className="admin-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="admin-modal-header"><h2>{b.isNew ? "New bundle" : "Edit bundle"}</h2><button type="button" className="admin-modal-close" onClick={onCancel}>×</button></div>
        <div className="admin-modal-body">
          {err && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{err}</p>}
          <div className="form-grid">
            <Field label="Title" span><input type="text" value={b.title} onChange={(e) => { set({ title: e.target.value }); if (!slugTouched) set({ slug: slugify(e.target.value) }); }} /></Field>
            <Field label="Slug"><input type="text" value={b.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} /></Field>
            <Field label="Status">
              <select value={b.status} onChange={(e) => set({ status: e.target.value })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Description" span><textarea rows={3} value={b.description || ""} onChange={(e) => set({ description: e.target.value })} /></Field>

            <div className="form-field span-2">
              <span>Courses in this bundle</span>
              <div className="checkbox-row">
                {courses.length === 0 && <span className="form-hint">Create some courses first.</span>}
                {courses.map((c) => (
                  <label className="checkbox-pill" key={c.id}>
                    <input type="checkbox" checked={b.course_ids.includes(c.id)} onChange={() => toggle(c.id)} />
                    {c.title} <small>{c.is_free ? "free" : formatKsh(c.price)}</small>
                    {c.status !== "published" && <small className="cs-draftmark">{c.status}</small>}
                  </label>
                ))}
              </div>
            </div>

            {chosen.length > 0 && (
              <div className="form-field span-2">
                <span>Order shown to students</span>
                <ol className="cs-bundle-order">
                  {chosen.map((c, i) => (
                    <li key={c.id}>
                      <span>{c.title}</span>
                      <span className="cs-block-actions">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} aria-label="Move down">▼</button>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <Field label="Bundle price (Ksh)"><input type="number" min={0} value={b.price} onChange={(e) => set({ price: e.target.value })} /></Field>
            <Field label="Compare-at (optional)" hint={separate ? `Bought separately: ${formatKsh(separate)}` : ""}>
              <input type="number" min={0} value={b.compare_price} onChange={(e) => set({ compare_price: e.target.value })} />
            </Field>
            {saved > 0 && <p className="form-hint" style={{ gridColumn: "span 2" }}>Students save <b>{saved}%</b> ({formatKsh(separate - price)}) compared with buying each course.</p>}
            {separate > 0 && price >= separate && <p className="admin-gate-error" style={{ gridColumn: "span 2" }}>This bundle costs the same or more than buying the courses separately.</p>}

            <div className="form-field span-2">
              <span>Cover image (optional)</span>
              <ImageField url={b.cover_url} folder={`bundles/${b.id}/cover`} label="cover" maxWidth={1400} compact onChange={({ url, path }) => set({ cover_url: url, cover_path: path })} />
            </div>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="admin-btn" disabled={busy}>{busy ? "Saving…" : "Save bundle"}</button>
        </div>
      </form>
    </div>
  );
}

export default function Bundles({ bundles, courses, onReload }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));

  async function run(id, fn, ok) {
    setBusy(id);
    try { await fn(); if (ok) setNotice({ kind: "ok", text: ok }); await onReload(); }
    catch (err) { setNotice({ kind: "error", text: explain(err) }); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      <div className="cs-filters">
        <button className="admin-btn" onClick={() => setEditing(emptyBundle())} disabled={courses.length < 2} title={courses.length < 2 ? "Create at least two courses first" : ""}>+ New bundle</button>
        <span className="form-hint">Bundles sell several courses together at one price.</span>
      </div>

      {bundles.length === 0 ? (
        <EmptyState title="No bundles yet" description="Group courses that work well together and give students a better price for taking them all." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead><tr><th>Bundle</th><th>Courses</th><th>Price</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bundles.map((b) => {
                const list = b.course_ids.map((id) => byId[id]).filter(Boolean);
                const separate = list.reduce((n, c) => n + (c.is_free ? 0 : c.price), 0);
                return (
                  <tr key={b.id} className={busy === b.id ? "cs-busy" : ""}>
                    <td><div className="table-primary">{b.title}</div><div className="table-secondary">/{b.slug}</div></td>
                    <td className="table-secondary">{list.map((c) => <span className="admin-badge cs-mini" key={c.id}>{c.title}</span>)}</td>
                    <td>
                      <div className="table-primary">{formatKsh(b.price)}</div>
                      {separate > b.price && <div className="table-secondary strike">{formatKsh(separate)} separately</div>}
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="admin-btn secondary" onClick={() => setEditing(b)}>Edit</button>
                        {b.status === "published"
                          ? <button className="admin-btn secondary" onClick={() => run(b.id, () => setBundleStatus(b.id, "draft"), "Bundle unpublished.")}>Unpublish</button>
                          : <button className="admin-btn" onClick={() => run(b.id, () => setBundleStatus(b.id, "published"), "Bundle is live.")}>Publish</button>}
                        <button className="admin-btn secondary danger" onClick={() => setDel(b)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BundleForm initial={editing} courses={courses} existingSlugs={bundles.filter((x) => x.id !== editing.id).map((x) => x.slug)}
          onCancel={() => setEditing(null)}
          onSave={async (b) => { await saveBundle(b); setEditing(null); setNotice({ kind: "ok", text: "Bundle saved." }); await onReload(); }} />
      )}
      {del && (
        <ConfirmModal title={`Delete “${del.title}”?`} confirmLabel="Delete bundle" danger onCancel={() => setDel(null)}
          onConfirm={async () => { const b = del; setDel(null); await run(b.id, () => deleteBundle(b.id), "Bundle deleted."); }}>
          The courses themselves are not affected.
        </ConfirmModal>
      )}
    </div>
  );
}
