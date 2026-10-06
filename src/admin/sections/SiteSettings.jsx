import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { fetchSiteSettings, saveSiteSettings, uploadSiteMedia } from "./settings/settings.api.js";
import { fetchProducts } from "./products/products.api.js";

function ListEditor({ label, hint, items, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    onChange([...(items || []), draft.trim()]);
    setDraft("");
  }

  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="form-field span-2">
      <span>{label}</span>
      {hint && <p className="form-hint" style={{ margin: "0 0 8px" }}>{hint}</p>}
      <ul className="feature-edit-list">
        {(items || []).map((item, i) => (
          <li key={i}>
            <span>{item}</span>
            <button type="button" onClick={() => remove(i)}>×</button>
          </li>
        ))}
      </ul>
      <div className="inline-add-row">
        <input
          type="text"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="admin-btn secondary" onClick={add}>Add</button>
      </div>
    </div>
  );
}

export default function SiteSettings() {
  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [bgMode, setBgMode] = useState("image");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    setProductsError("");
    const [settingsResult, productsResult] = await Promise.allSettled([
      fetchSiteSettings(),
      fetchProducts(),
    ]);

    if (settingsResult.status === "fulfilled") {
      const row = settingsResult.value;
      setForm(row);
      setBgMode(row.hero_bg_image?.source === "product" ? "product" : "image");
    } else {
      const err = settingsResult.reason;
      setError(
        err.message ||
          "Couldn't load site settings. Has migration 0004_site_settings_kits_offers.sql been run yet?"
      );
    }

    if (productsResult.status === "fulfilled") {
      setProducts(productsResult.value);
    } else {
      setProductsError(productsResult.reason.message || "Couldn't load products.");
    }

    setLoading(false);
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function changeBgMode(mode) {
    setBgMode(mode);
    set("hero_bg_image", null);
  }

  function selectProduct(productId) {
    const product = products.find((item) => item.id === productId);
    const image = product?.images?.find((item) => item.url);
    if (!product || !image) return;

    set("hero_bg_image", {
      ...image,
      source: "product",
      productId: product.id,
    });
    set("hero_photo_tag", product.name);
    set("hero_cta_primary_link", `/ecommerce/product/${product.slug}`);
  }

  async function handleBgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadSiteMedia(file, "hero");
      set("hero_bg_image", { ...media, source: "upload" });
    } catch (err) {
      setError(err.message || "Couldn't upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        hero_eyebrow: form.hero_eyebrow,
        hero_phrases: form.hero_phrases,
        hero_photo_tag: form.hero_photo_tag,
        hero_bg_image: form.hero_bg_image,
        hero_cta_primary_label: form.hero_cta_primary_label,
        hero_cta_primary_link: form.hero_cta_primary_link,
        hero_cta_secondary_label: form.hero_cta_secondary_label,
        hero_cta_secondary_link: form.hero_cta_secondary_link,
        countdown_label: form.countdown_label,
        countdown_target: form.countdown_target || null,
        countdown_window_days: Number(form.countdown_window_days) || 7,
        countdown_opened_text: form.countdown_opened_text,
        countdown_next_text: form.countdown_next_text,
        ticker_enabled: form.ticker_enabled,
        ticker_messages: form.ticker_messages,
      };
      const updated = await saveSiteSettings(payload);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save site settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="form-hint">Loading…</p>;

  if (!form) {
    return (
      <EmptyState
        title="Site settings not found"
        description="Run supabase/migrations/0004_site_settings_kits_offers.sql to create the settings row, then reload this page."
      />
    );
  }

  // countdown_target comes back as an ISO timestamp; <input type="date"> wants YYYY-MM-DD
  const targetDateValue = form.countdown_target ? String(form.countdown_target).slice(0, 10) : "";

  return (
    <div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 16 }}>{error}</p>}
      {saved && <p className="form-hint" style={{ color: "var(--green)", marginBottom: 16 }}>Saved.</p>}

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Hero</h3></div>
        <div className="form-grid">
          <label className="form-field">
            <span>Eyebrow text</span>
            <input type="text" value={form.hero_eyebrow || ""} onChange={(e) => set("hero_eyebrow", e.target.value)} />
          </label>

          <label className="form-field">
            <span>Photo tag caption</span>
            <input type="text" value={form.hero_photo_tag || ""} onChange={(e) => set("hero_photo_tag", e.target.value)} />
          </label>

          <ListEditor
            label="Rotating headline phrases"
            hint="Shown one at a time, rotating every few seconds. Add at least one."
            items={form.hero_phrases}
            onChange={(items) => set("hero_phrases", items)}
            placeholder="e.g. Direct Sourcing"
          />

          <div className="form-field span-2">
            <span>Background image</span>
            <p className="form-hint" style={{ margin: "0 0 8px" }}>
              Add an image yourself or use a product image with its product link and name.
            </p>
            <label className="form-field" style={{ maxWidth: 320, marginBottom: 12 }}>
              <span>Image source</span>
              <select value={bgMode} onChange={(e) => changeBgMode(e.target.value)}>
                <option value="image">Add image</option>
                <option value="product">Select product</option>
              </select>
            </label>
            {bgMode === "product" ? (
              <label className="form-field" style={{ maxWidth: 480, marginBottom: 12 }}>
                <span>Product</span>
                <select
                  value={form.hero_bg_image?.source === "product" ? form.hero_bg_image.productId : ""}
                  onChange={(e) => selectProduct(e.target.value)}
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => {
                    const hasImage = product.images?.some((image) => image.url);
                    return (
                      <option key={product.id} value={product.id} disabled={!hasImage}>
                        {product.name}{hasImage ? "" : " (no image)"}
                      </option>
                    );
                  })}
                </select>
                {productsError && <p className="admin-gate-error">{productsError}</p>}
                {!productsError && products.length === 0 && (
                  <p className="form-hint">No products are available to select.</p>
                )}
              </label>
            ) : (
              <div className="inline-add-row" style={{ marginBottom: 12 }}>
                <input type="file" accept="image/*" onChange={handleBgUpload} disabled={uploading} />
                {form.hero_bg_image && (
                  <button type="button" className="admin-btn secondary" onClick={() => set("hero_bg_image", null)}>
                    Remove
                  </button>
                )}
              </div>
            )}
            {form.hero_bg_image?.url && (
              <div className="table-thumb" style={{ marginBottom: 8, width: 120, height: 80 }}>
                <img src={form.hero_bg_image.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            {uploading && <p className="form-hint">Uploading…</p>}
          </div>

          <label className="form-field">
            <span>Primary button label</span>
            <input type="text" value={form.hero_cta_primary_label || ""} onChange={(e) => set("hero_cta_primary_label", e.target.value)} />
          </label>
          <label className="form-field">
            <span>Primary button link</span>
            <input type="text" value={form.hero_cta_primary_link || ""} onChange={(e) => set("hero_cta_primary_link", e.target.value)} />
          </label>
          <label className="form-field">
            <span>Secondary button label</span>
            <input type="text" value={form.hero_cta_secondary_label || ""} onChange={(e) => set("hero_cta_secondary_label", e.target.value)} />
          </label>
          <label className="form-field">
            <span>Secondary button link</span>
            <input type="text" value={form.hero_cta_secondary_link || ""} onChange={(e) => set("hero_cta_secondary_link", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Order countdown</h3></div>
        <div className="form-grid">
          <label className="form-field">
            <span>Label</span>
            <input type="text" value={form.countdown_label || ""} onChange={(e) => set("countdown_label", e.target.value)} />
          </label>
          <label className="form-field">
            <span>Ordering window closes on</span>
            <input
              type="date"
              value={targetDateValue}
              onChange={(e) => set("countdown_target", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </label>
          <label className="form-field">
            <span>Window length (days)</span>
            <input type="number" min="1" value={form.countdown_window_days || 7} onChange={(e) => set("countdown_window_days", e.target.value)} />
          </label>
          <label className="form-field">
            <span>"Window opened" text</span>
            <input type="text" value={form.countdown_opened_text || ""} onChange={(e) => set("countdown_opened_text", e.target.value)} />
          </label>
          <label className="form-field">
            <span>"Next batch" text</span>
            <input type="text" value={form.countdown_next_text || ""} onChange={(e) => set("countdown_next_text", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Announcement ticker</h3></div>
        <div className="form-grid">
          <label className="checkbox-pill" style={{ marginBottom: 4 }}>
            <input type="checkbox" checked={form.ticker_enabled !== false} onChange={(e) => set("ticker_enabled", e.target.checked)} />
            Ticker enabled
          </label>
          <ListEditor
            label="Messages"
            hint="Loops across the top of the site. Overridden automatically by a Free Shipping offer when one is active (see Offers)."
            items={form.ticker_messages}
            onChange={(items) => set("ticker_messages", items)}
            placeholder="e.g. MOQ 5 ON MOST PRODUCTS"
          />
        </div>
      </div>

      <button className="admin-btn" type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Site Settings"}
      </button>
    </div>
  );
}
