import EmptyState from "../components/EmptyState.jsx";

const PLACEHOLDER_STATS = [
  { label: "Ecommerce Revenue", value: "—" },
  { label: "Academy Revenue", value: "—" },
  { label: "Orders (30d)", value: "—" },
  { label: "New Customers (30d)", value: "—" },
];

export default function Dashboard() {
  return (
    <div>
      <div className="admin-stat-grid">
        {PLACEHOLDER_STATS.map((stat) => (
          <div className="admin-stat-card" key={stat.label}>
            <div className="admin-stat-label">{stat.label}</div>
            <div className="admin-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      <EmptyState
        title="Combined ecommerce + academy analytics coming here"
        description="Revenue trends, top products, top courses, and order volume — pulled from Supabase across both storefronts."
      />
    </div>
  );
}
