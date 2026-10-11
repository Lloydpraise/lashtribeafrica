import { useEffect, useMemo, useState } from "react";
import {
  fetchAllBatches, addBatch, updateBatch, deleteBatch, generateBatches,
  fetchCutoffDays, saveCutoffDays,
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from "./batches.api.js";
import { daysUntil, formatBatchDate, nairobiToday } from "../../../data/batches.js";

const STATUS_LABEL = { open: "Open", closed: "Closed", ordered: "Ordered from supplier", shipped: "Shipped" };

function dayChip(shipDate) {
  const d = daysUntil(shipDate);
  if (d < 0) return `${-d}d ago`;
  if (d === 0) return "today";
  return `in ${d}d`;
}

/** Site Settings → shipping batches. Replaces the old single "ordering window" date. */
export function BatchesCard() {
  const [batches, setBatches] = useState([]);
  const [cutoff, setCutoff] = useState(7);
  const [cutoffDraft, setCutoffDraft] = useState("7");
  const [newDate, setNewDate] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    Promise.all([fetchAllBatches(), fetchCutoffDays()])
      .then(([rows, days]) => {
        setBatches(rows);
        setCutoff(days);
        setCutoffDraft(String(days));
      })
      .catch((e) => setError(e.message || "Couldn't load batches. Has migration 0013 been run?"))
      .finally(() => setLoading(false));
  }, []);

  const today = nairobiToday();
  const visible = useMemo(
    () => batches.filter((b) => showPast || b.ship_date >= today),
    [batches, showPast, today],
  );
  const hiddenPast = batches.length - batches.filter((b) => b.ship_date >= today).length;

  async function run(fn) {
    setBusy(true);
    setError("");
    setNote("");
    try { await fn(); } catch (e) { setError(e.message || "Something went wrong."); } finally { setBusy(false); }
  }

  const sortBatches = (rows) => [...rows].sort((a, b) => a.ship_date.localeCompare(b.ship_date));

  const onAdd = () => newDate && run(async () => {
    const row = await addBatch(newDate);
    setBatches((p) => sortBatches([...p, row]));
    setNewDate("");
  });

  const onGenerate = () => run(async () => {
    const added = await generateBatches(6);
    setBatches(await fetchAllBatches());
    setNote(added ? `Added ${added} batch date${added === 1 ? "" : "s"}.` : "Those dates already exist, nothing new to add.");
  });

  const onPatch = (b, patch) => run(async () => {
    const row = await updateBatch(b.id, patch);
    setBatches((p) => sortBatches(p.map((x) => (x.id === row.id ? row : x))));
  });

  const onDelete = (b) => {
    if (!window.confirm(`Delete the ${formatBatchDate(b.ship_date, true)} batch? Orders in it become "Unassigned" and can be moved to another batch.`)) return;
    run(async () => {
      await deleteBatch(b.id);
      setBatches((p) => p.filter((x) => x.id !== b.id));
    });
  };

  const onSaveCutoff = () => run(async () => {
    const n = Math.max(0, Math.min(60, Math.round(Number(cutoffDraft))));
    await saveCutoffDays(n);
    setCutoff(n);
    setCutoffDraft(String(n));
    setNote("Cutoff saved. It applies to orders placed from now on.");
  });

  if (loading) return <div className="admin-card" style={{ marginBottom: 20 }}><p className="form-hint">Loading batches…</p></div>;

  return (
    <div className="admin-card" style={{ marginBottom: 20 }}>
      <div className="admin-card-header"><h3>Shipping batches</h3></div>
      <p className="form-hint" style={{ margin: "0 0 14px" }}>
        Suppliers ship twice a month. The hero shows the next batch. A new order joins the first <b>open</b> batch
        that is <b>more than {cutoff} days</b> away. Closer batches are skipped, and the customer sees the batch they
        got at checkout.
      </p>
      {error && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{error}</p>}
      {note && <p className="form-hint" style={{ color: "var(--green)", marginBottom: 12 }}>{note}</p>}

      <div className="bt-toolbar">
        <button type="button" className="admin-btn" disabled={busy} onClick={onGenerate}>
          Generate 15th &amp; month-end (next 6 months)
        </button>
        <div className="bt-inline">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Add one batch date" />
          <button type="button" className="admin-btn secondary" disabled={busy || !newDate} onClick={onAdd}>Add date</button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="form-hint">No upcoming batches yet. Generate them above, or add a date.</p>
      ) : (
        <ul className="bt-list">
          {visible.map((b) => (
            <li key={b.id} className={`bt-row${b.ship_date < today ? " past" : ""}`}>
              <div className="bt-date">
                <input
                  type="date"
                  defaultValue={b.ship_date}
                  key={b.ship_date}
                  disabled={busy}
                  aria-label="Ship date"
                  onBlur={(e) => e.target.value && e.target.value !== b.ship_date && onPatch(b, { ship_date: e.target.value })}
                />
                <span className="bt-sub">{formatBatchDate(b.ship_date)} · {dayChip(b.ship_date)}</span>
              </div>
              <select value={b.status} disabled={busy} aria-label="Batch status" onChange={(e) => onPatch(b, { status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button type="button" className="admin-btn secondary danger" disabled={busy} onClick={() => onDelete(b)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      {hiddenPast > 0 && (
        <button type="button" className="bt-link" onClick={() => setShowPast((v) => !v)}>
          {showPast ? "Hide past batches" : `Show ${hiddenPast} past batch${hiddenPast === 1 ? "" : "es"}`}
        </button>
      )}

      <div className="bt-cutoff">
        <label htmlFor="btCutoff">Cutoff: orders can join a batch only if it is more than</label>
        <input id="btCutoff" type="number" min="0" max="60" value={cutoffDraft} onChange={(e) => setCutoffDraft(e.target.value)} />
        <span>days away</span>
        <button type="button" className="admin-btn secondary" disabled={busy || Number(cutoffDraft) === cutoff} onClick={onSaveCutoff}>Save</button>
      </div>
    </div>
  );
}

const blank = { name: "", contact_name: "", phone: "", email: "", notes: "" };

/** Site Settings → suppliers (products are linked to one when you add or edit them). */
export function SuppliersCard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then(setRows)
      .catch((e) => setError(e.message || "Couldn't load suppliers. Has migration 0013 been run?"))
      .finally(() => setLoading(false));
  }, []);

  async function run(fn) {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e.message || "Something went wrong."); } finally { setBusy(false); }
  }
  const clean = (f) => ({
    name: f.name.trim(),
    contact_name: f.contact_name.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    notes: f.notes.trim() || null,
  });
  const byName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  const onAdd = () => draft.name.trim() && run(async () => {
    const row = await createSupplier(clean(draft));
    setRows((p) => byName([...p, row]));
    setDraft(blank);
  });
  const onSave = () => edit.name.trim() && run(async () => {
    const row = await updateSupplier(editId, clean(edit));
    setRows((p) => byName(p.map((x) => (x.id === row.id ? row : x))));
    setEditId(null);
  });
  const onDelete = (s) => {
    if (!window.confirm(`Delete ${s.name}? Its products stay but will have no supplier until you pick another.`)) return;
    run(async () => {
      await deleteSupplier(s.id);
      setRows((p) => p.filter((x) => x.id !== s.id));
    });
  };

  const fields = (f, setF) => (
    <div className="bt-supplier-form">
      <input type="text" placeholder="Supplier name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input type="text" placeholder="Contact person" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} />
      <input type="text" placeholder="Phone / WhatsApp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
    </div>
  );

  return (
    <div className="admin-card" style={{ marginBottom: 20 }}>
      <div className="admin-card-header"><h3>Suppliers</h3></div>
      <p className="form-hint" style={{ margin: "0 0 14px" }}>
        Every product belongs to a supplier, chosen on the product form. The batch PDF groups what to order by supplier.
      </p>
      {error && <p className="admin-gate-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading ? <p className="form-hint">Loading…</p> : (
        <>
          {rows.length === 0 && <p className="form-hint">No suppliers yet. Add your first one below.</p>}
          <ul className="bt-list">
            {rows.map((s) => (
              <li key={s.id} className="bt-row supplier">
                {editId === s.id ? (
                  <>
                    {fields(edit, setEdit)}
                    <div className="bt-actions">
                      <button type="button" className="admin-btn" disabled={busy || !edit.name.trim()} onClick={onSave}>Save</button>
                      <button type="button" className="admin-btn secondary" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="bt-name">{s.name}</div>
                      <div className="bt-sub">{[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ") || "No contact details"}</div>
                    </div>
                    <div className="bt-actions">
                      <button type="button" className="admin-btn secondary" onClick={() => { setEditId(s.id); setEdit({ name: s.name, contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", notes: s.notes || "" }); }}>Edit</button>
                      <button type="button" className="admin-btn secondary danger" disabled={busy} onClick={() => onDelete(s)}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="bt-add-supplier">
            <h4>Add supplier</h4>
            {fields(draft, setDraft)}
            <button type="button" className="admin-btn secondary" disabled={busy || !draft.name.trim()} onClick={onAdd}>Add supplier</button>
          </div>
        </>
      )}
    </div>
  );
}
