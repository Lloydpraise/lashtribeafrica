import { useMemo, useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "./products.api.js";
import { categoryTree } from "./utils.js";

// Main categories and their subcategories: rename, move under another main category, reorder, add, delete.
// The shop shows main categories in sort order, each with its subcategories as chips and rails.
export default function CategoriesManager({ categories, products, onChange, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const tree = useMemo(() => categoryTree(categories), [categories]);
  const productCount = useMemo(() => {
    const m = new Map();
    for (const p of products) if (p.category_id) m.set(p.category_id, (m.get(p.category_id) || 0) + 1);
    return m;
  }, [products]);
  const hasTree = categories.some((c) => "parent_id" in c); // false until migration 0025 is run

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(
        err.code === "42703" || /parent_id|sort_order/.test(err.message || "")
          ? "Subcategories need migration 0025_category_tree.sql. Run it in the Supabase SQL editor, then reload."
          : err.message || "Couldn't save the category."
      );
    } finally {
      setBusy(false);
    }
  }

  const save = (cat, patch) =>
    run(async () => {
      const updated = await updateCategory(cat.id, patch);
      onChange(categories.map((c) => (c.id === cat.id ? { ...c, ...updated } : c)));
    });

  const add = () =>
    run(async () => {
      if (!newName.trim()) return;
      const siblings = categories.filter((c) => (c.parent_id || "") === newParent);
      const nextSort = hasTree ? Math.max(0, ...siblings.map((c) => c.sort_order || 0)) + 10 : null;
      const created = await createCategory(newName.trim(), newParent || null, nextSort);
      onChange([...categories, created]);
      setNewName("");
    });

  const remove = (cat) =>
    run(async () => {
      await deleteCategory(cat.id);
      // subcategories of a deleted main category become main categories (on delete set null)
      onChange(categories.filter((c) => c.id !== cat.id).map((c) => (c.parent_id === cat.id ? { ...c, parent_id: null } : c)));
      setConfirmId(null);
    });

  function Row({ cat, isSub, childCount }) {
    const own = productCount.get(cat.id) || 0;
    const subTotal = isSub ? 0 : categories.filter((c) => c.parent_id === cat.id).reduce((n, c) => n + (productCount.get(c.id) || 0), 0);
    return (
      <li className={"cm-row" + (isSub ? " is-sub" : "")}>
        <input
          className="cm-name"
          defaultValue={cat.name}
          aria-label="Category name"
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== cat.name) save(cat, { name });
            else e.target.value = cat.name;
          }}
        />
        {hasTree && (
          <select
            value={cat.parent_id || ""}
            disabled={busy || childCount > 0}
            title={childCount > 0 ? "Move or delete its subcategories first" : "Where this category sits"}
            aria-label="Parent category"
            onChange={(e) => save(cat, { parent_id: e.target.value || null })}
          >
            <option value="">Main category</option>
            {tree
              .filter((m) => m.id !== cat.id)
              .map((m) => (
                <option key={m.id} value={m.id}>Under {m.name}</option>
              ))}
          </select>
        )}
        {hasTree && (
          <input
            className="cm-sort"
            type="number"
            defaultValue={cat.sort_order ?? 0}
            aria-label="Order"
            title="Order: lower numbers show first"
            onBlur={(e) => {
              const n = Number(e.target.value) || 0;
              if (n !== (cat.sort_order ?? 0)) save(cat, { sort_order: n });
            }}
          />
        )}
        <span className="cm-count" title="Products in this category">
          {own + subTotal} product{own + subTotal === 1 ? "" : "s"}
        </span>
        {confirmId === cat.id ? (
          <span className="cm-confirm">
            <button type="button" className="admin-btn danger" disabled={busy} onClick={() => remove(cat)}>Delete</button>
            <button type="button" className="admin-btn secondary" onClick={() => setConfirmId(null)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="admin-btn secondary danger" disabled={busy} onClick={() => setConfirmId(cat.id)}>
            Delete
          </button>
        )}
        {confirmId === cat.id && (
          <small className="cm-confirm-note">
            {own ? `${own} product${own === 1 ? "" : "s"} will have no category. ` : ""}
            {childCount ? `Its ${childCount} subcategor${childCount === 1 ? "y becomes a main category" : "ies become main categories"}.` : ""}
          </small>
        )}
      </li>
    );
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div className="admin-modal cm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Categories</h2>
          <button type="button" className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-modal-body">
          {!hasTree && (
            <p className="ap-warn" style={{ marginTop: 0 }}>
              Run migration 0025_category_tree.sql to group categories into main categories and subcategories.
            </p>
          )}
          {error && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{error}</p>}
          <p className="form-hint" style={{ marginTop: 0 }}>
            Names save when you click away. Lower order numbers show first in the shop.
          </p>

          <ul className="cm-list">
            {tree.map((m) => (
              <li key={m.id} className="cm-group">
                <ul>
                  <Row cat={m} isSub={false} childCount={m.children.length} />
                  {m.children.map((c) => (
                    <Row key={c.id} cat={c} isSub childCount={0} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="cm-add">
            <input
              type="text"
              placeholder="New category, e.g. Fast-Drying Glue"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            {hasTree && (
              <select value={newParent} onChange={(e) => setNewParent(e.target.value)} aria-label="Put the new category under">
                <option value="">Main category</option>
                {tree.map((m) => (
                  <option key={m.id} value={m.id}>Under {m.name}</option>
                ))}
              </select>
            )}
            <button type="button" className="admin-btn" disabled={busy || !newName.trim()} onClick={add}>
              Add
            </button>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
