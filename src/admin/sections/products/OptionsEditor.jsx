import { useId, useState } from "react";
import { normalizeOptions } from "../../../lib/pricing.js";

// Variant editor. Nothing is hardcoded: the admin types whatever option types a product needs
// ("Curl", "Thickness", "Tray size"...) and the values under each, with an optional price adjustment
// per value (added to the wholesale, retail and market price). Names already used on other products
// are suggested so spelling stays consistent across hundreds of products.

/** Stored options -> editable rows (price adjustment kept as text while typing). */
export function optionsToEditor(raw) {
  return normalizeOptions(raw).map((o) => ({
    name: o.name,
    values: o.values.map((v) => ({ value: v.value, delta: v.priceDelta ? String(v.priceDelta) : "" })),
  }));
}

/** Editable rows -> the shape saved in products.options. Throws a readable Error when something is wrong. */
export function editorToOptions(rows) {
  const out = [];
  const names = new Set();
  for (const row of rows || []) {
    const name = row.name.trim();
    const values = (row.values || []).filter((v) => v.value.trim() || String(v.delta).trim());
    if (!name && !values.length) continue; // empty row: ignore
    if (!name) throw new Error("Give every variant type a name (e.g. Curl, Size).");
    if (names.has(name.toLowerCase())) throw new Error(`"${name}" is listed twice. Use each variant type once.`);
    names.add(name.toLowerCase());
    if (!values.length) throw new Error(`Add at least one value under "${name}", or remove it.`);
    const seen = new Set();
    const list = values.map((v) => {
      const value = v.value.trim();
      if (!value) throw new Error(`A value under "${name}" has a price change but no name.`);
      if (seen.has(value.toLowerCase())) throw new Error(`"${value}" is listed twice under "${name}".`);
      seen.add(value.toLowerCase());
      const raw = String(v.delta).trim();
      const delta = raw === "" ? 0 : Number(raw);
      if (!Number.isFinite(delta)) throw new Error(`The price change for "${value}" under "${name}" isn't a number.`);
      return delta ? { value, price_delta: delta } : { value };
    });
    if (list.length > 100) throw new Error(`"${name}" has more than 100 values.`);
    out.push({ name, values: list });
  }
  if (out.length > 6) throw new Error("A product can have at most 6 variant types.");
  return out;
}

export default function OptionsEditor({ rows, onChange, knownOptions = [] }) {
  const listId = useId();
  const [openHint, setOpenHint] = useState(false);

  // name -> values used on other products
  const known = new Map();
  knownOptions.forEach((o) => {
    const set = known.get(o.name) || new Set();
    o.values.forEach((v) => set.add(v.value));
    known.set(o.name, set);
  });

  const setRow = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setValue = (i, j, patch) =>
    setRow(i, { values: rows[i].values.map((v, idx) => (idx === j ? { ...v, ...patch } : v)) });
  const addValue = (i) => setRow(i, { values: [...rows[i].values, { value: "", delta: "" }] });
  const removeValue = (i, j) => setRow(i, { values: rows[i].values.filter((_, idx) => idx !== j) });
  const addType = (name = "") => onChange([...rows, { name, values: [{ value: "", delta: "" }] }]);
  const removeType = (i) => onChange(rows.filter((_, idx) => idx !== i));

  // Bulk: paste "C, D, DD" or one per line into the last value box and it splits into rows.
  function pasteValues(i, j, text) {
    const parts = text.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    if (parts.length < 2) return false;
    const current = rows[i].values.filter((_, idx) => idx !== j);
    setRow(i, { values: [...current, ...parts.map((value) => ({ value, delta: "" }))] });
    return true;
  }

  const suggestions = [...known.keys()].filter((n) => !rows.some((r) => r.name.trim().toLowerCase() === n.toLowerCase()));

  return (
    <div className="opt-editor">
      <p className="form-hint" style={{ margin: "0 0 10px" }}>
        Variants are choices the customer makes before adding to cart (curl, thickness, tray size...). Leave empty if
        the product has none.{" "}
        <button type="button" className="link-btn" onClick={() => setOpenHint(!openHint)}>
          {openHint ? "Hide example" : "Show example"}
        </button>
      </p>
      {openHint && (
        <p className="form-hint opt-example">
          Type: <b>Curl</b> with values <b>C</b>, <b>D</b>, <b>DD</b>. Type: <b>Thickness</b> with values <b>0.07</b>,{" "}
          <b>0.10</b>. If one value costs more, put the difference in "Price change" (e.g. <b>+200</b>), it is added to
          the wholesale, retail and market price. You can paste a comma-separated list into a value box.
        </p>
      )}

      <datalist id={`${listId}-names`}>
        {[...known.keys()].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {rows.map((row, i) => {
        const valueHints = [...(known.get(row.name.trim()) || [])];
        return (
          <div className="opt-card" key={i}>
            <div className="opt-card-head">
              <input
                type="text"
                list={`${listId}-names`}
                placeholder="Variant type, e.g. Curl"
                value={row.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                aria-label="Variant type"
              />
              <button type="button" className="admin-btn secondary danger" onClick={() => removeType(i)}>
                Remove type
              </button>
            </div>
            <datalist id={`${listId}-v${i}`}>
              {valueHints.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <div className="opt-values">
              {row.values.map((v, j) => (
                <div className="opt-value" key={j}>
                  <input
                    type="text"
                    list={`${listId}-v${i}`}
                    placeholder="Value, e.g. D"
                    value={v.value}
                    onChange={(e) => setValue(i, j, { value: e.target.value })}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (/[\n,;]/.test(text) && pasteValues(i, j, text)) e.preventDefault();
                    }}
                    aria-label="Value"
                  />
                  <input
                    type="number"
                    step="1"
                    placeholder="Price change (Ksh)"
                    value={v.delta}
                    onChange={(e) => setValue(i, j, { delta: e.target.value })}
                    aria-label="Price change in Ksh"
                  />
                  <button type="button" className="opt-x" onClick={() => removeValue(i, j)} aria-label="Remove value">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="admin-btn secondary" onClick={() => addValue(i)}>
              + Add value
            </button>
          </div>
        );
      })}

      <div className="opt-actions">
        <button type="button" className="admin-btn secondary" onClick={() => addType()} disabled={rows.length >= 6}>
          + Add variant type
        </button>
        {suggestions.slice(0, 8).map((n) => (
          <button type="button" key={n} className="checkbox-pill opt-suggest" onClick={() => addType(n)}>
            + {n}
          </button>
        ))}
      </div>
    </div>
  );
}
