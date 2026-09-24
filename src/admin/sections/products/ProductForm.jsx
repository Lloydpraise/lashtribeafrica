import { useState } from "react";
import MediaUploader from "./MediaUploader.jsx";
import { createCategory } from "./products.api.js";
import {
  slugify,
  formatKsh,
  STATUS_OPTIONS,
  FEATURED_SECTION_OPTIONS,
} from "./utils.js";

export default function ProductForm({
  product,
  categories,
  allProducts,
  onSave,
  onCancel,
  onCategoriesChange,
}) {
  const [form, setForm] = useState({ ...product });
  const [slugTouched, setSlugTouched] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleNameChange(value) {
    set("name", value);
    if (!slugTouched) {
      set("slug", slugify(value));
    }
  }

  function toggleFeaturedSection(value) {
    const current = form.featured_sections || [];
    set(
      "featured_sections",
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  }

  function toggleComplement(id) {
    const current = form.complements || [];
    set(
      "complements",
      current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id]
    );
  }

  function addFeature() {
    if (!newFeature.trim()) return;
    set("features", [...(form.features || []), newFeature.trim()]);
    setNewFeature("");
  }

  function removeFeature(index) {
    set(
      "features",
      form.features.filter((_, i) => i !== index)
    );
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await createCategory(newCategoryName.trim());
      onCategoriesChange([...categories, created]);
      set("category_id", created.id);
      setNewCategoryName("");
    } catch (err) {
      setError(err.message || "Couldn't create category.");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        sku: form.sku || null,
        slug: form.slug,
        name: form.name,
        description: form.description || null,
        features: form.features || [],
        note: savingsNote || null,
        badge: form.badge || null,
        icon: form.icon || null,
        category_id: form.category_id || null,
        complements: form.complements || [],
        featured_sections: form.featured_sections || [],
        market_price: Number(form.market_price) || 0,
        now_price: Number(form.now_price) || 0,
        cost_price: form.cost_price === "" ? null : Number(form.cost_price),
        moq: Number(form.moq) || 1,
        stock_quantity: Number(form.stock_quantity) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        images: form.images || [],
        videos: form.videos || [],
        status: form.status,
      });
    } catch (err) {
      setError(err.message || "Couldn't save product.");
      setSaving(false);
    }
  }

  const savings = Math.max(
    0,
    (Number(form.market_price) || 0) - (Number(form.now_price) || 0)
  );
  const savingsNote = savings > 0 ? `Save ${formatKsh(savings)} on it!` : "";
  const otherProducts = allProducts.filter((p) => p.id !== form.id);

  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <form
        className="admin-modal product-form"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="admin-modal-header">
          <h2>{form.id ? "Edit Product" : "Add Product"}</h2>
          <button type="button" className="admin-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="admin-modal-body">
          {error && <p className="admin-gate-error">{error}</p>}

          <div className="form-grid">
            <div className="media-fields-row">
              <div className="form-field">
                <span>Images</span>
                <MediaUploader
                  kind="image"
                  items={form.images || []}
                  onChange={(items) => set("images", items)}
                  productSlug={form.slug}
                />
              </div>

              <div className="form-field">
                <span>Demo Videos</span>
                <MediaUploader
                  kind="video"
                  items={form.videos || []}
                  onChange={(items) => set("videos", items)}
                  productSlug={form.slug}
                />
              </div>
            </div>

            <label className="form-field span-2">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </label>

            <label className="form-field">
              <span>Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                required
              />
            </label>

            <label className="form-field">
              <span>SKU</span>
              <input
                type="text"
                value={form.sku || ""}
                onChange={(e) => set("sku", e.target.value)}
              />
            </label>

            <label className="form-field span-2">
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>

            <div className="form-field span-2">
              <span>Features</span>
              <ul className="feature-edit-list">
                {(form.features || []).map((f, i) => (
                  <li key={i}>
                    <span>{f}</span>
                    <button type="button" onClick={() => removeFeature(i)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="inline-add-row">
                <input
                  type="text"
                  placeholder="Add a feature and press Enter"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <button type="button" className="admin-btn secondary" onClick={addFeature}>
                  Add
                </button>
              </div>
            </div>

            <label className="form-field">
              <span>Category</span>
              <select
                value={form.category_id || ""}
                onChange={(e) => set("category_id", e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-field">
              <span>New category</span>
              <div className="inline-add-row">
                <input
                  type="text"
                  placeholder="e.g. Lash Fans"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={handleAddCategory}
                  disabled={addingCategory}
                >
                  {addingCategory ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            <label className="form-field">
              <span>Market Price (Ksh)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.market_price}
                onChange={(e) => set("market_price", e.target.value)}
                required
              />
            </label>

            <label className="form-field">
              <span>Now Price (Ksh)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.now_price}
                onChange={(e) => set("now_price", e.target.value)}
                required
              />
            </label>

            <label className="form-field">
              <span>Cost Price (Ksh, optional)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.cost_price}
                onChange={(e) => set("cost_price", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Note (highlight text)</span>
              <input
                type="text"
                value={savingsNote}
                placeholder="Enter a lower now price to show savings"
                readOnly
              />
            </label>

            <label className="form-field">
              <span>Badge (optional)</span>
              <input
                type="text"
                placeholder="e.g. Best Seller"
                value={form.badge || ""}
                onChange={(e) => set("badge", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>MOQ</span>
              <input
                type="number"
                min="1"
                value={form.moq}
                onChange={(e) => set("moq", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Stock Quantity</span>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => set("stock_quantity", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Low Stock Threshold</span>
              <input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={(e) => set("low_stock_threshold", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-field span-2">
              <span>Show in</span>
              <div className="checkbox-row">
                {FEATURED_SECTION_OPTIONS.map((opt) => (
                  <label className="checkbox-pill" key={opt.value}>
                    <input
                      type="checkbox"
                      checked={(form.featured_sections || []).includes(opt.value)}
                      onChange={() => toggleFeaturedSection(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field span-2">
              <span>Goes together with</span>
              <div className="checkbox-row">
                {otherProducts.length === 0 && (
                  <span className="form-hint">
                    Save other products first to associate them here.
                  </span>
                )}
                {otherProducts.map((p) => (
                  <label className="checkbox-pill" key={p.id}>
                    <input
                      type="checkbox"
                      checked={(form.complements || []).includes(p.id)}
                      onChange={() => toggleComplement(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="admin-btn" disabled={saving}>
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
