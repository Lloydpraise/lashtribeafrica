// Offers — % off and free-shipping promotions, managed from the admin
// Site Settings → Offers panel. Read from Supabase on each build/request;
// falls back to "no offers" (normal pricing everywhere) if Supabase isn't
// reachable, so a misconfigured offer never breaks the storefront.

import { supabase } from "../services/service.js";

function isLive(offer) {
  const now = Date.now();
  if (offer.starts_at && new Date(offer.starts_at).getTime() > now) return false;
  if (offer.ends_at && new Date(offer.ends_at).getTime() < now) return false;
  return true;
}

function mapOffer(row) {
  return {
    id: row.id,
    label: row.label,
    badgeText: row.badge_text || "",
    type: row.type, // 'percentage_off' | 'free_shipping'
    scope: row.scope, // 'all' | 'products' | 'categories'
    value: Number(row.value) || 0,
    productIds: row.product_ids || [],
    categoryIds: row.category_ids || [],
    minOrderValue: Number(row.min_order_value) || 0,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export async function getActiveOffers() {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapOffer).filter(isLive);
  } catch (err) {
    console.warn("[offers] Couldn't load offers — running with no active offers.", err?.message || err);
    return [];
  }
}

function defaultBadge(offer) {
  if (offer.badgeText) return offer.badgeText;
  if (offer.type === "percentage_off") return `${offer.value}% OFF`;
  if (offer.type === "free_shipping") return "FREE SHIPPING";
  return "OFFER";
}

function offerAppliesToProduct(offer, product) {
  if (offer.scope === "all") return true;
  if (offer.scope === "products") return offer.productIds.includes(product.id);
  if (offer.scope === "categories") {
    return Boolean(product.category?.id) && offer.categoryIds.includes(product.category.id);
  }
  return false;
}

// Attaches offer-adjusted pricing to a list of mapped products (the
// shape produced by ecommerce-products.js#mapRow). Adds:
//   effectivePrice — nowPrice, discounted if a % off offer applies
//   hasOffer       — whether a discount is currently applied
//   offerBadge     — text for the corner badge, e.g. "20% OFF"
//   offerId        — id of the offer that won (highest discount wins)
export function applyOfferPricing(products, offers) {
  const percentageOffers = offers.filter((o) => o.type === "percentage_off");

  return products.map((product) => {
    const applicable = percentageOffers.filter((o) => offerAppliesToProduct(o, product));
    if (applicable.length === 0) {
      return { ...product, effectivePrice: product.nowPrice, hasOffer: false, offerBadge: "", offerId: null };
    }

    const best = applicable.reduce((a, b) => (b.value > a.value ? b : a));
    const effectivePrice = Math.max(0, Math.round(product.nowPrice * (1 - best.value / 100)));

    return {
      ...product,
      effectivePrice,
      hasOffer: effectivePrice < product.nowPrice,
      offerBadge: defaultBadge(best),
      offerId: best.id,
    };
  });
}

// The single site-wide free-shipping offer, if one is active.
export function getFreeShippingOffer(offers) {
  const offer = offers.find((o) => o.type === "free_shipping");
  if (!offer) return null;
  return {
    id: offer.id,
    label: offer.label,
    badgeText: defaultBadge(offer),
    minOrderValue: offer.minOrderValue,
  };
}
