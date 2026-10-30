import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { supabase } from "../../services/service.js";
import { sendTest } from "./communications/comms.api.js";
import "./reviews/reviews.css";

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const Stars = ({ n }) => <span className="rvw-stars" title={`${n} out of 5`}>{"★".repeat(n)}<i>{"★".repeat(5 - n)}</i></span>;
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function Reviews() {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [productSlug, setProductSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const reviews = must(await supabase.from("reviews").select("*, review_targets(product_id, course_id)").order("created_at", { ascending: false })) || [];
      const productIds = [...new Set(reviews.flatMap((r) => r.review_targets.map((t) => t.product_id).filter(Boolean)))];
      const courseIds = [...new Set(reviews.flatMap((r) => r.review_targets.map((t) => t.course_id).filter(Boolean)))];
      const map = {};
      if (productIds.length) (must(await supabase.from("products").select("id, name").in("id", productIds)) || []).forEach((p) => (map[p.id] = p.name));
      if (courseIds.length) (must(await supabase.from("courses").select("id, title").in("id", courseIds)) || []).forEach((c) => (map[c.id] = c.title));
      setNames(map);
      setRows(reviews);
      const first = must(await supabase.from("products").select("slug").eq("status", "active").order("created_at").limit(1));
      setProductSlug(first?.[0]?.slug || "");
    } catch (e) {
      setError(e.message || "Couldn't load reviews.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const live = rows.filter((r) => r.status === "published");
    return { total: rows.length, shown: live.length, avg: live.length ? (live.reduce((a, r) => a + r.rating, 0) / live.length).toFixed(1) : "—" };
  }, [rows]);

  async function setStatus(row, status) {
    try {
      const { error: e } = await supabase.rpc("admin_set_review_status", { p_id: row.id, p_status: status });
      if (e) throw new Error(e.message);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove() {
    const row = confirmDelete;
    setConfirmDelete(null);
    if (!row) return;
    try {
      const { error: e } = await supabase.from("reviews").delete().eq("id", row.id);
      if (e) throw new Error(e.message);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function mailMe() {
    setNote("");
    setError("");
    try {
      if (!email.trim()) throw new Error("Type your email address first.");
      await sendTest("review_request", email.trim());
      setNote(`Sent. Check ${email.trim()} (the button opens the preview page). Email sending must be switched on in Communications > Settings.`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <p className="admin-gate-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="admin-card rvw-tools">
        <div>
          <div className="rvw-h">See how it looks</div>
          <div className="rvw-row">
            <a className="admin-btn" href="/review?preview=1" target="_blank" rel="noreferrer">Open the review page (preview)</a>
            {productSlug ? (
              <a className="admin-btn secondary" href={`/ecommerce/product/${productSlug}?preview-reviews=1`} target="_blank" rel="noreferrer">See a sample review on a product page</a>
            ) : null}
          </div>
          <p className="form-hint">The preview never saves anything. The sample review card is dashed and labelled, and only shows when you add <code>?preview-reviews</code> to a product or course address, so customers never see it.</p>
        </div>
        <div>
          <div className="rvw-h">Email the review request to yourself</div>
          <div className="rvw-row">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <button className="admin-btn secondary" type="button" onClick={mailMe}>Send test email</button>
          </div>
          {note && <p className="form-hint">{note}</p>}
        </div>
      </div>

      <div className="rvw-stats">
        <div><b>{stats.total}</b><span>reviews</span></div>
        <div><b>{stats.shown}</b><span>showing on the site</span></div>
        <div><b>{stats.avg}</b><span>average stars</span></div>
      </div>

      {loading ? (
        <p className="form-hint">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Reviews arrive after a customer's order is marked Fulfilled: they get the email 24 hours later (course orders: 3 days after payment). Use the buttons above to see exactly what they will see."
        />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Review</th><th>Shows on</th><th>When</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Stars n={r.rating} />
                    <div className="table-primary">{r.display_name}</div>
                    {r.body && <div className="table-secondary rvw-body">{r.body}</div>}
                  </td>
                  <td className="table-secondary">
                    {r.review_targets.map((t) => names[t.product_id || t.course_id] || "(removed)").join(", ")}
                  </td>
                  <td className="table-secondary">{when(r.created_at)}</td>
                  <td>{r.status === "published" ? <span className="admin-badge-active">Showing</span> : <span className="admin-badge-inactive">Hidden</span>}</td>
                  <td>
                    <div className="table-actions">
                      <button className="admin-btn secondary" onClick={() => setStatus(r, r.status === "published" ? "hidden" : "published")}>
                        {r.status === "published" ? "Hide" : "Show"}
                      </button>
                      <button className="admin-btn secondary danger" onClick={() => setConfirmDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="rvw-confirm" role="dialog" aria-modal="true">
          <div className="admin-card">
            <p>Delete this review by {confirmDelete.display_name} for good? Hiding it is reversible.</p>
            <div className="rvw-row">
              <button className="admin-btn secondary danger" onClick={remove}>Delete</button>
              <button className="admin-btn secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
