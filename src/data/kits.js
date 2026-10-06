// Kits — "starter kit" bundles shown in the Kit Strip section. Several
// can be saved in the admin panel; only the one with is_active = true is
// resolved here. Falls back to null (KitStrip renders its old static
// copy) if Supabase isn't reachable or no kit is active yet.

import { supabase } from "../services/service.js";

export function slugifyKitTitle(title = "") {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapKit(row) {
  return {
    id: row.id,
    title: row.title,
    eyebrow: row.eyebrow,
    description: row.description || "",
    ctaLabel: row.cta_label,
    ctaLink: row.cta_link,
    productIds: row.product_ids || [],
    isActive: row.is_active,
  };
}

export async function getKits() {
  try {
    const { data, error } = await supabase
      .from("kits")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapKit);
  } catch (err) {
    console.warn("[kits] Couldn't load kits for the kit pages.", err?.message || err);
    return [];
  }
}

export async function getKitBySlug(slug) {
  const kits = await getKits();
  return kits.find((kit) => slugifyKitTitle(kit.title) === slug) || null;
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
