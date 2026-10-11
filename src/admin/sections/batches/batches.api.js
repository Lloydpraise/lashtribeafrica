// Admin data layer for shipping batches and suppliers (migration 0013).
import { supabase } from "../../../services/service.js";

// ---------- batches ----------
export async function fetchAllBatches() {
  const { data, error } = await supabase.from("batches").select("*").order("ship_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addBatch(shipDate) {
  const { data, error } = await supabase.from("batches").insert({ ship_date: shipDate }).select().single();
  if (error) throw new Error(/duplicate key/i.test(error.message) ? "There is already a batch on that date." : error.message);
  return data;
}

export async function updateBatch(id, patch) {
  const { data, error } = await supabase.from("batches").update(patch).eq("id", id).select().single();
  if (error) throw new Error(/duplicate key/i.test(error.message) ? "There is already a batch on that date." : error.message);
  return data;
}

export async function deleteBatch(id) {
  // orders keep working: their batch_id is cleared and they show as "Unassigned"
  const { error } = await supabase.from("batches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Creates the 15th and month-end for the next N months. Returns how many were added. */
export async function generateBatches(months = 6) {
  const { data, error } = await supabase.rpc("generate_batches", { p_months: months });
  if (error) throw new Error(error.message);
  return data || 0;
}

export async function saveCutoffDays(days) {
  const { error } = await supabase.from("site_settings").update({ batch_cutoff_days: days }).eq("id", true);
  if (error) throw new Error(error.message);
}

export async function fetchCutoffDays() {
  const { data } = await supabase.from("site_settings").select("batch_cutoff_days").eq("id", true).maybeSingle();
  const n = Number(data?.batch_cutoff_days);
  return Number.isFinite(n) ? n : 7;
}

export async function moveOrderToBatch(orderId, batchId) {
  const { error } = await supabase.rpc("admin_move_order_batch", { p_order: orderId, p_batch: batchId || null });
  if (error) throw new Error(error.message);
}

/** Product quantities by supplier for one batch (paid orders; unpaid too when asked). */
export async function fetchSupplierLines(batchId, includeUnpaid = false) {
  const { data, error } = await supabase.rpc("batch_supplier_lines", {
    p_batch: batchId,
    p_include_unpaid: includeUnpaid,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- suppliers ----------
export async function fetchSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSupplier(fields) {
  const { data, error } = await supabase.from("suppliers").insert(fields).select().single();
  if (error) throw new Error(/duplicate key/i.test(error.message) ? "A supplier with that name already exists." : error.message);
  return data;
}

export async function updateSupplier(id, fields) {
  const { data, error } = await supabase.from("suppliers").update(fields).eq("id", id).select().single();
  if (error) throw new Error(/duplicate key/i.test(error.message) ? "A supplier with that name already exists." : error.message);
  return data;
}

export async function deleteSupplier(id) {
  // products keep existing: their supplier is cleared
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
