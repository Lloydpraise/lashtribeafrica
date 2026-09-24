const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "courses", label: "Courses" },
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "settings", label: "Site Settings" },
];

const ICONS = {
  dashboard: (
    <path d="M2 9.5 8 3l6 6.5M4 8v6.5h8V8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  products: (
    <path d="M2 5l6-3 6 3-6 3-6-3Zm0 0v6l6 3m0-3 6-3m-6 3v6m6-9v6l-6 3" strokeLinecap="round" strokeLinejoin="round" />
  ),
  courses: (
    <path d="M2 4.5h6.5a2 2 0 0 1 2 2V15A1.5 1.5 0 0 0 9 13.5H2Zm12 0H7.5a2 2 0 0 0-2 2V15a1.5 1.5 0 0 1 1.5-1.5H14Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  customers: (
    <path d="M6 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5 1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.5 14c.5-2.6 2.3-4 4.5-4s4 1.4 4.5 4M10 10.3c1.7.1 3 1.3 3.5 3.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  orders: (
    <path d="M3 4.5h1.8l1.2 6h6.4l1.3-5H4.8M6.8 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5.4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  settings: (
    <path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6-2.5a5.9 5.9 0 0 0-.1-1.1l1.4-1.1-1.4-2.4-1.6.6a5.8 5.8 0 0 0-1.9-1.1L10 1H6l-.4 1.9a5.8 5.8 0 0 0-1.9 1.1l-1.6-.6L.7 5.8l1.4 1.1A5.9 5.9 0 0 0 2 8c0 .4 0 .7.1 1.1L.7 10.2l1.4 2.4 1.6-.6c.6.5 1.2.9 1.9 1.1L6 15h4l.4-1.9c.7-.2 1.3-.6 1.9-1.1l1.6.6 1.4-2.4-1.4-1.1c.1-.4.1-.7.1-1.1Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        LASHTRIBE <em>Africa</em>
      </div>
      <div className="admin-sidebar-tag">Admin</div>
      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`admin-nav-item${active === item.key ? " active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <svg className="admin-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              {ICONS[item.key]}
            </svg>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export { NAV_ITEMS };
