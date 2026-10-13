import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ProductForm from "./products/ProductForm.jsx";
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  assignSupplier,
} from "./products/products.api.js";
import { fetchSuppliers } from "./batches/batches.api.js";
import { emptyProduct, formatKsh } from "./products/utils.js";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, object = open
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [bulkSupplier, setBulkSupplier] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onAddProduct = () => setEditing(emptyProduct());
    window.addEventListener("admin:add-product", onAddProduct);
    return () => window.removeEventListener("admin:add-product", onAddProduct);
  }, []);

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
    } catch (err) {
      setError(err.message || "Couldn't delete product.");
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div>
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
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Supplier</th>
                <th>MOQ</th>
                <th>Status</th>
                <th>Shown in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-thumb">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" />
                      ) : p.icon ? (
                        <svg viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: p.icon }} />
                      ) : (
                        <div className="table-thumb-placeholder" />
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-primary">{p.name}</div>
                    <div className="table-secondary">{p.sku || p.slug}</div>
                    {Array.isArray(p.options) && p.options.length > 0 && (
                      <div className="table-secondary">
                        {p.options.map((o) => `${o.name} (${(o.values || []).length})`).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td>{p.category?.name || "—"}</td>
                  <td>
                    <div className="table-primary">{formatKsh(p.now_price)} <small>wholesale</small></div>
                    <div className="table-secondary">
                      {Number(p.retail_price) > 0 ? `${formatKsh(p.retail_price)} retail` : "retail = wholesale"}
                    </div>
                    {Number(p.market_price) > 0 && (
                      <div className="table-secondary strike">{formatKsh(p.market_price)}</div>
                    )}
                  </td>
                  <td className={p.supplier ? "" : "stock-low"}>
                    {p.supplier?.name || "No supplier"}
                  </td>
                  <td>{p.moq}</td>
                  <td>
                    <span className={`status-pill status-${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="table-secondary">
                    {(p.featured_sections || []).join(", ") || "—"}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="admin-btn secondary"
                        onClick={() => setEditing(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn secondary danger"
                        onClick={() => setConfirmDelete(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
