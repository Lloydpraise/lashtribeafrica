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
    type: row.type, // 'percentage_off' | 'free_shipping' | 'reduced_moq'
    scope: row.scope, // 'all' | 'products' | 'categories'
    value: Number(row.value) || 0,
    productIds: row.product_ids || [],
    categoryIds: row.category_ids || [],
    minOrderValue: Number(row.min_order_value) || 0,
    moqValue: Number(row.moq_value) || 0, // reduced_moq offers (0040: columns may not exist yet -> 0)
    campaign: row.campaign || "", // '' | 'black_friday'
    bannerText: row.banner_text || "",
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
  if (offer.type === "reduced_moq") return offer.moqValue ? `MOQ ${offer.moqValue}` : "LOWER MOQ";
  return "OFFER";
}

function offerAppliesToProduct(offer, product) {
  if (offer.scope === "all") return true;
  if (offer.scope === "products") return offer.productIds.includes(product.id);
  if (offer.scope === "categories") {
    // an offer on a main category also covers its subcategories
    const ids = [product.category?.id, product.category?.parent?.id].filter(Boolean);
    return ids.some((id) => offer.categoryIds.includes(id));
  }
  return false;
}

// Attaches offer-adjusted pricing to a list of mapped products (the
// shape produced by ecommerce-products.js#mapRow). Adds:
//   effectivePrice — nowPrice, discounted if a % off offer applies
//   hasOffer       — whether a discount is currently applied
//   offerBadge     — text for the corner badge, e.g. "20% OFF"
//   offerId        — id of the offer that won (highest discount wins)
//   offerPct       — the winning percentage (0 when none); the product page applies it to whichever
//                    price tier (wholesale / retail) the quantity falls in
//   fromPrice / effectiveFromPrice — wholesale price with the cheapest options chosen (cards show
//                    "From Ksh X" when priceVaries is true)
export const CAMPAIGN_BADGES = { black_friday: "BLACK FRIDAY DEAL" };

export function applyOfferPricing(products, offers) {
  const percentageOffers = offers.filter((o) => o.type === "percentage_off");
  const moqOffers = offers.filter((o) => o.type === "reduced_moq" && o.moqValue >= 1);
  const shipOffers = offers.filter((o) => o.type === "free_shipping" && !(o.minOrderValue > 0));
  const off = (price, pct) => Math.max(0, Math.round(price * (1 - pct / 100)));

  return products.map((product) => {
    const fromPrice = Math.max(0, product.nowPrice + (product.optionsFromDelta || 0));
    const applicable = percentageOffers.filter((o) => offerAppliesToProduct(o, product));

    // reduced MOQ and free shipping (mirrors _offer_moq / _offer_free_ship in the database)
    const moqHit = moqOffers.filter((o) => offerAppliesToProduct(o, product));
    const reducedMoq = moqHit.length ? Math.min(...moqHit.map((o) => o.moqValue)) : 0;
    const moqReduced = reducedMoq > 0 && reducedMoq < (product.moq || 1);
    const freeShipping = shipOffers.some((o) => offerAppliesToProduct(o, product));
    // a campaign deal = any live offer of a campaign that covers this product
    const campaignOffers = offers.filter((o) => o.campaign && offerAppliesToProduct(o, product));
    const campaign = campaignOffers[0]?.campaign || "";
    const extras = {
      moq: moqReduced ? reducedMoq : product.moq,
      originalMoq: product.moq,
      moqReduced,
      freeShipping,
      campaign,
      campaignBadge: campaign ? CAMPAIGN_BADGES[campaign] || "SALE" : "",
      dealNotes: [
        ...(moqReduced ? [`Order from ${reducedMoq}`] : []),
        ...(freeShipping ? ["Free shipping"] : []),
      ],
    };

    if (applicable.length === 0) {
      return {
        ...product,
        ...extras,
        effectivePrice: product.nowPrice,
        fromPrice,
        effectiveFromPrice: fromPrice,
        offerPct: 0,
        // a non-percentage deal still gets a small corner pill (the campaign badge is separate)
        hasOffer: false,
        offerBadge: "",
        offerId: null,
      };
    }

    const best = applicable.reduce((a, b) => (b.value > a.value ? b : a));
    const effectivePrice = off(product.nowPrice, best.value);

    return {
      ...product,
      ...extras,
      effectivePrice,
      fromPrice,
      effectiveFromPrice: off(fromPrice, best.value),
      offerPct: best.value,
      hasOffer: effectivePrice < product.nowPrice,
      offerBadge: defaultBadge(best),
      offerId: best.id,
    };
  });
}

// What the homepage campaign banner + strip need. Null when no campaign offer is live (the section is then
// not rendered at all). products: the output of applyOfferPricing.
export function getCampaign(offers, products, name = "black_friday") {
  const live = offers.filter((o) => o.campaign === name);
  if (live.length === 0) return null;
  const dealProducts = products.filter((p) => p.campaign === name);
  const bannerText =
    live.find((o) => o.bannerText)?.bannerText ||
    live.map((o) => o.label.replace(/\s*\(TEST\)/i, "")).join(" · ");
  return {
    name,
    title: name === "black_friday" ? "Black Friday Sale" : "Sale",
    bannerText,
    products: dealProducts,
  };
}

// The single site-wide free-shipping offer, if one is active.
export function getFreeShippingOffer(offers) {
  // only a site-wide offer takes over the top ticker; per-product / campaign free shipping shows on the products
  const offer = offers.find((o) => o.type === "free_shipping" && o.scope === "all" && !o.campaign);
  if (!offer) return null;
  return {
    id: offer.id,
    label: offer.label,
    badgeText: defaultBadge(offer),
    minOrderValue: offer.minOrderValue,
  };
}
