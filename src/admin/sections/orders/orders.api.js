import { supabase } from "../../../services/service.js";

const SELECT = "*, customer:customer_id(id, full_name, phone, email, user_id), order_items(*)";

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .order("placed_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data || [];
}

/** Changes status through the database function, which also grants / revokes course access. */
export async function setOrderStatus(orderId, status, { method, ref } = {}) {
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order: orderId,
    p_status: status,
    p_method: method || null,
    p_ref: ref || null,
  });
  if (error) throw new Error(error.message);
  const { data, error: readError } = await supabase.from("orders").select(SELECT).eq("id", orderId).single();
  if (readError) throw readError;
  return data;
}
