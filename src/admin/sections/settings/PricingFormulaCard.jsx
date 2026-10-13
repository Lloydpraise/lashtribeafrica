import { useEffect, useState } from "react";
import { fetchPricingSettings, savePricingSettings, repriceFormulaProducts } from "../products/products.api.js";
import { DEFAULT_PRICING_SETTINGS, formulaPrices, num } from "../../../lib/pricing.js";
import { formatKsh } from "../products/utils.js";

const FIELDS = [
  { key: "fx_rate_kes_per_usd", label: "Exchange rate (Ksh per USD)", step: "0.01" },
  { key: "fx_buffer_pct", label: "Exchange-rate buffer (%)", step: "0.1" },
  { key: "landed_uplift_pct", label: "Shipping, duty & handling uplift (%)", step: "0.1" },
  { key: "wholesale_margin_pct", label: "Wholesale margin (% of price)", step: "0.1" },
  { key: "retail_markup_pct", label: "Retail markup over wholesale (%)", step: "0.1" },
  { key: "market_markup_pct", label: "Market (crossed-out) markup over retail (%)", step: "0.1" },
  { key: "rounding_step", label: "Round prices to the nearest (Ksh)", step: "1" },
];

// The pricing formula: where it is written down, and where it is changed. It only SUGGESTS prices on the
// product form; a price typed on a product always wins. Products ticked "Keep on formula" are re-priced
// together with the button below.
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
        setS({ ...DEFAULT_PRICING_SETTINGS, ...(row || {}) });
        setState("ready");
      })
      .catch((err) => {
        setError(err.message || "");
        setState("missing");
      });
  }, []);

  if (state === "loading") return null;
  if (state === "missing") {
    return (
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Pricing formula</h3></div>
        <p className="form-hint">
          Run supabase/migrations/0016_pricing_variants.sql to turn this on, then reload.
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
  const marginBad = num(s.wholesale_margin_pct) >= 100;

  async function save() {
    setBusy("save");
    setError("");
    setMsg("");
    try {
      const payload = {};
      FIELDS.forEach((f) => (payload[f.key] = num(s[f.key])));
      const saved = await savePricingSettings(payload);
      setS({ ...DEFAULT_PRICING_SETTINGS, ...saved });
      setMsg("Formula saved. It applies to new suggestions; use the button below to re-price products kept on the formula.");
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
      <div className="admin-card-header"><h3>Pricing formula</h3></div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{error}</p>}
      {msg && <p className="form-hint" style={{ color: "var(--green)", marginBottom: 12 }}>{msg}</p>}

      <p className="form-hint" style={{ marginTop: 0 }}>
        This only <b>suggests</b> prices when you add a product (from its USD cost). You can always type your own
        prices on the product. Customers pay <b>wholesale</b> at or above the MOQ and <b>retail</b> below it.
      </p>

      <ol className="formula-steps">
        <li>
          <b>Landed cost</b> = cost in USD × exchange rate ({s.fx_rate_kes_per_usd}) × (1 + buffer {s.fx_buffer_pct}%) ×
          (1 + uplift {s.landed_uplift_pct}%)
        </li>
        <li><b>Wholesale</b> = landed cost ÷ (1 − margin {s.wholesale_margin_pct}%)</li>
        <li><b>Retail</b> = wholesale × (1 + {s.retail_markup_pct}%)</li>
        <li><b>Market</b> (crossed out) = retail × (1 + {s.market_markup_pct}%)</li>
        <li>Each price is rounded to the nearest Ksh {s.rounding_step}.</li>
      </ol>

      <div className="formula-grid" style={{ marginTop: 16 }}>
        {FIELDS.map((f) => (
          <label className="form-field" key={f.key}>
            <span>{f.label}</span>
            <input type="number" min="0" step={f.step} value={s[f.key]} onChange={(e) => set(f.key, e.target.value)} />
          </label>
        ))}
      </div>
      {marginBad && <p className="admin-gate-error" style={{ marginTop: 12 }}>The wholesale margin must be below 100%.</p>}

      <div className="form-field" style={{ marginTop: 16, maxWidth: 260 }}>
        <span>Try it: cost in USD</span>
        <input type="number" min="0" step="0.01" value={exampleUsd} onChange={(e) => setExampleUsd(e.target.value)} />
      </div>
      {example ? (
        <div className="formula-example" style={{ marginTop: 10 }}>
          <div>Landed cost<b>{formatKsh(example.landed)}</b></div>
          <div>Wholesale<b>{formatKsh(example.wholesale)}</b></div>
          <div>Retail<b>{formatKsh(example.retail)}</b></div>
          <div>Market<b>{formatKsh(example.market)}</b></div>
        </div>
      ) : (
        <p className="form-hint">Enter a cost to see an example.</p>
      )}

      <div className="bt-inline" style={{ marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="admin-btn" onClick={save} disabled={!!busy || marginBad}>
          {busy === "save" ? "Saving…" : "Save formula"}
        </button>
        <button type="button" className="admin-btn secondary" onClick={reprice} disabled={!!busy}>
          {busy === "reprice" ? "Re-pricing…" : "Re-price products kept on the formula"}
        </button>
      </div>
    </div>
  );
}
