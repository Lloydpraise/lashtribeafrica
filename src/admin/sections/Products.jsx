import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ProductForm from "./products/ProductForm.jsx";
import CategoriesManager from "./products/CategoriesManager.jsx";
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  assignSupplier,
  bulkUpdateProducts,
} from "./products/products.api.js";
import { fetchSuppliers } from "./batches/batches.api.js";
import {
  emptyProduct,
  formatKsh,
  STATUS_LABELS,
  categoryOptions,
  categoryPath,
  categoryWithChildren,
} from "./products/utils.js";
import "../admin-products.css";

const PAGE = 100; // rows drawn at a time; "Show more" adds the next 100

const SORTS = {
  manual: { label: "Shop order", fn: (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
  newest: { label: "Newest first", fn: (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")) },
  price: { label: "Price, low to high", fn: (a, b) => Number(a.now_price || 0) - Number(b.now_price || 0) },
  priceDesc: { label: "Price, high to low", fn: (a, b) => Number(b.now_price || 0) - Number(a.now_price || 0) },
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, object = open
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [bulkSupplier, setBulkSupplier] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // list controls
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(""); // "" = all, "none" = no category, else an id
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sort, setSort] = useState("manual");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState(() => new Set());
  const [moveTo, setMoveTo] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onAddProduct = () => setEditing(emptyProduct());
    window.addEventListener("admin:add-product", onAddProduct);
    return () => window.removeEventListener("admin:add-product", onAddProduct);
  }, []);

  useEffect(() => setShown(PAGE), [query, statusTab, categoryFilter, supplierFilter, sort]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows, supplierRows] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchSuppliers().catch(() => []),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
      setSuppliers(supplierRows);
    } catch (err) {
      setError(
        err.message ||
          "Couldn't load products. Have the migrations in supabase/migrations been run yet?"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload, costs) {
    if (editing.id) {
      const updated = await updateProduct(editing.id, payload, costs);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } else {
      const created = await createProduct(payload, costs);
      setProducts((prev) => [created, ...prev]);
    }
    setEditing(null);
  }

  const unassigned = products.filter((p) => !p.supplier_id);

  async function handleBulkAssign() {
    if (!bulkSupplier || !unassigned.length) return;
    setBulkBusy(true);
    setError("");
    try {
      await assignSupplier(bulkSupplier, unassigned.map((p) => p.id));
      const sup = suppliers.find((x) => x.id === bulkSupplier);
      const ids = new Set(unassigned.map((p) => p.id));
      setProducts((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, supplier_id: bulkSupplier, supplier: sup ? { id: sup.id, name: sup.name } : null } : p)));
      setBulkSupplier("");
    } catch (err) {
      setError(err.message || "Couldn't assign the supplier.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteProduct(confirmDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(confirmDelete.id);
        return next;
      });
    } catch (err) {
      setError(err.message || "Couldn't delete product.");
    } finally {
      setConfirmDelete(null);
    }
  }

  // ---------- filtering ----------
  const searchText = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const optionWords = (p.options || []).flatMap((o) => [o.name, ...(o.values || []).map((v) => v.value)]);
      m.set(
        p.id,
        [p.name, p.sku, p.slug, categoryPath(p.category_id, categories), p.supplier?.name, ...optionWords]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      );
    }
    return m;
  }, [products, categories]);

  // everything except the status tab, so the tab counts match what each tab would show
  const filteredAnyStatus = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const inCategory = categoryFilter && categoryFilter !== "none" ? categoryWithChildren(categoryFilter, categories) : null;
    return products.filter((p) => {
      if (categoryFilter === "none" && p.category_id) return false;
      if (inCategory && !inCategory.has(p.category_id)) return false;
      if (supplierFilter === "none" && p.supplier_id) return false;
      if (supplierFilter && supplierFilter !== "none" && p.supplier_id !== supplierFilter) return false;
      if (terms.length) {
        const text = searchText.get(p.id) || "";
        if (!terms.every((t) => text.includes(t))) return false;
      }
      return true;
    });
  }, [products, categories, query, categoryFilter, supplierFilter, searchText]);

  const counts = useMemo(() => {
    const c = { all: filteredAnyStatus.length, active: 0, draft: 0, archived: 0 };
    for (const p of filteredAnyStatus) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [filteredAnyStatus]);

  const visible = useMemo(() => {
    const list = statusTab === "all" ? filteredAnyStatus : filteredAnyStatus.filter((p) => p.status === statusTab);
    return [...list].sort((a, b) => SORTS[sort].fn(a, b) || a.name.localeCompare(b.name));
  }, [filteredAnyStatus, statusTab, sort]);

  const filtersOn = Boolean(query || categoryFilter || supplierFilter || statusTab !== "all");

  // ---------- selection ----------
  const selectedVisible = visible.filter((p) => selected.has(p.id)).length;
  const allVisibleSelected = visible.length > 0 && selectedVisible === visible.length;
  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisible > 0 && !allVisibleSelected;
  }, [selectedVisible, allVisibleSelected]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((p) => next.delete(p.id));
      else visible.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function applyBulk(patch, doneText) {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      await bulkUpdateProducts(ids, patch);
      const idSet = new Set(ids);
      const extra = {};
      if ("category_id" in patch) {
        const c = categories.find((x) => x.id === patch.category_id);
        extra.category = c ? { id: c.id, name: c.name, slug: c.slug } : null;
      }
      setProducts((prev) => prev.map((p) => (idSet.has(p.id) ? { ...p, ...patch, ...extra } : p)));
      setSelected(new Set());
      setMoveTo("");
      setNotice(`${ids.length} product${ids.length === 1 ? "" : "s"} ${doneText}.`);
    } catch (err) {
      setError(err.message || "Couldn't update the selected products.");
    } finally {
      setBulkBusy(false);
    }
  }

  const selectedNoPhoto = products.filter((p) => selected.has(p.id) && !(p.images || []).length).length;

  function handleCategoriesChange(next) {
    // a deleted category leaves its products uncategorised (on delete set null)
    const ids = new Set(next.map((c) => c.id));
    setProducts((prev) =>
      prev.map((p) => (p.category_id && !ids.has(p.category_id) ? { ...p, category_id: null, category: null } : p))
    );
    if (categoryFilter && categoryFilter !== "none" && !ids.has(categoryFilter)) setCategoryFilter("");
    setCategories(next);
  }

  return (
    <div className="ap">
      {error && (
        <p className="admin-gate-error" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}

      {!loading && unassigned.length > 0 && (
        <div className="admin-card bt-bulk">
          <div>
            <b>{unassigned.length} product{unassigned.length === 1 ? " has" : "s have"} no supplier.</b>
            <div className="form-hint" style={{ margin: "2px 0 0" }}>
              Batch PDFs group what to order by supplier. {suppliers.length === 0 ? "Add suppliers in Site Settings first." : "Set one for all of them, then fix any exceptions by editing the product."}
            </div>
          </div>
          {suppliers.length > 0 && (
            <div className="bt-inline">
              <select value={bulkSupplier} onChange={(e) => setBulkSupplier(e.target.value)} aria-label="Supplier for products without one">
                <option value="">— Choose supplier —</option>
                {suppliers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
              <button type="button" className="admin-btn" disabled={bulkBusy || !bulkSupplier} onClick={handleBulkAssign}>
                {bulkBusy ? "Applying…" : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="form-hint">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product, or run the seed migration (supabase/migrations/0003_seed_products.sql) to bring in the 6 products already live on the storefront."
        />
      ) : (
        <div className="admin-card ap-card">
          {/* Header: counts on the left; publishing and the other bulk actions top right. Sticks while scrolling. */}
          <div className={"ap-head" + (selected.size ? " has-selection" : "")}>
            <div className="ap-head-left">
              {selected.size ? (
                <>
                  <b>{selected.size} selected</b>
                  <button type="button" className="ap-link" onClick={() => setSelected(new Set())}>Clear</button>
                  {selectedNoPhoto > 0 && <span className="ap-warn">{selectedNoPhoto} without a photo</span>}
                </>
              ) : (
                <>
                  <b>{products.length} products</b>
                  <span className="ap-muted">
                    {products.filter((p) => p.status === "active").length} published · tick products to change many at once
                  </span>
                </>
              )}
            </div>
            <div className="ap-head-actions">
              {selected.size ? (
                <>
                  <button type="button" className="admin-btn ap-publish" disabled={bulkBusy} onClick={() => applyBulk({ status: "active" }, "published")}>
                    {bulkBusy ? "Saving…" : `Publish ${selected.size}`}
                  </button>
                  <button type="button" className="admin-btn secondary" disabled={bulkBusy} onClick={() => applyBulk({ status: "draft" }, "moved to drafts")}>
                    Unpublish
                  </button>
                  <button type="button" className="admin-btn secondary" disabled={bulkBusy} onClick={() => applyBulk({ status: "archived" }, "archived")}>
                    Archive
                  </button>
                  <span className="ap-move">
                    <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Move selected to category">
                      <option value="">Move to category…</option>
                      {categoryOptions(categories).map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <button type="button" className="admin-btn secondary" disabled={bulkBusy || !moveTo} onClick={() => applyBulk({ category_id: moveTo }, `moved to ${categoryPath(moveTo, categories)}`)}>
                      Move
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <button type="button" className="admin-btn secondary" onClick={() => setManagingCategories(true)}>
                    Categories
                  </button>
                  <button type="button" className="admin-btn" onClick={() => setEditing(emptyProduct())}>
                    + Add product
                  </button>
                </>
              )}
            </div>
          </div>

          {notice && (
            <p className="ap-notice" role="status">
              {notice} <button type="button" className="ap-link" onClick={() => setNotice("")}>OK</button>
            </p>
          )}

          <div className="ap-tabs" role="tablist">
            {[
              ["all", "All"],
              ["active", STATUS_LABELS.active],
              ["draft", STATUS_LABELS.draft],
              ["archived", STATUS_LABELS.archived],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={statusTab === key}
                className={"ap-tab" + (statusTab === key ? " on" : "")}
                onClick={() => setStatusTab(key)}
              >
                {label} <span>{counts[key] || 0}</span>
              </button>
            ))}
          </div>

          <div className="ap-filters">
            <input
              type="search"
              className="ap-search"
              placeholder="Search name, SKU, category, variant…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categoryOptions(categories).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
              <option value="none">No category</option>
            </select>
            {suppliers.length > 0 && (
              <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} aria-label="Supplier">
                <option value="">All suppliers</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="none">No supplier</option>
              </select>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
            </select>
            {filtersOn && (
              <button
                type="button"
                className="ap-link"
                onClick={() => {
                  setQuery("");
                  setCategoryFilter("");
                  setSupplierFilter("");
                  setStatusTab("all");
                }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="ap-list">
            <label className="ap-row ap-row-head">
              <input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
              <span>
                {allVisibleSelected ? "Unselect" : "Select"} all {visible.length}
                {filtersOn ? " shown" : ""}
              </span>
            </label>

            {visible.length === 0 && <p className="ap-empty">No products match these filters.</p>}

            {visible.slice(0, shown).map((p) => (
              <div key={p.id} className={"ap-row" + (selected.has(p.id) ? " is-selected" : "")}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                <div className="ap-thumb">
                  {p.images?.[0] ? (
                    <img src={p.images[0].url} alt="" loading="lazy" />
                  ) : p.icon ? (
                    <svg viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: p.icon }} />
                  ) : (
                    <div className="table-thumb-placeholder" />
                  )}
                </div>
                <button type="button" className="ap-main" onClick={() => setEditing(p)}>
                  <span className="ap-name">{p.name}</span>
                  <span className="ap-sub">
                    {categoryPath(p.category_id, categories) || p.category?.name || "No category"}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </span>
                  {Array.isArray(p.options) && p.options.length > 0 && (
                    <span className="ap-sub">
                      {p.options.map((o) => `${o.name} (${(o.values || []).length})`).join(" · ")}
                    </span>
                  )}
                </button>
                <div className="ap-price">
                  <b>{formatKsh(p.now_price)}</b>
                  <small>{Number(p.retail_price) > 0 ? `${formatKsh(p.retail_price)} retail` : "wholesale"}</small>
                </div>
                <div className="ap-meta">
                  <span className={`status-pill status-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span>
                  <small className={p.supplier ? "" : "stock-low"}>{p.supplier?.name || "No supplier"}</small>
                </div>
                <div className="ap-actions">
                  <button className="admin-btn secondary" onClick={() => setEditing(p)}>Edit</button>
                  <button className="admin-btn secondary danger" onClick={() => setConfirmDelete(p)} aria-label={`Delete ${p.name}`}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {visible.length > shown && (
              <button type="button" className="admin-btn secondary ap-more" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({visible.length - shown} left)
              </button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing}
          categories={categories}
          suppliers={suppliers}
          allProducts={products}
          onCategoriesChange={setCategories}
          onSuppliersChange={setSuppliers}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {managingCategories && (
        <CategoriesManager
          categories={categories}
          products={products}
          onChange={handleCategoriesChange}
          onClose={() => setManagingCategories(false)}
        />
      )}

      {confirmDelete && (
        <div className="admin-modal-backdrop" onMouseDown={() => setConfirmDelete(null)}>
          <div className="admin-modal confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-body">
              <h3>Delete "{confirmDelete.name}"?</h3>
              <p className="form-hint">
                This removes the product record. Uploaded images/videos stay
                in storage unless you remove them from the product first.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-btn secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button className="admin-btn danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
