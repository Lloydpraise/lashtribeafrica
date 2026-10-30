import { useEffect, useMemo, useState } from "react";
import { updateBatch, fetchSupplierLines, fetchSupplierPool } from "./batches.api.js";
import { buildBatchPdf, downloadPdfBytes, batchPdfName } from "./batchPdf.js";
import { daysUntil, formatBatchDate, nairobiToday } from "../../../data/batches.js";
import { itemLabel } from "../../../lib/pricing.js";

const ksh = (v) => `Ksh ${Number(v || 0).toLocaleString()}`;
const STATUS_LABEL = { open: "Open", closed: "Closed", ordered: "Ordered from supplier", shipped: "Shipped", arrived: "Arrived, ready to collect" };
const ORDER_STATUS = { pending: "Awaiting payment", paid: "Paid", fulfilled: "Completed", cancelled: "Cancelled", refunded: "Refunded" };
const live = (o) => !["cancelled", "refunded"].includes(o.status);

function countdownText(shipDate) {
  const d = daysUntil(shipDate);
  if (d < 0) return `${-d} day${d === -1 ? "" : "s"} ago`;
  if (d === 0) return "ships today";
  if (d === 1) return "ships tomorrow";
  return `ships in ${d} days`;
}

/** When a batch stops taking new orders: the last day an order can still join it. */
function lastOrderDay(shipDate, cutoff) {
  const d = new Date(`${shipDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - cutoff - 1);
  return d.toISOString().slice(0, 10);
}

function PdfPanel({ batch, orders, suppliers, onClose }) {
  const [includeUnpaid, setIncludeUnpaid] = useState(false);
  const [dispatch, setDispatch] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const lines = await fetchSupplierLines(batch.id, includeUnpaid);
      const sup = suppliers.find((s) => s.id === supplierId);
      const bytes = await buildBatchPdf({
        batch,
        lines,
        suppliers,
        orders,
        options: { onlySupplierId: supplierId || null, includeUnpaid, includeDispatch: dispatch && !supplierId },
      });
      downloadPdfBytes(bytes, batchPdfName(batch.ship_date, sup ? `${sup.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "supplier-order"));
    } catch (e) {
      setError(e.message || "Couldn't build the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bt-pdf-panel">
      <div className="bt-pdf-row">
        <label className="bt-check"><input type="checkbox" checked={includeUnpaid} onChange={(e) => setIncludeUnpaid(e.target.checked)} /> Include orders awaiting payment</label>
        <label className="bt-check"><input type="checkbox" checked={dispatch && !supplierId} disabled={Boolean(supplierId)} onChange={(e) => setDispatch(e.target.checked)} /> Add dispatch list (customers and items)</label>
      </div>
      <div className="bt-pdf-row">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label="Supplier">
          <option value="">All suppliers (one section each)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>Only {s.name}</option>)}
        </select>
        <button type="button" className="admin-btn" disabled={busy} onClick={download}>{busy ? "Building…" : "Download PDF"}</button>
        <button type="button" className="admin-btn secondary" onClick={onClose}>Close</button>
      </div>
      {error && <p className="admin-gate-error">{error}</p>}
    </div>
  );
}

/** Pooled quantity per product against its supplier MOQ: what is full, what is still short. */
function PoolPanel({ batch, orderKey }) {
  const [rows, setRows] = useState(null);
  const [unpaid, setUnpaid] = useState(false);

  useEffect(() => {
    let live = true;
    fetchSupplierPool(batch.id, unpaid).then((r) => live && setRows(r));
    return () => { live = false; };
  }, [batch.id, unpaid, orderKey]);

  if (rows === null) return <p className="form-hint">Loading…</p>;
  const tracked = rows.filter((r) => Number(r.supplier_moq) > 1);
  const rest = rows.length - tracked.length;
  return (
    <div className="bt-pdf-panel">
      <label className="bt-check"><input type="checkbox" checked={unpaid} onChange={(e) => setUnpaid(e.target.checked)} /> Include orders awaiting payment</label>
      {tracked.length === 0 ? (
        <p className="form-hint" style={{ margin: "8px 0 0" }}>No product with a supplier MOQ in this shipment yet.</p>
      ) : (
        <ul className="bt-orders">
          {tracked.map((r) => {
            const full = Number(r.short_by) === 0;
            return (
              <li key={r.product_id || r.product_name}>
                <div>
                  <div className="cx-name">{r.product_name}</div>
                  <div className="cx-sub">{r.supplier_name} · {r.orders_count} order{Number(r.orders_count) === 1 ? "" : "s"}</div>
                </div>
                <div className="bt-order-side">
                  <span className="cx-money">{r.quantity} / {r.supplier_moq}</span>
                  <span className={`cx-status ${full ? "paid" : "pending"}`}>{full ? "Lot full" : `${r.short_by} short`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rest > 0 && <p className="form-hint" style={{ margin: "8px 0 0" }}>{rest} more product{rest === 1 ? "" : "s"} with no supplier MOQ.</p>}
    </div>
  );
}

function BatchCard({ batch, orders, suppliers, cutoff, onOpenOrder, onBatchChanged, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [pdf, setPdf] = useState(false);
  const [pool, setPool] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const counted = orders.filter(live);
  const units = counted.reduce((s, o) => s + (o.order_items || []).filter((i) => i.item_type === "product").reduce((n, i) => n + i.quantity, 0), 0);
  const value = counted.reduce((s, o) => s + Number(o.total), 0);
  const unpaid = counted.filter((o) => o.status === "pending").length;
  const days = batch ? daysUntil(batch.ship_date) : null;
  const closesOn = batch && batch.status === "open" ? lastOrderDay(batch.ship_date, cutoff) : null;
  const stillTaking = closesOn && closesOn >= nairobiToday();

  async function setStatus(status) {
    setBusy(true);
    setError("");
    try {
      onBatchChanged(await updateBatch(batch.id, { status }));
    } catch (e) {
      setError(e.message || "Couldn't update the batch.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`admin-card bt-card${batch ? "" : " unassigned"}${days !== null && days < 0 ? " past" : ""}`}>
      <div className="bt-card-head">
        <div>
          <div className="bt-card-title">{batch ? formatBatchDate(batch.ship_date, true) : "Unassigned orders"}</div>
          <div className="bt-sub">
            {batch ? (
              <>
                {countdownText(batch.ship_date)}
                {closesOn && (stillTaking ? ` · taking orders until ${formatBatchDate(closesOn)}` : " · no longer taking new orders")}
              </>
            ) : (
              "Placed while no batch was open. Open one and move them in."
            )}
          </div>
        </div>
        {batch && (
          <select value={batch.status} disabled={busy} onChange={(e) => setStatus(e.target.value)} aria-label="Batch status" className={`bt-status ${batch.status}`}>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
      </div>

      <div className="bt-stats">
        <div><b>{counted.length}</b><span>orders</span></div>
        <div><b>{units}</b><span>units</span></div>
        <div><b>{ksh(value)}</b><span>value</span></div>
        <div><b>{unpaid}</b><span>unpaid</span></div>
      </div>
      {error && <p className="admin-gate-error">{error}</p>}

      <div className="bt-card-actions">
        <button type="button" className="admin-btn secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide orders" : `Show orders (${orders.length})`}
        </button>
        {batch && <button type="button" className="admin-btn secondary" onClick={() => setPool((v) => !v)}>Supplier MOQ pool</button>}
        {batch && <button type="button" className="admin-btn" onClick={() => setPdf((v) => !v)}>Supplier PDF</button>}
      </div>

      {pool && batch && <PoolPanel batch={batch} orderKey={orders.map((o) => o.id + o.status).join()} />}
      {pdf && batch && <PdfPanel batch={batch} orders={counted} suppliers={suppliers} onClose={() => setPdf(false)} />}

      {open && (
        orders.length === 0 ? (
          <p className="form-hint" style={{ margin: "12px 0 0" }}>No product orders in this batch yet.</p>
        ) : (
          <ul className="bt-orders">
            {orders.map((o) => (
              <li key={o.id} className={live(o) ? "" : "dim"} onClick={() => onOpenOrder(o)}>
                <div>
                  <div className="cx-name">{o.order_no} · {o.customer?.full_name || "(no name)"}</div>
                  <div className="cx-sub">{(o.order_items || []).map((i) => `${itemLabel(i)}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</div>
                </div>
                <div className="bt-order-side">
                  <span className="cx-money">{ksh(o.total)}</span>
                  <span className={`cx-status ${o.status}`}>{ORDER_STATUS[o.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export default function BatchesView({ rows, batches, suppliers, cutoff, onOpenOrder, onBatchChanged }) {
  const [showPast, setShowPast] = useState(false);
  const today = nairobiToday();

  // only orders with products travel in a shipment; course-only orders have no batch
  const productOrders = useMemo(
    () => rows.filter((o) => (o.order_items || []).some((i) => i.item_type === "product")),
    [rows],
  );
  const byBatch = useMemo(() => {
    const m = new Map();
    productOrders.forEach((o) => {
      const k = o.batch_id || "none";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(o);
    });
    return m;
  }, [productOrders]);

  const unassigned = byBatch.get("none") || [];
  const current = batches.filter((b) => b.status !== "shipped" && b.ship_date >= today);
  const past = batches.filter((b) => b.status === "shipped" || b.ship_date < today).reverse();
  const pastWithOrders = past.filter((b) => (byBatch.get(b.id) || []).length > 0 || b.status === "shipped");

  if (batches.length === 0 && unassigned.length === 0) {
    return (
      <div className="admin-card">
        <p className="form-hint" style={{ margin: 0 }}>
          No shipping batches yet. Open <b>Site Settings → Shipping batches</b> and generate the next few months.
        </p>
      </div>
    );
  }

  return (
    <div>
      {unassigned.length > 0 && (
        <BatchCard batch={null} orders={unassigned} suppliers={suppliers} cutoff={cutoff} onOpenOrder={onOpenOrder} onBatchChanged={onBatchChanged} defaultOpen />
      )}
      {current.map((b, i) => (
        <BatchCard key={b.id} batch={b} orders={byBatch.get(b.id) || []} suppliers={suppliers} cutoff={cutoff} onOpenOrder={onOpenOrder} onBatchChanged={onBatchChanged} defaultOpen={i === 0} />
      ))}
      {current.length === 0 && <p className="form-hint">No upcoming batches. Add more in Site Settings.</p>}

      {pastWithOrders.length > 0 && (
        <>
          <button type="button" className="bt-link" onClick={() => setShowPast((v) => !v)}>
            {showPast ? "Hide past batches" : `Show past batches (${pastWithOrders.length})`}
          </button>
          {showPast && pastWithOrders.map((b) => (
            <BatchCard key={b.id} batch={b} orders={byBatch.get(b.id) || []} suppliers={suppliers} cutoff={cutoff} onOpenOrder={onOpenOrder} onBatchChanged={onBatchChanged} defaultOpen={false} />
          ))}
        </>
      )}
    </div>
  );
}
