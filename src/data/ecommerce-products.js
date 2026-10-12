// Ecommerce product data — read from Supabase (the products table managed
// by the /admin panel) on each request so live admin edits appear without a
// manual rebuild. If Supabase can't be reached the catalog is empty (there is
// no made-up fallback data), and the build log says why.

import { supabase } from "../services/service.js";
import { getActiveOffers, applyOfferPricing } from "./offers.js";

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

function mapRow(row, allRows) {
  const complementSlugs = (row.complements || [])
    .map((id) => allRows.find((r) => r.id === id)?.slug)
    .filter(Boolean);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    features: row.features || [],
    note: row.note || "",
    badge: row.badge || "",
    icon: row.icon || "",
    marketPrice: Number(row.market_price) || 0,
    nowPrice: Number(row.now_price) || 0,
    moq: row.moq || 1,
    stockQuantity: row.stock_quantity ?? null,
    category: row.category ? { id: row.category.id, name: row.category.name, slug: row.category.slug } : null,
    featuredSections: row.featured_sections || [],
    images: row.images || [],
    videos: row.videos || [],
    complementSlugs,
  };
}

export async function getEcommerceProducts() {
  let products;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:category_id(id,name,slug)")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No active products found.");

    products = data.map((row) => mapRow(row, data));
  } catch (err) {
    // No invented products: an empty catalog is better than fake ones in front of customers.
    console.error(
      "[ecommerce-products] Couldn't load products, so the shop will be empty — " +
        (err?.message || err) +
        ". Check PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY and that the migrations in supabase/migrations/ have been run."
    );
    products = [];
  }

  // Layer in offer-adjusted pricing (effectivePrice/hasOffer/offerBadge).
  // Any failure here just means "no offers" — never blocks the catalog.
  const offers = await getActiveOffers();
  return applyOfferPricing(products, offers);
}

export async function getProductBySlug(slug) {
  const products = await getEcommerceProducts();
  return products.find((p) => p.slug === slug) || products[0];
}
