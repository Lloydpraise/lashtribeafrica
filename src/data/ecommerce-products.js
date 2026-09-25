// Ecommerce product data — read from Supabase (the products table managed
// by the /admin panel) on each request so live admin edits appear without a
// manual rebuild. Falls back to a small static seed only if Supabase isn't
// configured yet or the products table isn't available.

import { supabase } from "../services/service.js";
import { getActiveOffers, applyOfferPricing } from "./offers.js";

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

const FALLBACK_PRODUCTS = [
  {
    id: "fallback-1",
    slug: "0-07-volume-fans-mixed-tray",
    name: "0.07 Volume Fans — Mixed Tray",
    marketPrice: 1800,
    nowPrice: 1150,
    note: "Save Ksh 3,250 on the tray!",
    badge: "MOQ 5",
    icon: '<path d="M10 60 Q35 40 60 55 Q80 68 95 45" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      "A soft, lightweight fan set designed for full-volume lash styling with a natural finish. Each tray is curated for quick restocks and smooth, repeatable application across a busy salon schedule.",
    features: [
      "Soft, flexible fan shape for full-volume looks",
      "Low-lint finish for cleaner application",
      "Batch-ready packaging for salon restocks",
    ],
    complementSlugs: ["pro-bond-adhesive-5ml", "mega-volume-fans-0-05"],
    category: { name: "Lash Fans", slug: "lash-fans" },
    featuredSections: ["top_selling"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
  {
    id: "fallback-2",
    slug: "pro-bond-adhesive-5ml",
    name: "Pro Bond Adhesive, 5ml",
    marketPrice: 2400,
    nowPrice: 1600,
    note: "Save Ksh 4,000 on the case!",
    badge: "New",
    icon: '<ellipse cx="50" cy="50" rx="30" ry="12" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      "A strong, flexible cement built for consistent hold and easy lash customization. It dries cleanly, keeps lashes looking soft, and works beautifully with our volume and classic collections.",
    features: [
      "Strong, long-wear hold with smooth finish",
      "Easy-to-control formula for premium retention",
      "Great pairing with volume fans and patch kits",
    ],
    complementSlugs: ["0-07-volume-fans-mixed-tray", "isolation-tweezers-curved"],
    category: { name: "Adhesives & Primers", slug: "adhesives-primers" },
    featuredSections: ["top_selling"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
  {
    id: "fallback-3",
    slug: "isolation-tweezers-curved",
    name: "Isolation Tweezers, Curved",
    marketPrice: 1200,
    nowPrice: 780,
    note: "Save Ksh 2,100 on the set!",
    badge: "Best Seller",
    icon: '<path d="M20 50 L80 50 M50 20 L50 80" stroke="black" stroke-width="1.5"/>',
    description:
      "Precision curved tweezers designed for isolation and clean lash placement. The slim, ergonomic grip makes every application smoother and more controlled, especially on delicate fan sets.",
    features: [
      "Precision tip for clean isolation work",
      "Comfort grip for longer sessions",
      "Ideal for premium retail and treatment rooms",
    ],
    complementSlugs: ["pro-bond-adhesive-5ml", "low-fume-primer-10ml"],
    category: { name: "Tools", slug: "tools" },
    featuredSections: ["top_selling"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
  {
    id: "fallback-4",
    slug: "under-eye-gel-patches-bulk",
    name: "Under-Eye Gel Patches, Bulk",
    marketPrice: 900,
    nowPrice: 560,
    note: "Save Ksh 1,700 on the pack!",
    badge: "Bulk",
    icon: '<rect x="25" y="25" width="50" height="50" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      "Cooling, skin-safe patches that prep the under-eye area before treatment. Perfect for comfort-focused service add-ons and easy self-care retail upsells.",
    features: [
      "Cooling effect for a more comfortable service",
      "Low-irritation fit with soft texture",
      "Perfect add-on for retail and treatment bundles",
    ],
    complementSlugs: ["mega-volume-fans-0-05", "low-fume-primer-10ml"],
    category: { name: "Aftercare", slug: "aftercare" },
    featuredSections: ["top_selling"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
  {
    id: "fallback-5",
    slug: "mega-volume-fans-0-05",
    name: "Mega Volume Fans — 0.05",
    marketPrice: 2000,
    nowPrice: 1300,
    note: "Just landed this batch",
    badge: "New In",
    icon: '<path d="M15 55 Q50 30 85 55" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      "The lighter, fluffier alternative for dramatic volume without excessive weight. These fans are ideal for stylists who want soft dimension and a glossy finish at the same time.",
    features: [
      "Ultra-light fan texture for soft volume",
      "Clean finish to support premium lash artistry",
      "Ideal for salon teams stocking a premium range",
    ],
    complementSlugs: ["0-07-volume-fans-mixed-tray", "pro-bond-adhesive-5ml"],
    category: { name: "Lash Fans", slug: "lash-fans" },
    featuredSections: ["new_in"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
  {
    id: "fallback-6",
    slug: "low-fume-primer-10ml",
    name: "Low-Fume Primer, 10ml",
    marketPrice: 1600,
    nowPrice: 990,
    note: "Just landed this batch",
    badge: "New In",
    icon: '<circle cx="50" cy="50" r="28" stroke="black" stroke-width="1.5" fill="none"/>',
    description:
      "A low-fume prep layer that helps create a smoother application and improved bond feel. Designed for clients who prefer a cleaner, more comfortable service experience.",
    features: [
      "Low-fume formula for a more comfortable room",
      "Helps prep for cleaner, more even application",
      "Works well with premium volume and classic sets",
    ],
    complementSlugs: ["isolation-tweezers-curved", "under-eye-gel-patches-bulk"],
    category: { name: "Adhesives & Primers", slug: "adhesives-primers" },
    featuredSections: ["new_in"],
    moq: 5,
    stockQuantity: 50,
    images: [],
    videos: [],
  },
];

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
    console.warn(
      "[ecommerce-products] Falling back to static seed data — " +
        (err?.message || err) +
        ". Run the migrations in supabase/migrations/ and check your .env to load real products."
    );
    products = FALLBACK_PRODUCTS;
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
