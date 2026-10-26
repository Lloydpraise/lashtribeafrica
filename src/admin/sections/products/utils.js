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
    supplier_id: "",
    complements: [],
    featured_sections: [],
    market_price: "",
    now_price: "", // WHOLESALE price (quantity at or above the MOQ)
    retail_price: "", // below the MOQ; blank = same as wholesale
    options: [],
    price_mode: "manual",
    cost_kes: "",
    cost_usd: "",
    moq: 1,
    weight_kg: "", // estimated kg; shipping = weight x rate per kg
    stock_quantity: 0,
    low_stock_threshold: 5,
    images: [],
    videos: [],
    status: "active",
  };
}

export function isLowStock(product) {
  return (
    Number(product.stock_quantity) <= Number(product.low_stock_threshold ?? 0)
  );
}

export const STATUS_LABELS = { active: "Published", draft: "Draft", archived: "Archived" };

// ---------------------------------------------------------------------
// Category tree (migration 0025 adds categories.parent_id + sort_order). Without it every category is a
// main category, so all of this still works on an older database.
// ---------------------------------------------------------------------
const byCategoryOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

/** [{ ...main, children: [sub, ...] }] sorted by sort_order, then name. A sub whose parent is missing is shown as a main. */
export function categoryTree(categories = []) {
  const ids = new Set(categories.map((c) => c.id));
  const mains = categories.filter((c) => !c.parent_id || !ids.has(c.parent_id)).sort(byCategoryOrder);
  return mains.map((m) => ({ ...m, children: categories.filter((c) => c.parent_id === m.id).sort(byCategoryOrder) }));
}

/** "Adhesives & Primers › Fast-Drying Glue" for a category id ("" when none). */
export function categoryPath(id, categories = []) {
  const c = categories.find((x) => x.id === id);
  if (!c) return "";
  const parent = c.parent_id ? categories.find((x) => x.id === c.parent_id) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

/** The category and its subcategories, for filtering by a main category. */
export function categoryWithChildren(id, categories = []) {
  return new Set([id, ...categories.filter((c) => c.parent_id === id).map((c) => c.id)]);
}

/** <option>s for a category <select>: each main category followed by its indented subcategories. */
export function categoryOptions(categories = []) {
  return categoryTree(categories).flatMap((m) => [
    { id: m.id, label: m.name, isMain: true },
    ...m.children.map((c) => ({ id: c.id, label: `   └ ${c.name}`, isMain: false })),
  ]);
}
