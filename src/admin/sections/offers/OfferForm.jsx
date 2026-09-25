import { useState } from "react";

export default function OfferForm({ offer, products, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...offer });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleId(field, id) {
    const current = form[field] || [];
    set(field, current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label?.trim()) {
      setError("Label is required.");
      return;
    }
    if (form.type === "percentage_off" && (!form.value || Number(form.value) <= 0)) {
      setError("Enter a discount percentage greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        label: form.label,
        badge_text: form.badge_text || null,
        type: form.type,
        scope: form.type === "free_shipping" ? "all" : form.scope,
        value: form.type === "percentage_off" ? Number(form.value) || 0 : 0,
        product_ids: form.scope === "products" ? form.product_ids || [] : [],
        category_ids: form.scope === "categories" ? form.category_ids || [] : [],
        min_order_value: form.type === "free_shipping" ? Number(form.min_order_value) || 0 : 0,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active !== false,
      });
    } catch (err) {
      setError(err.message || "Couldn't save offer.");
      setSaving(false);
    }
  }

  const isPercentage = form.type === "percentage_off";
  const isFreeShipping = form.type === "free_shipping";

  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <form className="admin-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="admin-modal-header">
          <h2>{form.id ? "Edit Offer" : "Add Offer"}</h2>
          <button type="button" className="admin-modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="admin-modal-body">
          {error && <p className="admin-gate-error">{error}</p>}

          <div className="form-grid">
            <label className="form-field span-2">
              <span>Internal label</span>
              <input type="text" value={form.label || ""} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Black Friday 20%" required />
            </label>

            <label className="form-field">
              <span>Type</span>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="percentage_off">% off</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </label>

            <label className="form-field">
              <span>Badge / ticker text (optional)</span>
              <input
                type="text"
                value={form.badge_text || ""}
                onChange={(e) => set("badge_text", e.target.value)}
                placeholder={isPercentage ? "e.g. 20% OFF" : "e.g. FREE SHIPPING"}
              />
            </label>

            {isPercentage && (
              <>
                <label className="form-field">
                  <span>Discount (%)</span>
                  <input type="number" min="1" max="90" value={form.value || ""} onChange={(e) => set("value", e.target.value)} required />
                </label>

                <label className="form-field">
                  <span>Applies to</span>
                  <select value={form.scope} onChange={(e) => set("scope", e.target.value)}>
                    <option value="all">All products</option>
                    <option value="products">Specific products</option>
                    <option value="categories">Specific categories</option>
                  </select>
                </label>

                {form.scope === "products" && (
                  <div className="form-field span-2">
                    <span>Products</span>
                    <div className="checkbox-row">
                      {products.length === 0 && <span className="form-hint">No products yet.</span>}
                      {products.map((p) => (
                        <label className="checkbox-pill" key={p.id}>
                          <input
                            type="checkbox"
                            checked={(form.product_ids || []).includes(p.id)}
                            onChange={() => toggleId("product_ids", p.id)}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {form.scope === "categories" && (
                  <div className="form-field span-2">
                    <span>Categories</span>
                    <div className="checkbox-row">
                      {categories.length === 0 && <span className="form-hint">No categories yet.</span>}
                      {categories.map((c) => (
                        <label className="checkbox-pill" key={c.id}>
                          <input
                            type="checkbox"
                            checked={(form.category_ids || []).includes(c.id)}
                            onChange={() => toggleId("category_ids", c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {isFreeShipping && (
              <label className="form-field">
                <span>Minimum order value (Ksh)</span>
                <input type="number" min="0" value={form.min_order_value || ""} onChange={(e) => set("min_order_value", e.target.value)} />
              </label>
            )}

            <label className="form-field">
              <span>Starts (optional)</span>
              <input
                type="date"
                value={form.starts_at ? String(form.starts_at).slice(0, 10) : ""}
                onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </label>

            <label className="form-field">
              <span>Ends (optional)</span>
              <input
                type="date"
                value={form.ends_at ? String(form.ends_at).slice(0, 10) : ""}
                onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </label>

            <label className="checkbox-pill span-2" style={{ width: "fit-content" }}>
              <input type="checkbox" checked={form.is_active !== false} onChange={(e) => set("is_active", e.target.checked)} />
              Active
            </label>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="admin-btn" disabled={saving}>{saving ? "Saving…" : "Save Offer"}</button>
        </div>
      </form>
    </div>
  );
}
