export function slugify(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

export const STATUS_OPTIONS = ["draft", "active", "archived"];

export const FEATURED_SECTION_OPTIONS = [
  { value: "top_selling", label: "Top Selling" },
  { value: "new_in", label: "New In" },
  { value: "kit_strip", label: "Kit Strip" },
];

export function emptyProduct() {
  return {
    id: null,
    sku: "",
    slug: "",
    name: "",
    description: "",
    features: [],
    note: "",
    badge: "",
    icon: "",
    category_id: "",
    complements: [],
    featured_sections: [],
    market_price: "",
    now_price: "",
    cost_price: "",
    moq: 1,
    stock_quantity: 0,
    low_stock_threshold: 5,
    images: [],
    videos: [],
    status: "draft",
  };
}

export function isLowStock(product) {
  return (
    Number(product.stock_quantity) <= Number(product.low_stock_threshold ?? 0)
  );
}
