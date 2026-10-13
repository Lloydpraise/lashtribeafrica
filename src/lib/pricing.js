// Pricing rules shared by the storefront and the admin.
//
// These mirror the database (migration 0016: _resolve_options, _line_pricing, _offer_pct, formula_prices).
// The database is always the authority: place_order() and cart_quote() recompute everything on the server.
// This file only exists so a page can show the right price instantly while someone changes a quantity or
// picks an option, and so the admin can preview a formula price before saving.
//
// Tiers (per product):   quantity >= MOQ -> wholesale price (products.now_price)
//                        quantity <  MOQ -> retail price    (products.retail_price, blank = wholesale)
//                        market price    -> the crossed-out sticker (0 = none)
// Options (variants):    each option value may carry a price_delta that is added to all three prices.

export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Options exactly as the product page / admin work with them: [{ name, values: [{ value, priceDelta }] }]. */
export function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => ({
      name: String(o?.name ?? "").trim(),
      values: (Array.isArray(o?.values) ? o.values : [])
        .map((v) => ({ value: String(v?.value ?? "").trim(), priceDelta: num(v?.price_delta ?? v?.priceDelta) }))
        .filter((v) => v.value),
    }))
    .filter((o) => o.name && o.values.length);
}

/** Back to the stored shape (price_delta is only written when it is not zero). */
export function optionsForSave(options) {
  return normalizeOptions(options).map((o) => ({
    name: o.name,
    values: o.values.map((v) => (v.priceDelta ? { value: v.value, price_delta: v.priceDelta } : { value: v.value })),
  }));
}

const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * Checks a customer's choice against the product's options.
 * Returns { complete, missing: [option names], delta, chosen: { "Curl": "C" } } (names/values as the product spells them).
 */
export function resolveOptions(options, selected) {
  const defs = normalizeOptions(options);
  const picks = selected && typeof selected === "object" ? selected : {};
  let delta = 0;
  const missing = [];
  const chosen = {};
  for (const def of defs) {
    const key = Object.keys(picks).find((k) => same(k, def.name));
    const hit = key === undefined ? undefined : def.values.find((v) => same(v.value, picks[key]));
    if (!hit) {
      missing.push(def.name);
      continue;
    }
    delta += hit.priceDelta;
    chosen[def.name] = hit.value;
  }
  return { complete: missing.length === 0, missing, delta, chosen };
}

/**
 * Price adjustment while a customer is still choosing: chosen options count as chosen, options not chosen yet
 * count at their cheapest value. `partial` is true when an unchosen option could still change the price.
 */
export function previewDelta(options, selected) {
  const defs = normalizeOptions(options);
  const picks = selected && typeof selected === "object" ? selected : {};
  let delta = 0;
  let partial = false;
  for (const def of defs) {
    const key = Object.keys(picks).find((k) => same(k, def.name));
    const hit = key === undefined ? undefined : def.values.find((v) => same(v.value, picks[key]));
    if (hit) {
      delta += hit.priceDelta;
    } else {
      const deltas = def.values.map((v) => v.priceDelta);
      delta += Math.min(...deltas);
      if (Math.max(...deltas) !== Math.min(...deltas)) partial = true;
    }
  }
  return { delta, partial };
}

export const tierFor = (qty, moq) => (num(qty) >= Math.max(1, num(moq, 1)) ? "wholesale" : "retail");

/** Percentage off, rounded to a whole shilling (same as the database). */
export const applyPct = (price, pct) => Math.max(0, Math.round(num(price) * (1 - num(pct) / 100)));

/**
 * Prices of one line.
 * product: { nowPrice, retailPrice, marketPrice, moq, options, offerPct }
 * Returns { tier, wholesale, retail, market, unit, list } where wholesale/retail already include the option
 * delta AND any percentage offer; list is the unit price before the offer.
 * preview: true prices options not chosen yet at their cheapest value (for "From Ksh X" displays).
 */
export function linePrices(product, selected, qty, { preview = false } = {}) {
  const { delta } = preview ? previewDelta(product.options, selected) : resolveOptions(product.options, selected);
  const wholesaleList = Math.max(0, num(product.nowPrice) + delta);
  const retailBase = num(product.retailPrice) > 0 ? num(product.retailPrice) : num(product.nowPrice);
  const retailList = Math.max(0, retailBase + delta);
  const market = num(product.marketPrice) > 0 ? Math.max(0, num(product.marketPrice) + delta) : 0;
  const tier = tierFor(qty, product.moq);
  const pct = num(product.offerPct);
  return {
    tier,
    wholesale: applyPct(wholesaleList, pct),
    retail: applyPct(retailList, pct),
    market,
    list: tier === "wholesale" ? wholesaleList : retailList,
    unit: applyPct(tier === "wholesale" ? wholesaleList : retailList, pct),
  };
}

/** For product cards: the lowest the price can go once options are chosen, and whether it varies at all. */
export function priceSpread(options) {
  let fromDelta = 0;
  let varies = false;
  for (const o of normalizeOptions(options)) {
    const deltas = o.values.map((v) => v.priceDelta);
    const min = Math.min(...deltas);
    if (Math.max(...deltas) !== min) varies = true;
    fromDelta += min;
  }
  return { fromDelta, varies };
}

// ---------------------------------------------------------------------
// Formula (Site Settings -> Pricing formula). Mirrors formula_prices() in the database.
// ---------------------------------------------------------------------
export const DEFAULT_PRICING_SETTINGS = {
  fx_rate_kes_per_usd: 130,
  fx_buffer_pct: 3,
  landed_uplift_pct: 30,
  wholesale_margin_pct: 35,
  retail_markup_pct: 30,
  market_markup_pct: 20,
  rounding_step: 10,
};

/**
 * landed    = cost USD x rate x (1 + buffer%) x (1 + uplift%)
 * wholesale = landed / (1 - margin%)   retail = wholesale x (1 + retail markup%)   market = retail x (1 + market markup%)
 * each rounded to the rounding step. Returns null when there is no usable cost.
 */
export function formulaPrices(costUsd, settings = DEFAULT_PRICING_SETTINGS) {
  const cost = num(costUsd, NaN);
  if (!Number.isFinite(cost) || cost <= 0) return null;
  const s = { ...DEFAULT_PRICING_SETTINGS, ...settings };
  const step = Math.max(1, num(s.rounding_step, 1));
  const margin = num(s.wholesale_margin_pct);
  if (margin >= 100) return null;
  const landed =
    cost * num(s.fx_rate_kes_per_usd) * (1 + num(s.fx_buffer_pct) / 100) * (1 + num(s.landed_uplift_pct) / 100);
  const wholesale = Math.round(landed / (1 - margin / 100) / step) * step;
  const retail = Math.round((wholesale * (1 + num(s.retail_markup_pct) / 100)) / step) * step;
  const market = Math.round((retail * (1 + num(s.market_markup_pct) / 100)) / step) * step;
  return { landed: Math.round(landed), wholesale, retail, market };
}

export const formatKsh = (value) => `Ksh ${Number(value || 0).toLocaleString()}`;

/** "Curl: D, Thickness: 0.07" for a saved selection; "" when none. */
export const optionsText = (selected) =>
  selected && typeof selected === "object"
    ? Object.entries(selected).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "";

/** Order line name with its chosen options: "Lash Fans (Curl: D)". */
export const itemLabel = (item) => {
  const opts = optionsText(item?.selected_options);
  return opts ? `${item.name} (${opts})` : item.name;
};
