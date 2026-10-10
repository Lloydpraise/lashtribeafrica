export default function Topbar({ title, subtitle, action, onLogout }) {
  return (
    <div className="admin-topbar">
      <div>
        <div className="admin-title">{title}</div>
        {subtitle && <div className="admin-subtitle">{subtitle}</div>}
      </div>
      <div className="admin-topbar-action" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {action}
        {onLogout && (
          <button className="admin-btn secondary" type="button" onClick={onLogout}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
