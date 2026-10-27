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

/**
 * Options exactly as the product page / admin work with them:
 *   [{ name, type, values: [{ value, priceDelta, image, swatch }] }]
 * type    "auto" | "text" | "color" | "image": how the picker is drawn (see optionDisplayType).
 * weightKg  estimated weight of that variation in kg (0 = use the product's weight); drives the shipping fee.
 * image   URL of a product photo linked to that value; the product page shows it when the value is picked.
 * swatch  optional colour (#hex) used by colour pickers when the value's name is not itself a CSS colour.
 * The database only checks name / value / price_delta, so the extra keys need no migration.
 */
export const OPTION_TYPES = ["auto", "text", "color", "image"];

export function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => ({
      name: String(o?.name ?? "").trim(),
      type: OPTION_TYPES.includes(o?.type) ? o.type : "auto",
      values: (Array.isArray(o?.values) ? o.values : [])
        .map((v) => ({
          value: String(v?.value ?? "").trim(),
          priceDelta: num(v?.price_delta ?? v?.priceDelta),
          image: String(v?.image ?? "").trim(),
          swatch: String(v?.swatch ?? "").trim(),
          weightKg: Math.max(0, num(v?.weight_kg ?? v?.weightKg)),
        }))
        .filter((v) => v.value),
    }))
    .filter((o) => o.name && o.values.length);
}

/** Back to the stored shape (price_delta, image, swatch and type are only written when they carry something). */
export function optionsForSave(options) {
  return normalizeOptions(options).map((o) => ({
    name: o.name,
    ...(o.type !== "auto" ? { type: o.type } : {}),
    values: o.values.map((v) => ({
      value: v.value,
      ...(v.priceDelta ? { price_delta: v.priceDelta } : {}),
      ...(v.image ? { image: v.image } : {}),
      ...(v.swatch ? { swatch: v.swatch } : {}),
      ...(v.weightKg ? { weight_kg: v.weightKg } : {}),
    })),
  }));
}

const NAMED_COLORS = new Set(
  ("black white red green blue yellow orange purple pink brown grey gray silver gold beige ivory navy teal maroon " +
    "burgundy coral cyan magenta lavender violet turquoise tan khaki olive lime mint peach plum rose nude cream " +
    "charcoal bronze copper champagne").split(" ")
);

/** A usable CSS colour for a value, or "" when there is none (explicit swatch first, then a colour name / hex). */
export function swatchColor(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (hex.test(value.swatch || "")) return value.swatch;
  const name = String(value.value || "").trim().toLowerCase();
  if (hex.test(name) || NAMED_COLORS.has(name)) return name;
  return "";
}

/**
 * How an option is drawn on the product page.
 *   "color"  round swatches   (admin chose it, or the type is named Colour/Color/Shade and every value has a colour)
 *   "image"  photo tiles      (admin chose it, or every value has a linked photo and it is not a colour)
 *   "text"   plain pills      (everything else, e.g. Curl, Length, Size)
 */
export function optionDisplayType(option) {
  if (option.type === "color" || option.type === "image" || option.type === "text") return option.type;
  const allColors = option.values.every((v) => swatchColor(v));
  if (/colou?r|shade/i.test(option.name) && allColors) return "color";
  if (option.values.every((v) => v.image)) return "image";
  return "text";
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
// Formula (Site Settings -> Pricing formula). Mirrors formula_prices() and the shipping helpers in the database
// (migration 0029). The database stays the authority: place_order() recomputes prices AND shipping.
// ---------------------------------------------------------------------
export const DEFAULT_PRICING_SETTINGS = {
  fx_rate_kes_per_usd: 130,
  wholesale_multiplier: 1.3,
  retail_multiplier: 1.7,
  market_uplift_min_pct: 30,
  market_uplift_max_pct: 45,
  shipping_rate_per_kg: 1700,
  rounding_step: 10,
};

/**
 * supplier price (Ksh) = cost in USD x exchange rate
 * wholesale = supplier x wholesale multiplier    retail = supplier x retail multiplier
 * market    = retail x (1 + a % between the min and max uplift; `rand` in 0..1 picks where, so each product differs)
 * each rounded to the rounding step. Returns null when there is no usable cost.
 */
export function formulaPrices(costUsd, settings = DEFAULT_PRICING_SETTINGS, rand = Math.random()) {
  const cost = num(costUsd, NaN);
  if (!Number.isFinite(cost) || cost <= 0) return null;
  const s = { ...DEFAULT_PRICING_SETTINGS, ...settings };
  const step = Math.max(1, num(s.rounding_step, 1));
  const supplier = cost * num(s.fx_rate_kes_per_usd);
  const wholesale = Math.round((supplier * num(s.wholesale_multiplier)) / step) * step;
  const retail = Math.round((supplier * num(s.retail_multiplier)) / step) * step;
  const lo = num(s.market_uplift_min_pct);
  const hi = Math.max(lo, num(s.market_uplift_max_pct));
  const market = Math.round((retail * (1 + (lo + rand * (hi - lo)) / 100)) / step) * step;
  return { supplier: Math.round(supplier), wholesale, retail, market };
}

/** Shipping to our offices: weight (kg) x rate per kg, rounded up to a whole shilling (same as the database). */
export const shippingFor = (weightKg, ratePerKg = DEFAULT_PRICING_SETTINGS.shipping_rate_per_kg) =>
  Math.ceil(Math.max(0, num(weightKg)) * num(ratePerKg));

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
