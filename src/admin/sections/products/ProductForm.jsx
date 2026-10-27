import { useEffect, useMemo, useRef, useState } from "react";
import MediaUploader from "./MediaUploader.jsx";
import ComplementsPicker from "./ComplementsPicker.jsx";
import OptionsEditor, { optionsToEditor, editorToOptions, pruneOptionImages } from "./OptionsEditor.jsx";
import { createCategory, fetchPricingSettings } from "./products.api.js";
import { DEFAULT_PRICING_SETTINGS, formulaPrices, normalizeOptions, shippingFor } from "../../../lib/pricing.js";
import { createSupplier } from "../batches/batches.api.js";
import {
  slugify,
  formatKsh,
  STATUS_OPTIONS,
  STATUS_LABELS,
  FEATURED_SECTION_OPTIONS,
  categoryOptions,
  categoryTree,
} from "./utils.js";

export default function ProductForm({
  product,
  categories,
  suppliers = [],
  allProducts,
  onSave,
  onCancel,
  onCategoriesChange,
  onSuppliersChange,
}) {
  const [form, setForm] = useState(() => ({
    ...product,
    options: optionsToEditor(product.options),
    price_mode: product.price_mode || "manual",
    retail_price: Number(product.retail_price) > 0 ? product.retail_price : "",
    cost_kes: product.cost_kes ?? "",
    cost_usd: product.cost_usd ?? "",
    weight_kg: Number(product.weight_kg) > 0 ? product.weight_kg : "",
    supplier_moq: Number(product.supplier_moq) > 0 ? product.supplier_moq : 1,
  }));
  const [pricing, setPricing] = useState(DEFAULT_PRICING_SETTINGS);

  useEffect(() => {
    fetchPricingSettings()
      .then((row) => row && setPricing({ ...DEFAULT_PRICING_SETTINGS, ...row }))
      .catch(() => {});
  }, []);

  // option names/values already used on other products, offered as suggestions
  const knownOptions = useMemo(
    () => allProducts.filter((p) => p.id !== product.id).flatMap((p) => normalizeOptions(p.options)),
    [allProducts, product.id]
  );
  // one random draw per form, so the suggested market price (retail + a random 30-45%) doesn't jump while typing
  const marketDraw = useRef(Math.random());
  // supplier price: USD cost, or a Ksh cost converted back at the formula's exchange rate
  const costUsd = Number(form.cost_usd) > 0
    ? Number(form.cost_usd)
    : Number(form.cost_kes) > 0 ? Number(form.cost_kes) / (Number(pricing.fx_rate_kes_per_usd) || 1) : 0;
  const suggested = useMemo(() => formulaPrices(costUsd, pricing, marketDraw.current), [costUsd, pricing]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
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

  async function handleAddSupplier() {
    if (!newSupplierName.trim()) return;
    setAddingSupplier(true);
    setError("");
    try {
      const created = await createSupplier({ name: newSupplierName.trim() });
      onSuppliersChange?.((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      set("supplier_id", created.id);
      setNewSupplierName("");
    } catch (err) {
      setError(err.message || "Couldn't create supplier.");
    } finally {
      setAddingSupplier(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await createCategory(newCategoryName.trim(), newCategoryParent || null);
      onCategoriesChange([...categories, created]);
      set("category_id", created.id);
      setNewCategoryName("");
      setNewCategoryParent("");
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
    if (!form.supplier_id) {
      setError("Pick a supplier. Batch PDFs are grouped by supplier, so every product needs one.");
      return;
    }

    let options;
    try {
      options = pruneOptionImages(editorToOptions(form.options), form.images);
    } catch (err) {
      setError(err.message);
      return;
    }
    if (Number(form.retail_price) > 0 && Number(form.now_price) > 0 && Number(form.retail_price) < Number(form.now_price)) {
      setError("Retail price (below the MOQ) can't be lower than the wholesale price.");
      return;
    }
    if (form.price_mode === "formula" && !suggested) {
      setError("To keep this product on the formula, add its supplier cost. Or switch it to manual pricing.");
      return;
    }

    const onFormula = form.price_mode === "formula" && suggested;
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
        supplier_id: form.supplier_id || null,
        complements: form.complements || [],
        featured_sections: form.featured_sections || [],
        // a product kept on the formula takes the formula's prices when saved
        market_price: onFormula ? suggested.market : Number(form.market_price) || 0,
        now_price: onFormula ? suggested.wholesale : Number(form.now_price) || 0,
        retail_price: onFormula ? suggested.retail : Number(form.retail_price) > 0 ? Number(form.retail_price) : null,
        options,
        price_mode: form.price_mode,
        moq: Number(form.moq) || 1,
        // only sent once the column exists (migration 0035) or when a supplier MOQ above 1 is typed
        ...(Number(form.supplier_moq) > 1 || product.supplier_moq !== undefined ? { supplier_moq: Math.max(1, Math.round(Number(form.supplier_moq) || 1)) } : {}),
        // only sent once the column exists (migration 0029) or when a weight is typed
        ...(Number(form.weight_kg) > 0 || product.weight_kg !== undefined ? { weight_kg: Number(form.weight_kg) > 0 ? Number(form.weight_kg) : 0 } : {}),
        stock_quantity: Number(form.stock_quantity) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        images: form.images || [],
        videos: form.videos || [],
        status: form.status,
      }, { cost_kes: form.cost_kes, cost_usd: form.cost_usd });
    } catch (err) {
      setError(err.message || "Couldn't save product.");
      setSaving(false);
    }
  }

  // Typing a price yourself takes the product off the formula (the formula only suggests).
  function setPrice(field, value) {
    setForm((f) => ({ ...f, [field]: value, price_mode: "manual" }));
  }

  function useSuggested() {
    if (!suggested) return;
    setForm((f) => ({
      ...f,
      now_price: suggested.wholesale,
      retail_price: suggested.retail,
      market_price: suggested.market,
    }));
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
        <div className="admin-modal-header pf-header">
          <h2>{form.id ? "Edit Product" : "Add Product"}</h2>
          {/* Publishing sits here, top right, instead of among the other fields. Saved with "Save Product". */}
          <div className="pf-status" role="radiogroup" aria-label="Status">
            {STATUS_OPTIONS.map((s) => (
              <button
                type="button"
                key={s}
                role="radio"
                aria-checked={form.status === s}
                className={`pf-status-btn is-${s}` + (form.status === s ? " on" : "")}
                onClick={() => set("status", s)}
              >
                {STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
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
                {categoryOptions(categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-field">
              <span>New category or subcategory</span>
              <div className="inline-add-row">
                <input
                  type="text"
                  placeholder="e.g. Fast-Drying Glue"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <select
                  value={newCategoryParent}
                  onChange={(e) => setNewCategoryParent(e.target.value)}
                  aria-label="Put the new category under"
                  className="pf-parent-select"
                >
                  <option value="">Main category</option>
                  {categoryTree(categories).map((m) => (
                    <option key={m.id} value={m.id}>Under {m.name}</option>
                  ))}
                </select>
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
              <span>Supplier *</span>
              <select
                value={form.supplier_id || ""}
                onChange={(e) => set("supplier_id", e.target.value)}
              >
                <option value="">— Choose supplier —</option>
                {suppliers.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-field">
              <span>New supplier</span>
              <div className="inline-add-row">
                <input
                  type="text"
                  placeholder="e.g. Seoul Lash Co"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={handleAddSupplier}
                  disabled={addingSupplier}
                >
                  {addingSupplier ? "Adding…" : "Add"}
                </button>
              </div>
            </div>

            <div className="price-box">
              <h4>Prices (Ksh)</h4>
              <p className="form-hint tier-note">
                Customers pay the <b>wholesale</b> price at the MOQ or above, and the <b>retail</b> price below the MOQ.
                The <b>market</b> price is only the crossed-out "was" price.
              </p>
              <label className="form-field">
                <span>Wholesale price (at MOQ or above) *</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.now_price}
                  onChange={(e) => setPrice("now_price", e.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Retail price (below MOQ)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Blank = same as wholesale"
                  value={form.retail_price}
                  onChange={(e) => setPrice("retail_price", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Market price (crossed out, optional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Blank = none shown"
                  value={form.market_price}
                  onChange={(e) => setPrice("market_price", e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Cost (USD, optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_usd}
                  onChange={(e) => set("cost_usd", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Cost (Ksh, optional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.cost_kes}
                  onChange={(e) => set("cost_kes", e.target.value)}
                />
              </label>
              <div className="form-field">
                <span>Costs are private (admin only).</span>
                <label className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={form.price_mode === "formula"}
                    onChange={(e) => set("price_mode", e.target.checked ? "formula" : "manual")}
                    disabled={!suggested}
                  />
                  Keep on formula
                </label>
              </div>

              <div className="price-suggest">
                {suggested ? (
                  <>
                    <span>
                      Suggested from the formula: wholesale <b>{formatKsh(suggested.wholesale)}</b> · retail{" "}
                      <b>{formatKsh(suggested.retail)}</b> · market <b>{formatKsh(suggested.market)}</b>
                    </span>
                    <button type="button" className="admin-btn secondary" onClick={useSuggested}>
                      Use suggested prices
                    </button>
                  </>
                ) : (
                  <span>Enter the supplier cost to see the formula's suggested prices. You can always type your own.</span>
                )}
                {form.price_mode === "formula" && suggested && (
                  <span className="form-hint" style={{ flexBasis: "100%" }}>
                    On the formula: "Reprice formula products" in Site Settings will overwrite these three prices.
                    Typing a price yourself switches this product to manual.
                  </span>
                )}
              </div>
            </div>

            <div className="form-field span-2">
              <span>Variants</span>
              <OptionsEditor
                rows={form.options}
                onChange={(rows) => set("options", rows)}
                knownOptions={knownOptions}
                images={form.images || []}
                basePrice={Number(form.now_price) || 0}
              />
            </div>

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
              <span>MOQ (minimum for wholesale price)</span>
              <input
                type="number"
                min="1"
                value={form.moq}
                onChange={(e) => set("moq", e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Supplier MOQ (e.g. Alibaba minimum)</span>
              <input
                type="number"
                min="1"
                value={form.supplier_moq}
                onChange={(e) => set("supplier_moq", e.target.value)}
              />
              <small className="form-hint">
                Buyers never see this. Orders are pooled per shipment; until this many are paid, the site's MOQ rises to what is still missing. Batches shows the pool. We only sell 10 or fewer. 1 = no minimum.
              </small>
            </label>

            <label className="form-field">
              <span>Weight (kg, estimate)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="e.g. 0.15"
                value={form.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
              />
              <small className="form-hint">
                Shipping to our offices = weight × {formatKsh(pricing.shipping_rate_per_kg)} per kg
                {Number(form.weight_kg) > 0 ? ` = ${formatKsh(shippingFor(form.weight_kg, pricing.shipping_rate_per_kg))} per unit` : ""}.
                Added to the order total at checkout. A variation can have its own weight under Variants.
                {!(Number(form.weight_kg) > 0) ? " Blank = no shipping charged for this product." : ""}
              </small>
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
              {otherProducts.length === 0 ? (
                <span className="form-hint">Save other products first to associate them here.</span>
              ) : (
                <ComplementsPicker
                  value={form.complements || []}
                  products={otherProducts}
                  categories={categories}
                  onChange={(ids) => set("complements", ids)}
                />
              )}
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
