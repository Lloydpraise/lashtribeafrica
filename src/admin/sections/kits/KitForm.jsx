import { useState } from "react";

export default function KitForm({ kit, products, onSave, onCancel }) {
  const [form, setForm] = useState({ ...kit });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleProduct(id) {
    const current = form.product_ids || [];
    set("product_ids", current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title?.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: form.title,
        eyebrow: form.eyebrow || "",
        description: form.description || "",
        cta_label: form.cta_label || "Shop The Set",
        cta_link: form.cta_link || "#shop",
        product_ids: form.product_ids || [],
      });
    } catch (err) {
      setError(err.message || "Couldn't save kit.");
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <form className="admin-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="admin-modal-header">
          <h2>{form.id ? "Edit Kit" : "Add Kit"}</h2>
          <button type="button" className="admin-modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="admin-modal-body">
          {error && <p className="admin-gate-error">{error}</p>}

          <div className="form-grid">
            <label className="form-field span-2">
              <span>Title</span>
              <input type="text" value={form.title || ""} onChange={(e) => set("title", e.target.value)} required />
            </label>

            <label className="form-field">
              <span>Eyebrow</span>
              <input type="text" value={form.eyebrow || ""} onChange={(e) => set("eyebrow", e.target.value)} />
            </label>

            <label className="form-field">
              <span>CTA label</span>
              <input type="text" value={form.cta_label || ""} onChange={(e) => set("cta_label", e.target.value)} />
            </label>

            <label className="form-field span-2">
              <span>Description</span>
              <textarea rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
            </label>

            <label className="form-field">
              <span>CTA link</span>
              <input type="text" value={form.cta_link || ""} onChange={(e) => set("cta_link", e.target.value)} />
            </label>

            <div className="form-field span-2">
              <span>Products in this kit</span>
              <div className="checkbox-row">
                {products.length === 0 && <span className="form-hint">Add products first, then come back here.</span>}
                {products.map((p) => (
                  <label className="checkbox-pill" key={p.id}>
                    <input
                      type="checkbox"
                      checked={(form.product_ids || []).includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="admin-btn" disabled={saving}>{saving ? "Saving…" : "Save Kit"}</button>
        </div>
      </form>
    </div>
  );
}
