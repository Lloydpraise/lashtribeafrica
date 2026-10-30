// Ecommerce product data: read from Supabase (the products table managed by the /admin panel).
// If Supabase can't be reached the catalog is empty (there is no made-up fallback data), and the
// build log says why.
//
// Built for hundreds of products:
//   * the catalog is fetched ONCE per build and shared by every page (it used to be fetched again for
//     every product page, header and card strip),
//   * it is read in pages of 1,000 rows (Supabase silently stops at 1,000 per request),
//   * only the columns the storefront needs are selected (costs live in a private table).
// In `astro dev` nothing is cached, so admin edits show up on refresh.

import { supabase } from "../services/service.js";
import { getActiveOffers, applyOfferPricing } from "./offers.js";
import { normalizeOptions, priceSpread, num } from "../lib/pricing.js";

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

const PAGE_SIZE = 1000;
const COLUMNS =
  "id, slug, name, description, features, note, badge, icon, market_price, now_price, retail_price, moq, " +
  "images, videos, status, sort_order, complements, featured_sections, options, " +
  "category:category_id(id,name,slug,sort_order,parent:parent_id(id,name,slug,sort_order))";

// A product's category is its subcategory when it has one; `parent` is then the main category (0025).
function mapCategory(c) {
  const parent = c.parent ? { id: c.parent.id, name: c.parent.name, slug: c.parent.slug, sortOrder: c.parent.sort_order ?? 0 } : null;
  return { id: c.id, name: c.name, slug: c.slug, sortOrder: c.sort_order ?? 0, parent };
}

const text = (v) => (typeof v === "string" ? v.trim() : "");
const list = (v) => (Array.isArray(v) ? v : []);

// Keeps only well-formed SEO entries, so a half-filled row never breaks a product page.
function mapSeo(seo) {
  if (!seo || typeof seo !== "object") return null;
  return {
    title: text(seo.title),
    meta: text(seo.meta),
    alt: text(seo.alt),
    sections: list(seo.sections).filter((s) => text(s?.heading) && text(s?.body)),
    specs: list(seo.specs).filter((s) => text(s?.label) && text(s?.value)),
    faqs: list(seo.faqs).filter((f) => text(f?.q) && text(f?.a)),
  };
}

function mapRow(row, slugById) {
  const options = normalizeOptions(row.options);
  const { fromDelta, varies } = priceSpread(options);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    features: row.features || [],
    seo: mapSeo(row.seo),
    note: row.note || "",
    badge: row.badge || "",
    icon: row.icon || "",
    marketPrice: num(row.market_price),
    nowPrice: num(row.now_price), // the WHOLESALE price (quantity at or above the MOQ)
    retailPrice: num(row.retail_price) > 0 ? num(row.retail_price) : null, // below the MOQ; null = same as wholesale
    moq: row.moq || 1,
    options, // [{ name, values: [{ value, priceDelta }] }]
    hasOptions: options.length > 0,
    optionsFromDelta: fromDelta, // lowest total price adjustment across the options
    priceVaries: varies, // true when choosing options changes the price
    category: row.category ? mapCategory(row.category) : null,
    featuredSections: row.featured_sections || [],
    images: row.images || [],
    videos: row.videos || [],
    complementSlugs: (row.complements || []).map((id) => slugById.get(id)).filter(Boolean),
  };
}

// Without the 0025 category tree (no parent_id / sort_order on categories yet).
const FLAT_CATEGORY_COLUMNS = COLUMNS.replace(
  "category:category_id(id,name,slug,sort_order,parent:parent_id(id,name,slug,sort_order))",
  "category:category_id(id,name,slug)"
);
// Same list without the 0016 columns, so a site deployed before the migration is run still shows its products.
const LEGACY_COLUMNS = FLAT_CATEGORY_COLUMNS.replace(" retail_price,", "").replace(" options,", "");

// SEO copy (0045): { title, meta, keyword, sections:[{heading,body}], specs:[{label,value}], faqs:[{q,a}], alt }.
// Read separately so the shop still builds before the migration is run.
const SEO_COLUMN = ", seo";

const isMissingColumn = (error) =>
  error.code === "42703" || error.code === "PGRST200" || /column .* does not exist|relationship/i.test(error.message || "");

async function readAllActive(columns = COLUMNS, withSeo = true) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(withSeo ? columns + SEO_COLUMN : columns)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (withSeo && isMissingColumn(error) && /seo/.test(error.message || "")) {
        console.warn("[ecommerce-products] No SEO copy yet (migration 0045_product_seo.sql). Showing plain descriptions.");
        return readAllActive(columns, false);
      }
      if (columns === COLUMNS && isMissingColumn(error)) {
        console.warn(
          "[ecommerce-products] Categories have no subcategories yet (migration 0025_category_tree.sql). Using flat categories."
        );
        return readAllActive(FLAT_CATEGORY_COLUMNS, withSeo);
      }
      if (columns === FLAT_CATEGORY_COLUMNS && isMissingColumn(error)) {
        console.warn(
          "[ecommerce-products] The products table is missing the columns added by migration 0016_pricing_variants.sql. " +
            "Showing products without retail prices or options until it is run."
        );
        return readAllActive(LEGACY_COLUMNS, withSeo);
      }
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function load() {
  let products;
  try {
    const data = await readAllActive();
    if (data.length === 0) throw new Error("No active products found.");
    const slugById = new Map(data.map((r) => [r.id, r.slug]));
    products = data.map((row) => mapRow(row, slugById));
  } catch (err) {
    // No invented products: an empty catalog is better than fake ones in front of customers.
    console.error(
      "[ecommerce-products] Couldn't load products, so the shop will be empty: " +
        (err?.message || err) +
        ". Check PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY and that the migrations in supabase/migrations/ have been run."
    );
    products = [];
  }

  // Layer in offer-adjusted pricing (effectivePrice / hasOffer / offerBadge / offerPct).
  // Any failure here just means "no offers": never blocks the catalog.
  const offers = await getActiveOffers();
  return applyOfferPricing(products, offers);
}

let cached;

export function getEcommerceProducts() {
  if (!import.meta.env.PROD) return load();
  cached ??= load();
  return cached;
}

/**
 * Price strings for product cards. A product whose options change the price shows "From Ksh X".
 *   strikePrice  the crossed-out price shown above the real one ("" when there is nothing to cross out)
 *   price        the price actually paid (offer-adjusted when an offer applies)
 *   saveText     "Save Ksh 500" (""  when there is no saving: the card then shows no save line)
 * The older keys (marketPrice / nowPrice / offerPrice) are kept for anything else that still reads them.
 */
export function cardPrices(product) {
  const prefix = product.priceVaries ? "From " : "";
  const fromDelta = product.optionsFromDelta || 0;
  const listNum = product.fromPrice ?? product.nowPrice;
  const actualNum = product.hasOffer ? (product.effectiveFromPrice ?? product.effectivePrice) : listNum;
  const marketNum = product.marketPrice > 0 ? product.marketPrice + fromDelta : 0;
  // what gets crossed out: the market price, or the pre-offer price when that is higher
  const strikeNum = Math.max(marketNum, product.hasOffer ? listNum : 0);
  const saveNum = strikeNum > actualNum ? strikeNum - actualNum : 0;
  return {
    marketPrice: formatKsh(marketNum),
    nowPrice: prefix + formatKsh(listNum),
    offerPrice: prefix + formatKsh(product.effectiveFromPrice ?? product.effectivePrice),
    strikePrice: saveNum > 0 ? formatKsh(strikeNum) : "",
    price: prefix + formatKsh(actualNum),
    saveText: saveNum > 0 ? `${product.priceVaries ? "Save up to" : "Save"} ${formatKsh(saveNum)}` : "",
  };
}

export async function getProductBySlug(slug) {
  const products = await getEcommerceProducts();
  return products.find((p) => p.slug === slug) || null;
}
