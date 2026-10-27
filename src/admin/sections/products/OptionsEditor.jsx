import { useId, useState } from "react";
import { normalizeOptions, swatchColor, OPTION_TYPES } from "../../../lib/pricing.js";

// Variant editor. Nothing is hardcoded: the admin types whatever option types a product needs
// ("Curl", "Colour", "Tray size"...) and the values under each. Each value can have
//   - a price change (added to the wholesale, retail and market price),
//   - an estimated weight in kg (blank = the product's own weight), used for the shipping fee,
//   - a linked product photo (chosen from the product's own images): the product page slides to that photo
//     when the customer picks the value, and image-style pickers show it as the tile,
//   - a swatch colour (for colour-style pickers).
// Each variant type also has a picker style: Auto (decided from the values), Text, Colour or Image.
// Names already used on other products are suggested so spelling stays consistent across hundreds of products.

const TYPE_LABELS = { auto: "Picker: automatic", text: "Picker: text buttons", color: "Picker: colour swatches", image: "Picker: photo tiles" };

/** Stored options -> editable rows (price adjustment kept as text while typing). */
export function optionsToEditor(raw) {
  return normalizeOptions(raw).map((o) => ({
    name: o.name,
    type: o.type,
    values: o.values.map((v) => ({
      value: v.value,
      delta: v.priceDelta ? String(v.priceDelta) : "",
      image: v.image || "",
      swatch: v.swatch || "",
      weight: v.weightKg ? String(v.weightKg) : "",
    })),
  }));
}

/** Editable rows -> the shape saved in products.options. Throws a readable Error when something is wrong. */
export function editorToOptions(rows) {
  const out = [];
  const names = new Set();
  for (const row of rows || []) {
    const name = row.name.trim();
    const values = (row.values || []).filter((v) => v.value.trim() || String(v.delta).trim() || String(v.weight || "").trim());
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
      const entry = { value };
      if (delta) entry.price_delta = delta;
      const rawWeight = String(v.weight ?? "").trim();
      const weight = rawWeight === "" ? 0 : Number(rawWeight);
      if (!Number.isFinite(weight) || weight < 0) throw new Error(`The weight for "${value}" under "${name}" isn't a number.`);
      if (weight) entry.weight_kg = weight;
      if (v.image) entry.image = v.image;
      if (v.swatch && row.type === "color") entry.swatch = v.swatch;
      return entry;
    });
    if (list.length > 100) throw new Error(`"${name}" has more than 100 values.`);
    const type = OPTION_TYPES.includes(row.type) ? row.type : "auto";
    out.push({ name, ...(type !== "auto" ? { type } : {}), values: list });
  }
  if (out.length > 6) throw new Error("A product can have at most 6 variant types.");
  return out;
}

/** Drops photo links that point at an image no longer on the product (called when saving). */
export function pruneOptionImages(options, images) {
  const urls = new Set((images || []).map((i) => i.url));
  return options.map((o) => ({
    ...o,
    values: o.values.map((v) => {
      if (!v.image || urls.has(v.image)) return v;
      const { image, ...rest } = v;
      return rest;
    }),
  }));
}

export default function OptionsEditor({ rows, onChange, knownOptions = [], images = [], basePrice = 0 }) {
  const listId = useId();
  const [openHint, setOpenHint] = useState(false);
  const [picking, setPicking] = useState(""); // "i-j" of the value whose photo chooser is open

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
  const addValue = (i) => setRow(i, { values: [...rows[i].values, { value: "", delta: "", image: "", swatch: "", weight: "" }] });
  const removeValue = (i, j) => setRow(i, { values: rows[i].values.filter((_, idx) => idx !== j) });
  const addType = (name = "") => onChange([...rows, { name, type: "auto", values: [{ value: "", delta: "", image: "", swatch: "", weight: "" }] }]);
  const removeType = (i) => onChange(rows.filter((_, idx) => idx !== i));

  // Bulk: paste "C, D, DD" or one per line into the last value box and it splits into rows.
  function pasteValues(i, j, text) {
    const parts = text.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    if (parts.length < 2) return false;
    const current = rows[i].values.filter((_, idx) => idx !== j);
    setRow(i, { values: [...current, ...parts.map((value) => ({ value, delta: "", image: "", swatch: "", weight: "" }))] });
    return true;
  }

  const suggestions = [...known.keys()].filter((n) => !rows.some((r) => r.name.trim().toLowerCase() === n.toLowerCase()));

  return (
    <div className="opt-editor">
      <p className="form-hint" style={{ margin: "0 0 10px" }}>
        Variants are choices the customer makes before adding to cart (curl, colour, tray size...). Leave empty if the
        product has none. Each value can have its own price change and its own photo.{" "}
        <button type="button" className="link-btn" onClick={() => setOpenHint(!openHint)}>
          {openHint ? "Hide example" : "Show example"}
        </button>
      </p>
      {openHint && (
        <p className="form-hint opt-example">
          Type: <b>Curl</b> with values <b>C</b>, <b>D</b>, <b>DD</b>. Type: <b>Thickness</b> with values <b>0.07</b>,{" "}
          <b>0.10</b>. If one value costs more, put the difference in "Price change" (e.g. <b>+200</b>), it is added to
          the wholesale, retail and market price; the result is shown next to it. Use "Photo" to link one of this
          product's images to a value: the product page slides to that photo when the value is picked. Set the picker
          to colour swatches or photo tiles for things like Colour. You can paste a comma-separated list into a value box.
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
              <select
                className="opt-type-select"
                value={row.type || "auto"}
                onChange={(e) => setRow(i, { type: e.target.value })}
                aria-label="Picker style"
              >
                {OPTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
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
              {row.values.map((v, j) => {
                const key = `${i}-${j}`;
                const delta = Number(v.delta) || 0;
                const final = Number(basePrice) > 0 ? Math.max(0, Number(basePrice) + delta) : null;
                const linked = images.find((im) => im.url === v.image);
                const autoColor = swatchColor({ value: v.value, swatch: v.swatch });
                return (
                  <div className="opt-value-wrap" key={j}>
                    <div className="opt-value">
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
                      <div className="opt-price">
                        <input
                          type="number"
                          step="1"
                          placeholder="Price change (Ksh)"
                          value={v.delta}
                          onChange={(e) => setValue(i, j, { delta: e.target.value })}
                          aria-label="Price change in Ksh"
                        />
                        {final !== null && <span className="opt-final">= Ksh {final.toLocaleString()}</span>}
                      </div>
                      <div className="opt-price">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="Weight kg (est.)"
                          value={v.weight || ""}
                          onChange={(e) => setValue(i, j, { weight: e.target.value })}
                          aria-label="Estimated weight in kg"
                          title="Estimated weight of this variation in kg. Leave blank to use the product's weight."
                        />
                      </div>
                      {row.type === "color" && (
                        <input
                          type="color"
                          className="opt-color"
                          value={/^#[0-9a-f]{6}$/i.test(v.swatch || "") ? v.swatch : /^#[0-9a-f]{6}$/i.test(autoColor) ? autoColor : "#cccccc"}
                          onChange={(e) => setValue(i, j, { swatch: e.target.value })}
                          aria-label="Swatch colour"
                          title="Swatch colour"
                        />
                      )}
                      <button
                        type="button"
                        className={"opt-photo-btn" + (linked ? " has-photo" : "")}
                        onClick={() => setPicking(picking === key ? "" : key)}
                        disabled={!images.length}
                        title={images.length ? "Link one of this product's photos to this value" : "Upload product images first"}
                      >
                        {linked ? <img src={linked.url} alt="" /> : "Photo"}
                      </button>
                      <button type="button" className="opt-x" onClick={() => removeValue(i, j)} aria-label="Remove value">
                        ×
                      </button>
                    </div>
                    {picking === key && (
                      <div className="opt-photo-pick">
                        <button
                          type="button"
                          className={"opt-photo-none" + (!v.image ? " on" : "")}
                          onClick={() => {
                            setValue(i, j, { image: "" });
                            setPicking("");
                          }}
                        >
                          No photo
                        </button>
                        {images.map((im) => (
                          <button
                            type="button"
                            key={im.url}
                            className={"opt-photo-choice" + (v.image === im.url ? " on" : "")}
                            onClick={() => {
                              setValue(i, j, { image: im.url });
                              setPicking("");
                            }}
                          >
                            <img src={im.url} alt={im.alt || ""} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
