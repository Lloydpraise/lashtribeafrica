import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { fetchCustomers, fetchCustomerDetail, saveCustomerNotes } from "./customers/customers.api.js";

const ksh = (v) => `Ksh ${Number(v || 0).toLocaleString()}`;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");
const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
const waLink = (phone) => (phone ? `https://wa.me/${String(phone).replace(/[^0-9]/g, "")}` : null);

const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "buyers", label: "Buyers" },
  { key: "shoppers", label: "Shoppers" },
  { key: "students", label: "Students" },
  { key: "repeat", label: "Repeat buyers" },
  { key: "inactive", label: "No order in 60+ days" },
  { key: "profile_only", label: "Profile, no orders" },
  { key: "guests", label: "Guests (no profile)" },
];

function inSegment(c, key) {
  switch (key) {
    case "buyers": return c.orders_count > 0;
    case "shoppers": return c.bought_products;
    case "students": return c.bought_courses;
    case "repeat": return c.orders_count >= 2;
    case "inactive": return c.orders_count > 0 && (daysSince(c.last_order_at) ?? 0) >= 60;
    case "profile_only": return c.user_id && c.orders_count === 0;
    case "guests": return !c.user_id;
    default: return true;
  }
}

const SORTS = {
  recent: { label: "Latest order", fn: (a, b) => new Date(b.last_order_at || 0) - new Date(a.last_order_at || 0) },
  value: { label: "Lifetime value", fn: (a, b) => b.lifetime_value - a.lifetime_value },
  orders: { label: "Most orders", fn: (a, b) => b.orders_count - a.orders_count },
  newest: { label: "Newest customers", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
};

function TypeTags({ c }) {
  return (
    <div className="cx-tags">
      {c.bought_products && <span className="cx-tag shopper">Shopper</span>}
      {c.bought_courses && <span className="cx-tag student">Student</span>}
      {c.orders_count >= 2 && <span className="cx-tag repeat">Repeat</span>}
      {c.orders_count === 0 && <span className="cx-tag">{c.user_id ? "Profile only" : "No orders"}</span>}
      {!c.user_id && c.orders_count > 0 && <span className="cx-tag">Guest</span>}
    </div>
  );
}

// Money spent per month over the last 12 months (paid + completed orders only).
function SpendByMonth({ orders }) {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-KE", { month: "short" }), total: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  orders
    .filter((o) => ["paid", "fulfilled"].includes(o.status))
    .forEach((o) => {
      const d = new Date(o.placed_at);
      const m = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.total += Number(o.total);
    });
  const max = Math.max(...months.map((m) => m.total), 1);
  if (months.every((m) => m.total === 0)) return <p className="cx-empty">No paid orders in the last 12 months.</p>;
  return (
    <div className="cx-bars" aria-label="Spend by month">
      {months.map((m) => (
        <div className="cx-bar-col" key={m.key} title={`${m.label}: ${ksh(m.total)}`}>
          {m.total > 0 && <div className="cx-bar-val">{m.total >= 1000 ? `${Math.round(m.total / 100) / 10}k` : m.total}</div>}
          <div className={`cx-bar${m.total ? "" : " zero"}`} style={{ height: `${Math.max(2, (m.total / max) * 100)}%` }} />
          <div className="cx-bar-label">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

function CustomerDetail({ customer, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState(customer.notes || "");
  const [tags, setTags] = useState((customer.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let live = true;
    fetchCustomerDetail(customer.id)
      .then((d) => live && setDetail(d))
      .catch((e) => live && setError(e.message || "Couldn't load this customer."));
    return () => { live = false; };
  }, [customer.id]);

  async function save() {
    setSaving(true);
    setSaved("");
    try {
      const row = await saveCustomerNotes(customer.id, {
        notes: notes.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onUpdated({ ...customer, notes: row.notes, tags: row.tags });
      setSaved("Saved.");
    } catch (e) {
      setSaved(e.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  const wa = waLink(customer.phone);

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div className="admin-modal cx-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>{customer.full_name || "(no name)"}</h2>
            <div className="cx-sub">
              {[customer.phone, customer.email, customer.delivery_area].filter(Boolean).join(" · ") || "No contact details"}
            </div>
          </div>
          <button className="admin-modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body">
          <div className="cx-head-actions">
            {wa && <a className="admin-btn secondary" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
            {customer.phone && <a className="admin-btn secondary" href={`tel:${customer.phone}`}>Call</a>}
            {customer.email && <a className="admin-btn secondary" href={`mailto:${customer.email}`}>Email</a>}
            <TypeTags c={customer} />
          </div>

          <div className="cx-mini-stats">
            <div className="cx-mini"><span>Lifetime value</span><b>{ksh(customer.lifetime_value)}</b></div>
            <div className="cx-mini"><span>Orders</span><b>{customer.orders_count}</b></div>
            <div className="cx-mini"><span>Avg order</span><b>{ksh(customer.avg_order_value)}</b></div>
            <div className="cx-mini"><span>Awaiting payment</span><b>{ksh(customer.pending_value)}</b></div>
            <div className="cx-mini"><span>Customer since</span><b style={{ fontSize: 14 }}>{day(customer.created_at)}</b></div>
            <div className="cx-mini"><span>Last order</span><b style={{ fontSize: 14 }}>{day(customer.last_order_at)}</b></div>
          </div>

          {error && <p className="admin-gate-error">{error}</p>}
          {!detail && !error && <p className="form-hint">Loading history…</p>}

          {detail && (
            <>
              <div className="cx-section">
                <h3>Spend by month</h3>
                <SpendByMonth orders={detail.orders} />
              </div>

              <div className="cx-section">
                <h3>Products bought</h3>
                {detail.products.length === 0 ? (
                  <p className="cx-empty">No product purchases yet.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr><th>Product</th><th>Orders</th><th>Total qty</th><th>Spent</th><th>Last bought</th></tr>
                    </thead>
                    <tbody>
                      {detail.products.map((p) => (
                        <tr key={p.product_id}>
                          <td className="cx-name">{p.product_name}</td>
                          <td>
                            {p.times_ordered}
                            {p.is_repeat && <> <span className="cx-tag repeat">Repeat ×{p.times_ordered}</span></>}
                          </td>
                          <td>{p.total_qty}</td>
                          <td className="cx-money">{ksh(p.total_spent)}</td>
                          <td>{day(p.last_ordered_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="cx-section">
                <h3>Courses</h3>
                {detail.courses.length === 0 ? (
                  <p className="cx-empty">Not enrolled in any course.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr><th>Course</th><th>Progress</th><th>Enrolled</th><th>Last studied</th><th>Certificate</th></tr>
                    </thead>
                    <tbody>
                      {detail.courses.map((c) => {
                        const total = Number(c.total_lessons) || 0;
                        const done = Number(c.completed_lessons) || 0;
                        const pct = total ? Math.round((done / total) * 100) : 0;
                        return (
                          <tr key={c.course_id}>
                            <td className="cx-name">
                              {c.course_title}
                              <div className="cx-sub">{c.source === "purchase" ? "Purchased" : c.source}</div>
                            </td>
                            <td>
                              <span className={`cx-progress${total && done >= total ? " done" : ""}`}><i style={{ width: `${pct}%` }} /></span>
                              {done}/{total} · {pct}%
                            </td>
                            <td>{day(c.enrolled_at)}</td>
                            <td>{day(c.last_activity_at)}</td>
                            <td>{c.certificate_no ? <span className="cx-tag student">{c.certificate_no}</span> : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="cx-section">
                <h3>Order history</h3>
                {detail.orders.length === 0 ? (
                  <p className="cx-empty">No orders yet.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr><th>Order</th><th>Date</th><th>Items</th><th>Status</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((o) => (
                        <tr key={o.id}>
                          <td className="cx-name">{o.order_no}</td>
                          <td>{day(o.placed_at)}</td>
                          <td className="cx-order-items">{o.order_items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</td>
                          <td><span className={`cx-status ${o.status}`}>{o.status}</span></td>
                          <td className="cx-money">{ksh(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          <div className="cx-section">
            <h3>Notes & tags</h3>
            <div className="cx-notes-grid">
              <div className="form-field">
                <label htmlFor="cxNotes">Private notes</label>
                <textarea id="cxNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Prefers evening delivery, salon owner in Thika" />
              </div>
              <div className="form-field">
                <label htmlFor="cxTags">Tags (comma separated)</label>
                <input id="cxTags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, salon, reseller" />
              </div>
            </div>
            <div className="cx-actions" style={{ marginTop: 10 }}>
              <button className="admin-btn" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save notes"}</button>
              {saved && <span className="form-hint">{saved}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetchCustomers()
      .then(setRows)
      .catch((e) => setError(e.message || "Couldn't load customers. Has migration 0011 been run, and are you signed in as an admin?"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.key, rows.filter((c) => inSegment(c, s.key)).length])), [rows]);

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .filter((c) => inSegment(c, segment))
      .filter((c) => {
        if (!terms.length) return true;
        const hay = [c.full_name, c.email, c.phone, c.delivery_area, ...(c.tags || [])].filter(Boolean).join(" ").toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .sort(SORTS[sort].fn);
  }, [rows, query, segment, sort]);

  const totals = useMemo(() => {
    const buyers = rows.filter((c) => c.orders_count > 0);
    const revenue = rows.reduce((s, c) => s + c.lifetime_value, 0);
    const paidOrders = rows.reduce((s, c) => s + c.paid_orders_count, 0);
    return {
      buyers: buyers.length,
      repeat: rows.filter((c) => c.orders_count >= 2).length,
      aov: paidOrders ? Math.round(revenue / paidOrders) : 0,
      revenue,
    };
  }, [rows]);

  function updateRow(next) {
    setRows((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setOpen(next);
  }

  if (error) return <p className="admin-gate-error">{error}</p>;
  if (loading) return <p className="form-hint">Loading customers…</p>;

  return (
    <div>
      <div className="admin-stat-grid">
        <div className="admin-stat-card"><div className="admin-stat-label">Customers (with orders)</div><div className="admin-stat-value">{totals.buyers}</div></div>
        <div className="admin-stat-card"><div className="admin-stat-label">Repeat buyers</div><div className="admin-stat-value">{totals.repeat}</div></div>
        <div className="admin-stat-card"><div className="admin-stat-label">Average order</div><div className="admin-stat-value">{ksh(totals.aov)}</div></div>
        <div className="admin-stat-card"><div className="admin-stat-label">Revenue (paid)</div><div className="admin-stat-value">{ksh(totals.revenue)}</div></div>
      </div>

      <div className="cx-chips">
        {SEGMENTS.map((s) => (
          <button key={s.key} type="button" className={`cx-chip${segment === s.key ? " active" : ""}`} onClick={() => setSegment(s.key)}>
            {s.label} · {counts[s.key]}
          </button>
        ))}
      </div>

      <div className="cx-toolbar">
        <input type="search" placeholder="Search name, phone, email, area or tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort customers">
          {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>Sort: {s.label}</option>)}
        </select>
        <span className="cx-count">{visible.length} shown</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No customers yet" description="Customers appear here the moment someone places an order or creates a profile." />
      ) : visible.length === 0 ? (
        <EmptyState title="No customers match" description="Try a different search or segment." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Orders</th><th>Lifetime value</th><th>Avg order</th><th>Last order</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="cx-row" onClick={() => setOpen(c)}>
                  <td>
                    <div className="cx-name">{c.full_name || "(no name)"}</div>
                    <div className="cx-sub">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td><TypeTags c={c} /></td>
                  <td>{c.orders_count}</td>
                  <td className="cx-money">{ksh(c.lifetime_value)}</td>
                  <td className="cx-money">{c.orders_count ? ksh(c.avg_order_value) : "—"}</td>
                  <td>{day(c.last_order_at)}</td>
                  <td>
                    <button className="admin-btn secondary" type="button" onClick={(e) => { e.stopPropagation(); setOpen(c); }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <CustomerDetail key={open.id} customer={open} onClose={() => setOpen(null)} onUpdated={updateRow} />}
    </div>
  );
}
