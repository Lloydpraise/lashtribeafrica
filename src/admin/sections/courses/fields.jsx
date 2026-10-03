import { useEffect, useState } from "react";

export function Field({ label, hint, span, children, className = "" }) {
  return (
    <label className={`form-field${span ? " span-2" : ""} ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </label>
  );
}

/** One item per line in a textarea <-> string[] in state. */
export function LinesField({ value, onChange, rows = 4, placeholder }) {
  const [text, setText] = useState((value || []).join("\n"));
  useEffect(() => {
    // re-sync only when the outside value genuinely differs (e.g. block moved or replaced)
    if ((value || []).join("\n") !== text.split("\n").map((l) => l.trim()).filter(Boolean).join("\n")) {
      setText((value || []).join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <textarea
      rows={rows}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
      }}
    />
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="cs-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cs-toggle-track" aria-hidden />
      <span className="cs-toggle-text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="cs-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const cls = status === "published" ? "admin-badge-active" : "admin-badge-inactive";
  return <span className={cls}>{status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft"}</span>;
}

export function Notice({ kind = "info", children, onClose }) {
  return (
    <div className={`cs-notice ${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onClose && (
        <button type="button" className="cs-notice-x" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function ConfirmModal({ title, children, confirmLabel = "Confirm", danger, busy, onConfirm, onCancel }) {
  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <div className="admin-modal confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-body">
          <h3>{title}</h3>
          <div className="form-hint">{children}</div>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`admin-btn${danger ? " danger" : ""}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
