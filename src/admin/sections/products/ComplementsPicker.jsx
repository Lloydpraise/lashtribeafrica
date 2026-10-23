import { useMemo, useState } from "react";
import { categoryPath } from "./utils.js";

// "Goes together with": the chosen products as chips, plus a search box that lists matching products.
// Built for long catalogs: only the first 40 matches are drawn, filtered by name, SKU, slug or category.
export default function ComplementsPicker({ value = [], products = [], categories = [], onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const chosen = value.map((id) => byId.get(id)).filter(Boolean);

  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const picked = new Set(value);
    return products
      .filter((p) => !picked.has(p.id))
      .filter((p) => {
        if (!terms.length) return true;
        const text = [p.name, p.sku, p.slug, categoryPath(p.category_id, categories)].join(" ").toLowerCase();
        return terms.every((t) => text.includes(t));
      })
      .slice(0, 40);
  }, [products, categories, query, value]);

  const add = (id) => onChange([...value, id]);
  const remove = (id) => onChange(value.filter((v) => v !== id));

  return (
    <div className="cp">
      {chosen.length > 0 ? (
        <ul className="cp-chosen">
          {chosen.map((p) => (
            <li key={p.id}>
              {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" /> : <span className="cp-noimg" />}
              <span>{p.name}</span>
              <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`}>×</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="form-hint" style={{ margin: "0 0 8px" }}>Nothing linked yet. Search below and click a product to add it.</p>
      )}

      <input
        type="search"
        className="cp-search"
        placeholder={`Search ${products.length} products by name, SKU or category…`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <div className="cp-results">
          {matches.length === 0 && <div className="cp-empty">No products match “{query}”.</div>}
          {matches.map((p) => (
            <button type="button" key={p.id} className="cp-result" onClick={() => add(p.id)}>
              {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" /> : <span className="cp-noimg" />}
              <span className="cp-result-text">
                <b>{p.name}</b>
                <small>{categoryPath(p.category_id, categories) || "No category"}{p.sku ? ` · ${p.sku}` : ""}</small>
              </span>
              <span className="cp-add">+ Add</span>
            </button>
          ))}
          <button type="button" className="cp-close" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
