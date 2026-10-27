import { useState } from "react";
import { categoryOptions, categoryPath } from "../products/utils.js";

export default function OfferForm({ offer, products, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...offer });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

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
    if (form.type === "reduced_moq" && (!form.moq_value || Number(form.moq_value) < 1)) {
      setError("Enter the reduced MOQ (1 or more).");
      return;
    }
    if (form.scope === "products" && (form.product_ids || []).length === 0) {
      setError("Pick at least one product, or switch \"Applies to\".");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        label: form.label,
        badge_text: form.badge_text || null,
        type: form.type,
        scope: form.scope,
        value: form.type === "percentage_off" ? Number(form.value) || 0 : 0,
        moq_value: form.type === "reduced_moq" ? Math.round(Number(form.moq_value)) || null : null,
        campaign: form.campaign || null,
        banner_text: form.campaign ? form.banner_text || null : null,
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
  const isMoq = form.type === "reduced_moq";

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
                <option value="reduced_moq">Reduced MOQ (wholesale price from a lower quantity)</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </label>

            <label className="form-field">
              <span>Badge / ticker text (optional)</span>
              <input
                type="text"
                value={form.badge_text || ""}
                onChange={(e) => set("badge_text", e.target.value)}
                placeholder={isPercentage ? "e.g. 20% OFF" : isMoq ? "e.g. MOQ 2" : "e.g. FREE SHIPPING"}
              />
            </label>

            {isPercentage && (
              <>
                <label className="form-field">
                  <span>Discount (%)</span>
                  <input type="number" min="1" max="90" value={form.value || ""} onChange={(e) => set("value", e.target.value)} required />
                </label>

              </>
            )}

            {isMoq && (
              <label className="form-field">
                <span>Reduced MOQ (units)</span>
                <input type="number" min="1" value={form.moq_value || ""} onChange={(e) => set("moq_value", e.target.value)} required />
                <small className="form-hint">Buyers get the wholesale price from this quantity. Only applies when it is lower than the product's own MOQ.</small>
              </label>
            )}

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
                <span>Products ({(form.product_ids || []).length} selected)</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" style={{ marginBottom: 8 }} />
                <div className="checkbox-row">
                  {products.length === 0 && <span className="form-hint">No products yet.</span>}
                  {products.filter((p) => !q.trim() || (p.name || "").toLowerCase().includes(q.trim().toLowerCase())).map((p) => (
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
                  {/* a main category's offer also covers its subcategories */}
                  {categoryOptions(categories).map((c) => (
                    <label className="checkbox-pill" key={c.id} style={c.isMain ? { fontWeight: 600 } : undefined}>
                      <input
                        type="checkbox"
                        checked={(form.category_ids || []).includes(c.id)}
                        onChange={() => toggleId("category_ids", c.id)}
                      />
                      {categoryPath(c.id, categories)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isFreeShipping && (
              <label className="form-field">
                <span>Minimum order value (Ksh) — leave empty for free shipping on the chosen products</span>
                <input type="number" min="0" value={form.min_order_value || ""} onChange={(e) => set("min_order_value", e.target.value)} />
              </label>
            )}

            <label className="form-field">
              <span>Campaign (homepage banner, product strip, black badge)</span>
              <select value={form.campaign || ""} onChange={(e) => set("campaign", e.target.value)}>
                <option value="">None, a normal offer</option>
                <option value="black_friday">Black Friday Sale</option>
              </select>
            </label>

            {form.campaign && (
              <label className="form-field">
                <span>Moving banner text (optional)</span>
                <input
                  type="text"
                  value={form.banner_text || ""}
                  onChange={(e) => set("banner_text", e.target.value)}
                  placeholder="e.g. BLACK FRIDAY SALE · UP TO 20% OFF"
                />
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
