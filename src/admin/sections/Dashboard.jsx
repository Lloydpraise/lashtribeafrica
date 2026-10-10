import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { supabase } from "../../services/service.js";

const ksh = (v) => `Ksh ${Number(v || 0).toLocaleString()}`;

// The four headline numbers come from real orders (last 30 days). Paid and completed orders only.
async function loadStats() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [items, orders, customers] = await Promise.all([
    supabase
      .from("order_items")
      .select("item_type, line_total, orders!inner(status, placed_at)")
      .gte("orders.placed_at", since)
      .in("orders.status", ["paid", "fulfilled"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("placed_at", since).not("status", "in", "(cancelled,refunded)"),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if (items.error) throw items.error;
  let shop = 0;
  let academy = 0;
  (items.data || []).forEach((row) => {
    if (row.item_type === "product") shop += Number(row.line_total);
    else academy += Number(row.line_total);
  });
  return { shop, academy, orders: orders.count || 0, customers: customers.count || 0 };
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    loadStats()
      .then(setStats)
      .catch(() => setNote("Live numbers appear once migration 0011 is run."));
  }, []);

  const cards = [
    { label: "Ecommerce Revenue (30d)", value: stats ? ksh(stats.shop) : "—" },
    { label: "Academy Revenue (30d)", value: stats ? ksh(stats.academy) : "—" },
    { label: "Orders (30d)", value: stats ? stats.orders : "—" },
    { label: "New Customers (30d)", value: stats ? stats.customers : "—" },
  ];

  return (
    <div>
      <div className="admin-stat-grid">
        {cards.map((stat) => (
          <div className="admin-stat-card" key={stat.label}>
            <div className="admin-stat-label">{stat.label}</div>
            <div className="admin-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
      {note && <p className="form-hint" style={{ marginBottom: 16 }}>{note}</p>}

      <EmptyState
        title="Trends and top sellers coming here"
        description="Revenue trends, top products, top courses, and order volume — pulled from Supabase across both storefronts."
      />
    </div>
  );
}
