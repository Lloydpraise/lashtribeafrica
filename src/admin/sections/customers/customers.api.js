import { supabase } from "../../../services/service.js";

const num = (v) => Number(v || 0);

/** Every customer with their order totals (from the customer_stats view). */
export async function fetchCustomers() {
  const [customers, stats] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(3000),
    supabase.from("customer_stats").select("*").limit(3000),
  ]);
  if (customers.error) throw customers.error;
  if (stats.error) throw stats.error;

  const byId = new Map((stats.data || []).map((s) => [s.customer_id, s]));
  return (customers.data || []).map((c) => {
    const s = byId.get(c.id) || {};
    return {
      ...c,
      orders_count: num(s.orders_count),
      paid_orders_count: num(s.paid_orders_count),
      lifetime_value: num(s.lifetime_value),
      pending_value: num(s.pending_value),
      avg_order_value: num(s.avg_order_value),
      first_order_at: s.first_order_at || null,
      last_order_at: s.last_order_at || null,
      bought_products: Boolean(s.bought_products),
      bought_courses: Boolean(s.bought_courses),
    };
  });
}

/** Orders, products bought (with repeat counts) and course progress for one customer. */
export async function fetchCustomerDetail(customerId) {
  const [orders, products, courses] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").eq("customer_id", customerId).order("placed_at", { ascending: false }),
    supabase.from("customer_product_stats").select("*").eq("customer_id", customerId).order("total_spent", { ascending: false }),
    supabase.from("customer_course_progress").select("*").eq("customer_id", customerId).order("enrolled_at", { ascending: false }),
  ]);
  if (orders.error) throw orders.error;
  if (products.error) throw products.error;
  if (courses.error) throw courses.error;
  return { orders: orders.data || [], products: products.data || [], courses: courses.data || [] };
}

export async function saveCustomerNotes(id, { notes, tags }) {
  const { data, error } = await supabase
    .from("customers")
    .update({ notes: notes || null, tags })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
