import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import KitForm from "./kits/KitForm.jsx";
import { fetchKits, createKit, updateKit, deleteKit, setActiveKit } from "./kits/kits.api.js";
import { fetchProducts } from "./products/products.api.js";

function emptyKit() {
  return {
    title: "",
    eyebrow: "You Should Have",
    description: "",
    cta_label: "Shop The Set",
    cta_link: "#shop",
    product_ids: [],
  };
}

export default function Kits() {
  const [kits, setKits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [kitRows, productRows] = await Promise.all([fetchKits(), fetchProducts()]);
      setKits(kitRows);
      setProducts(productRows);
    } catch (err) {
      setError(err.message || "Couldn't load kits. Has migration 0004 been run yet?");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload) {
    if (editing.id) {
      const updated = await updateKit(editing.id, payload);
      setKits((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    } else {
      const created = await createKit(payload);
      setKits((prev) => [created, ...prev]);
    }
    setEditing(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteKit(confirmDelete.id);
      setKits((prev) => prev.filter((k) => k.id !== confirmDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete kit.");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleSetActive(kit) {
    setSwitching(kit.id);
    setError("");
    try {
      await setActiveKit(kit.id);
      setKits((prev) => prev.map((k) => ({ ...k, is_active: k.id === kit.id })));
    } catch (err) {
      setError(err.message || "Couldn't switch the active kit.");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        <button className="admin-btn" type="button" onClick={() => setEditing(emptyKit())}>+ Add Kit</button>
      </div>

      {loading ? (
        <p className="form-hint">Loading…</p>
      ) : kits.length === 0 ? (
        <EmptyState
          title="No kits yet"
          description="Create a kit and set it active to have it show in the Kit Strip section on the storefront."
        />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Products</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {kits.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div className="table-primary">{k.title}</div>
                    <div className="table-secondary">{k.eyebrow}</div>
                  </td>
                  <td className="table-secondary">{(k.product_ids || []).length} product(s)</td>
                  <td>
                    {k.is_active ? (
                      <span className="admin-badge-active">Active</span>
                    ) : (
                      <span className="admin-badge-inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {!k.is_active && (
                        <button
                          className="admin-btn secondary"
                          onClick={() => handleSetActive(k)}
                          disabled={switching === k.id}
                        >
                          {switching === k.id ? "Switching…" : "Set Active"}
                        </button>
                      )}
                      <button className="admin-btn secondary" onClick={() => setEditing(k)}>Edit</button>
                      <button className="admin-btn secondary danger" onClick={() => setConfirmDelete(k)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <KitForm kit={editing} products={products} onCancel={() => setEditing(null)} onSave={handleSave} />
      )}

      {confirmDelete && (
        <div className="admin-modal-backdrop" onMouseDown={() => setConfirmDelete(null)}>
          <div className="admin-modal confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-body">
              <h3>Delete "{confirmDelete.title}"?</h3>
              <p className="form-hint">This removes the kit. It'll stop showing on the storefront if it was active.</p>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="admin-btn danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
