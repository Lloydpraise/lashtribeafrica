// Kits — "starter kit" bundles shown in the Kit Strip section. Several
// can be saved in the admin panel; only the one with is_active = true is
// resolved here. Falls back to null (KitStrip renders its old static
// copy) if Supabase isn't reachable or no kit is active yet.

import { supabase } from "../services/service.js";

function mapKit(row) {
  return {
    id: row.id,
    title: row.title,
    eyebrow: row.eyebrow,
    description: row.description || "",
    ctaLabel: row.cta_label,
    ctaLink: row.cta_link,
    productIds: row.product_ids || [],
  };
}

export async function getActiveKit() {
  try {
    const { data, error } = await supabase
      .from("kits")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapKit(data);
  } catch (err) {
    console.warn("[kits] Couldn't load the active kit — Kit Strip will use its fallback copy.", err?.message || err);
    return null;
  }
}

// Resolves a kit's productIds against the already-fetched product list
// (from getEcommerceProducts) so we don't issue a second query.
export function resolveKitProducts(kit, allProducts) {
  if (!kit) return [];
  return kit.productIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean);
}
