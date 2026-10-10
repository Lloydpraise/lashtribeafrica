import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { fetchOrders, setOrderStatus } from "./orders/orders.api.js";

const ksh = (v) => `Ksh ${Number(v || 0).toLocaleString()}`;
const when = (iso) =>
  iso ? new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const waLink = (phone) => (phone ? `https://wa.me/${String(phone).replace(/[^0-9]/g, "")}` : null);

const STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"];
const STATUS_LABEL = { pending: "Awaiting payment", paid: "Paid", fulfilled: "Completed", cancelled: "Cancelled", refunded: "Refunded" };
const KIND_LABEL = { product: "Products", course: "Courses", mixed: "Products + courses" };
const METHODS = ["M-Pesa", "Card", "Bank transfer", "Cash", "Other"];

function OrderDetail({ order, onClose, onChanged }) {
  const [method, setMethod] = useState(order.payment_method || "M-Pesa");
  const [ref, setRef] = useState(order.payment_ref || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // status awaiting a second click

  const hasCourse = order.order_items.some((i) => i.item_type !== "product");
  const customer = order.customer;
  const wa = waLink(customer?.phone);

  async function move(status) {
    if (["cancelled", "refunded"].includes(status) && hasCourse && confirm !== status) {
      setConfirm(status);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await setOrderStatus(order.id, status, status === "paid" ? { method, ref } : {});
      setConfirm(null);
      onChanged(next);
    } catch (err) {
      setError(err.message || "Couldn't update the order.");
    } finally {
      setBusy(false);
    }
  }

  const actions = {
    pending: [["paid", "Mark as paid", ""], ["cancelled", "Cancel order", "secondary danger"]],
    paid: [["fulfilled", "Mark completed", ""], ["refunded", "Refund", "secondary danger"]],
    fulfilled: [["refunded", "Refund", "secondary danger"]],
    cancelled: [["pending", "Reopen as pending", "secondary"]],
    refunded: [["pending", "Reopen as pending", "secondary"]],
  }[order.status] || [];

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div className="admin-modal cx-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>
              {order.order_no} <span className={`cx-status ${order.status}`}>{STATUS_LABEL[order.status]}</span>
            </h2>
            <div className="cx-sub">Placed {when(order.placed_at)}{order.paid_at ? ` · paid ${when(order.paid_at)}` : ""}</div>
          </div>
          <button className="admin-modal-close" type="button" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body">
          <div className="cx-section">
            <h3>Customer</h3>
            <div className="cx-name">{customer?.full_name || "(no name)"}</div>
            <div className="cx-sub">{[customer?.phone, customer?.email, order.delivery_area].filter(Boolean).join(" · ")}</div>
            {order.delivery_notes && <p className="form-hint" style={{ marginTop: 8 }}>Delivery notes: {order.delivery_notes}</p>}
            <div className="cx-head-actions" style={{ marginTop: 10 }}>
              {wa && <a className="admin-btn secondary" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
              {customer?.phone && <a className="admin-btn secondary" href={`tel:${customer.phone}`}>Call</a>}
            </div>
          </div>

          <div className="cx-section">
            <h3>Items</h3>
            <table className="admin-table">
              <thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
              <tbody>
                {order.order_items.map((i) => (
                  <tr key={i.id}>
                    <td className="cx-name">{i.name}</td>
                    <td>{i.item_type}</td>
                    <td>{i.quantity}</td>
                    <td className="cx-money">{ksh(i.unit_price)}</td>
                    <td className="cx-money">{ksh(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cx-sub" style={{ textAlign: "right", marginTop: 10 }}>
              {order.discount > 0 && <>Subtotal {ksh(order.subtotal)} · Offers −{ksh(order.discount)} · </>}
              <b style={{ color: "var(--charcoal)", fontSize: 15 }}>Total {ksh(order.total)}</b>
              <div>Shipping is arranged separately and isn't included.</div>
            </div>
          </div>

          <div className="cx-section">
            <h3>Payment & status</h3>
            {order.status === "pending" && (
              <div className="cx-pay-row">
                <div className="form-field">
                  <label htmlFor="payMethod">Paid by</label>
                  <select id="payMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="payRef">Reference (e.g. M-Pesa code)</label>
                  <input id="payRef" type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="QWE123ABCD" />
                </div>
              </div>
            )}
            {order.status !== "pending" && (order.payment_method || order.payment_ref) && (
              <p className="form-hint">Paid by {order.payment_method || "—"}{order.payment_ref ? ` · ref ${order.payment_ref}` : ""}</p>
            )}
            {hasCourse && order.status === "pending" && (
              <p className="form-hint">Marking this paid unlocks the course(s) for the customer straight away.</p>
            )}
            {confirm && <p className="cx-warn-note">This will remove the customer's access to the course(s) in this order. Click again to confirm.</p>}
            {error && <p className="admin-gate-error">{error}</p>}
            <div className="cx-actions">
              {actions.map(([status, label, cls]) => (
                <button key={status} className={`admin-btn ${cls}`} type="button" disabled={busy} onClick={() => move(status)}>
                  {confirm === status ? "Confirm: " : ""}{label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetchOrders()
      .then(setRows)
      .catch((e) => setError(e.message || "Couldn't load orders. Has migration 0011 been run, and are you signed in as an admin?"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    STATUSES.forEach((s) => { c[s] = rows.filter((o) => o.status === s).length; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .filter((o) => status === "all" || o.status === status)
      .filter((o) => kind === "all" || o.kind === kind)
      .filter((o) => {
        if (!terms.length) return true;
        const hay = [o.order_no, o.customer?.full_name, o.customer?.phone, o.customer?.email, o.payment_ref, ...o.order_items.map((i) => i.name)]
          .filter(Boolean).join(" ").toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
  }, [rows, status, kind, query]);

  function changed(next) {
    setRows((prev) => prev.map((o) => (o.id === next.id ? next : o)));
    setOpen(next);
  }

  if (error) return <p className="admin-gate-error">{error}</p>;
  if (loading) return <p className="form-hint">Loading orders…</p>;

  const awaiting = rows.filter((o) => o.status === "pending").reduce((s, o) => s + Number(o.total), 0);
  const paid = rows.filter((o) => ["paid", "fulfilled"].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);

  return (
    <div>
      <div className="admin-stat-grid">
        <div className="admin-stat-card"><div className="admin-stat-label">Orders</div><div className="admin-stat-value">{rows.length}</div></div>
        <div className="admin-stat-card"><div className="admin-stat-label">Awaiting payment</div><div className="admin-stat-value">{counts.pending}</div><div className="admin-stat-sub" style={{ color: "#918f8f" }}>{ksh(awaiting)}</div></div>
        <div className="admin-stat-card"><div className="admin-stat-label">Paid revenue</div><div className="admin-stat-value">{ksh(paid)}</div></div>
      </div>

      <div className="cx-chips">
        {["all", ...STATUSES].map((s) => (
          <button key={s} type="button" className={`cx-chip${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : STATUS_LABEL[s]} · {counts[s]}
          </button>
        ))}
      </div>

      <div className="cx-toolbar">
        <input type="search" placeholder="Search order no, customer, phone, item or M-Pesa code…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Order type">
          <option value="all">All types</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="cx-count">{visible.length} shown</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders placed from the shop checkout and the Academy appear here." />
      ) : visible.length === 0 ? (
        <EmptyState title="No orders match" description="Try a different filter or search." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Type</th><th>Total</th><th>Status</th><th>Placed</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} className="cx-row" onClick={() => setOpen(o)}>
                  <td className="cx-name">{o.order_no}</td>
                  <td>
                    <div className="cx-name">{o.customer?.full_name || "(no name)"}</div>
                    <div className="cx-sub">{o.customer?.phone || o.customer?.email}</div>
                  </td>
                  <td className="cx-order-items">{o.order_items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</td>
                  <td>{KIND_LABEL[o.kind]}</td>
                  <td className="cx-money">{ksh(o.total)}</td>
                  <td><span className={`cx-status ${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td>{when(o.placed_at)}</td>
                  <td><button className="admin-btn secondary" type="button" onClick={(e) => { e.stopPropagation(); setOpen(o); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <OrderDetail key={open.id} order={open} onClose={() => setOpen(null)} onChanged={changed} />}
    </div>
  );
}
