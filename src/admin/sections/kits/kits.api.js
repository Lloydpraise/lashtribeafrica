import { supabase } from "../../../services/service.js";

export async function fetchKits() {
  const { data, error } = await supabase
    .from("kits")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createKit(payload) {
  const { data, error } = await supabase.from("kits").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateKit(id, payload) {
  const { data, error } = await supabase.from("kits").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteKit(id) {
  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) throw error;
}

// Only one kit can be active (enforced by a unique index too). Deactivate
// whatever's currently active first, then activate the chosen one, so the
// two updates never collide with the "one active" constraint.
export async function setActiveKit(id) {
  const { error: clearError } = await supabase
    .from("kits")
    .update({ is_active: false })
    .eq("is_active", true);
  if (clearError) throw clearError;

  const { data, error } = await supabase
    .from("kits")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
