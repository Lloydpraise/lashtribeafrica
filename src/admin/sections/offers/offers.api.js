import { supabase } from "../../../services/service.js";

export async function fetchOffers() {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createOffer(payload) {
  const { data, error } = await supabase.from("offers").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOffer(id, payload) {
  const { data, error } = await supabase.from("offers").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOffer(id) {
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleOfferActive(id, isActive) {
  const { data, error } = await supabase
    .from("offers")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
