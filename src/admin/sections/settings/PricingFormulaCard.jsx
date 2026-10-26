import { useEffect, useState } from "react";
import { fetchPricingSettings, savePricingSettings, repriceFormulaProducts } from "../products/products.api.js";
import { DEFAULT_PRICING_SETTINGS, formulaPrices, num } from "../../../lib/pricing.js";
import { formatKsh } from "../products/utils.js";

const FIELDS = [
  { key: "wholesale_multiplier", label: "Wholesale = supplier price ×", step: "0.01", hint: "1.30 = 130% of the supplier price" },
  { key: "retail_multiplier", label: "Retail = supplier price ×", step: "0.01", hint: "1.70 = 170% of the supplier price" },
  { key: "market_uplift_min_pct", label: "Market price: lowest uplift over retail (%)", step: "0.1", hint: "each product gets a random value between lowest and highest" },
  { key: "market_uplift_max_pct", label: "Market price: highest uplift over retail (%)", step: "0.1" },
  { key: "shipping_rate_per_kg", label: "Shipping rate (Ksh per kg)", step: "1", hint: "cost of getting goods to our offices; charged at checkout as weight × rate" },
  { key: "fx_rate_kes_per_usd", label: "Exchange rate (Ksh per USD)", step: "0.01", hint: "turns a supplier price in USD into Ksh" },
  { key: "rounding_step", label: "Round prices to the nearest (Ksh)", step: "1" },
];

// The pricing formula and the shipping rate: where they are written down, and where they are changed.
// The formula only SUGGESTS prices on the product form; a price typed on a product always wins. Products ticked
// "Keep on formula" are re-priced together with the button below. The shipping rate is used by the database at
// checkout (shipping = weight x rate), so changing it here changes what customers are charged.
export default function PricingFormulaCard() {
  const [s, setS] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [exampleUsd, setExampleUsd] = useState("10");

  useEffect(() => {
    fetchPricingSettings()
      .then((row) => {
        setS({ ...DEFAULT_PRICING_SETTINGS, ...(row || {}), __legacy: Boolean(row) && row.shipping_rate_per_kg === undefined });
        setState("ready");
      })
      .catch((err) => {
        setError(err.message || "");
        setState("missing");
      });
  }, []);

  if (state === "loading") return null;
  // the settings row exists but migration 0029 (multipliers, shipping rate) has not been run yet
  const needsMigration = state === "ready" && s.__legacy;
  if (state === "missing") {
    return (
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Pricing formula</h3></div>
        <p className="form-hint">
          Run supabase/migrations/0016_pricing_variants.sql and then 0029_pricing_shipping_formula.sql to turn this on, then reload.
          {error ? ` (${error})` : ""}
        </p>
      </div>
    );
  }

  const set = (key, value) => {
    setS((cur) => ({ ...cur, [key]: value }));
    setMsg("");
  };

  const example = formulaPrices(exampleUsd, s);
  const rangeBad = num(s.market_uplift_min_pct) > num(s.market_uplift_max_pct);

  async function save() {
    setBusy("save");
    setError("");
    setMsg("");
    try {
      const payload = {};
      FIELDS.forEach((f) => (payload[f.key] = num(s[f.key])));
      const saved = await savePricingSettings(payload);
      setS({ ...DEFAULT_PRICING_SETTINGS, ...saved });
      setMsg("Saved. The shipping rate applies to orders straight away; the price formula applies to new suggestions. Use the button below to re-price products kept on the formula.");
    } catch (err) {
      setError(err.message || "Couldn't save the formula.");
    } finally {
      setBusy("");
    }
  }

  async function reprice() {
    if (!window.confirm("Overwrite the wholesale, retail and market prices of every product kept on the formula? Save the formula first if you changed it.")) return;
    setBusy("reprice");
    setError("");
    setMsg("");
    try {
      const n = await repriceFormulaProducts();
      setMsg(`${n} product${n === 1 ? "" : "s"} re-priced.`);
    } catch (err) {
      setError(err.message || "Couldn't re-price the products.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-card" style={{ marginBottom: 20 }}>
      <div className="admin-card-header"><h3>Pricing formula &amp; shipping</h3></div>
      {needsMigration && (
        <p className="admin-gate-error" style={{ marginBottom: 12 }}>
          Run supabase/migrations/0029_pricing_shipping_formula.sql in the Supabase SQL editor first: until then these
          new settings can't be saved.
        </p>
      )}
      {error && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{error}</p>}
      {msg && <p className="form-hint" style={{ color: "var(--green)", marginBottom: 12 }}>{msg}</p>}

      <p className="form-hint" style={{ marginTop: 0 }}>
        This only <b>suggests</b> prices when you add a product (from its supplier price). You can always type your own
        prices on the product. Customers pay <b>wholesale</b> at or above the MOQ and <b>retail</b> below it.
      </p>

      <ol className="formula-steps">
        <li><b>Supplier price</b> (Ksh) = supplier price in USD × exchange rate ({s.fx_rate_kes_per_usd})</li>
        <li><b>Wholesale</b> = supplier price × {s.wholesale_multiplier} ({Math.round(num(s.wholesale_multiplier) * 100)}%)</li>
        <li><b>Retail</b> = supplier price × {s.retail_multiplier} ({Math.round(num(s.retail_multiplier) * 100)}%)</li>
        <li>
          <b>Market</b> (crossed out) = retail + a random {s.market_uplift_min_pct}% to {s.market_uplift_max_pct}%,
          different for every product so it doesn't look formulaic
        </li>
        <li><b>Shipping</b> = product weight (kg) × Ksh {Number(s.shipping_rate_per_kg).toLocaleString()} per kg, added to the order total at checkout</li>
        <li>Each price is rounded to the nearest Ksh {s.rounding_step}.</li>
      </ol>

      <div className="formula-grid" style={{ marginTop: 16 }}>
        {FIELDS.map((f) => (
          <label className="form-field" key={f.key}>
            <span>{f.label}</span>
            <input type="number" min="0" step={f.step} value={s[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            {f.hint && <small className="form-hint">{f.hint}</small>}
          </label>
        ))}
      </div>
      {rangeBad && <p className="admin-gate-error" style={{ marginTop: 12 }}>The lowest market uplift can't be above the highest.</p>}

      <div className="form-field" style={{ marginTop: 16, maxWidth: 260 }}>
        <span>Try it: supplier price in USD</span>
        <input type="number" min="0" step="0.01" value={exampleUsd} onChange={(e) => setExampleUsd(e.target.value)} />
      </div>
      {example ? (
        <div className="formula-example" style={{ marginTop: 10 }}>
          <div>Supplier price<b>{formatKsh(example.supplier)}</b></div>
          <div>Wholesale<b>{formatKsh(example.wholesale)}</b></div>
          <div>Retail<b>{formatKsh(example.retail)}</b></div>
          <div>Market (random uplift)<b>{formatKsh(example.market)}</b></div>
        </div>
      ) : (
        <p className="form-hint">Enter a cost to see an example.</p>
      )}

      <div className="bt-inline" style={{ marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="admin-btn" onClick={save} disabled={!!busy || rangeBad || needsMigration}>
          {busy === "save" ? "Saving…" : "Save settings"}
        </button>
        <button type="button" className="admin-btn secondary" onClick={reprice} disabled={!!busy}>
          {busy === "reprice" ? "Re-pricing…" : "Re-price products kept on the formula"}
        </button>
      </div>
    </div>
  );
}
