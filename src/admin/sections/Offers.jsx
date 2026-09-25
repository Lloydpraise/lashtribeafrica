import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import OfferForm from "./offers/OfferForm.jsx";
import { fetchOffers, createOffer, updateOffer, deleteOffer, toggleOfferActive } from "./offers/offers.api.js";
import { fetchProducts, fetchCategories } from "./products/products.api.js";

function emptyOffer() {
  return {
    label: "",
    badge_text: "",
    type: "percentage_off",
    scope: "all",
    value: "",
    product_ids: [],
    category_ids: [],
    min_order_value: "",
    starts_at: null,
    ends_at: null,
    is_active: true,
  };
}

function describeScope(offer) {
  if (offer.type === "free_shipping") {
    return offer.min_order_value > 0 ? `Orders over Ksh ${Number(offer.min_order_value).toLocaleString()}` : "All orders";
  }
  if (offer.scope === "all") return "All products";
  if (offer.scope === "products") return `${(offer.product_ids || []).length} product(s)`;
  if (offer.scope === "categories") return `${(offer.category_ids || []).length} categor${(offer.category_ids || []).length === 1 ? "y" : "ies"}`;
  return "—";
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [offerRows, productRows, categoryRows] = await Promise.all([
        fetchOffers(),
        fetchProducts(),
        fetchCategories(),
      ]);
      setOffers(offerRows);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err.message || "Couldn't load offers. Has migration 0004 been run yet?");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload) {
    if (editing.id) {
      const updated = await updateOffer(editing.id, payload);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } else {
      const created = await createOffer(payload);
      setOffers((prev) => [created, ...prev]);
    }
    setEditing(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteOffer(confirmDelete.id);
      setOffers((prev) => prev.filter((o) => o.id !== confirmDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete offer.");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleToggle(offer) {
    try {
      const updated = await toggleOfferActive(offer.id, !offer.is_active);
      setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setError(err.message || "Couldn't update offer.");
    }
  }

  return (
    <div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        <button className="admin-btn" type="button" onClick={() => setEditing(emptyOffer())}>+ Add Offer</button>
      </div>

      {loading ? (
        <p className="form-hint">Loading…</p>
      ) : offers.length === 0 ? (
        <EmptyState
          title="No offers yet"
          description="Add a percentage-off or free-shipping offer. Active offers show automatically on the grid, product pages, ticker, and checkout — nothing changes when there's no active offer."
        />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Type</th>
                <th>Applies to</th>
                <th>Window</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="table-primary">{o.label}</div>
                    {o.badge_text && <div className="table-secondary">{o.badge_text}</div>}
                  </td>
                  <td className="table-secondary">
                    {o.type === "percentage_off" ? `${o.value}% off` : "Free shipping"}
                  </td>
                  <td className="table-secondary">{describeScope(o)}</td>
                  <td className="table-secondary">
                    {o.starts_at || o.ends_at
                      ? `${o.starts_at ? new Date(o.starts_at).toLocaleDateString() : "—"} → ${o.ends_at ? new Date(o.ends_at).toLocaleDateString() : "—"}`
                      : "No dates set"}
                  </td>
                  <td>
                    {o.is_active ? (
                      <span className="admin-badge-active">Active</span>
                    ) : (
                      <span className="admin-badge-inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="admin-btn secondary" onClick={() => handleToggle(o)}>
                        {o.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="admin-btn secondary" onClick={() => setEditing(o)}>Edit</button>
                      <button className="admin-btn secondary danger" onClick={() => setConfirmDelete(o)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <OfferForm offer={editing} products={products} categories={categories} onCancel={() => setEditing(null)} onSave={handleSave} />
      )}

      {confirmDelete && (
        <div className="admin-modal-backdrop" onMouseDown={() => setConfirmDelete(null)}>
          <div className="admin-modal confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-modal-body">
              <h3>Delete "{confirmDelete.label}"?</h3>
              <p className="form-hint">This removes the offer immediately from the storefront.</p>
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
