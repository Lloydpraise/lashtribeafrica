import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import ProductForm from "./products/ProductForm.jsx";
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products/products.api.js";
import { emptyProduct, formatKsh, isLowStock } from "./products/utils.js";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, object = open
  const [confirmDelete, setConfirmDelete] = useState(null);

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
      const [productRows, categoryRows] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(
        err.message ||
          "Couldn't load products. Have the migrations in supabase/migrations been run yet?"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload) {
    if (editing.id) {
      const updated = await updateProduct(editing.id, payload);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } else {
      const created = await createProduct(payload);
      setProducts((prev) => [created, ...prev]);
    }
    setEditing(null);
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
                <th>Stock</th>
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
                  </td>
                  <td>{p.category?.name || "—"}</td>
                  <td>
                    <div className="table-primary">{formatKsh(p.now_price)}</div>
                    <div className="table-secondary strike">
                      {formatKsh(p.market_price)}
                    </div>
                  </td>
                  <td>
                    <span className={isLowStock(p) ? "stock-low" : ""}>
                      {p.stock_quantity}
                    </span>
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
          allProducts={products}
          onCategoriesChange={setCategories}
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
