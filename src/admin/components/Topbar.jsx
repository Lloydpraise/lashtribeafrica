export default function Topbar({ title, subtitle, action }) {
  return (
    <div className="admin-topbar">
      <div>
        <div className="admin-title">{title}</div>
        {subtitle && <div className="admin-subtitle">{subtitle}</div>}
      </div>
      {action && <div className="admin-topbar-action">{action}</div>}
    </div>
  );
}
