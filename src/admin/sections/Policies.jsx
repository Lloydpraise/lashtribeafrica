import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { fetchSiteSettings, saveSiteSettings } from "./settings/settings.api.js";

export default function Policies() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const row = await fetchSiteSettings();
      setForm(row);
    } catch (err) {
      setError(err.message || "Couldn't load policies. Has migration 0004 been run yet?");
    } finally {
      setLoading(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await saveSiteSettings({
        policy_privacy: form.policy_privacy,
        policy_shipping: form.policy_shipping,
        policy_terms: form.policy_terms,
      });
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Couldn't save policies.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="form-hint">Loading…</p>;

  if (!form) {
    return (
      <EmptyState
        title="Site settings not found"
        description="Run supabase/migrations/0004_site_settings_kits_offers.sql to create the settings row, then reload this page."
      />
    );
  }

  return (
    <div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 16 }}>{error}</p>}
      {saved && <p className="form-hint" style={{ color: "var(--green)", marginBottom: 16 }}>Saved.</p>}
      <p className="form-hint" style={{ marginBottom: 20 }}>
        Leave any field blank to show the built-in placeholder copy on that page. Separate paragraphs with a blank line.
        Pages: <code>/privacy-policy</code>, <code>/shipping-policy</code>, <code>/terms-and-conditions</code> — linked from the site footer and checkout.
      </p>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Privacy Policy</h3></div>
        <textarea
          rows={8}
          style={{ width: "100%" }}
          value={form.policy_privacy || ""}
          onChange={(e) => set("policy_privacy", e.target.value)}
        />
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Shipping Policy</h3></div>
        <textarea
          rows={8}
          style={{ width: "100%" }}
          value={form.policy_shipping || ""}
          onChange={(e) => set("policy_shipping", e.target.value)}
        />
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header"><h3>Terms & Conditions</h3></div>
        <textarea
          rows={8}
          style={{ width: "100%" }}
          value={form.policy_terms || ""}
          onChange={(e) => set("policy_terms", e.target.value)}
        />
      </div>

      <button className="admin-btn" type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Policies"}
      </button>
    </div>
  );
}
