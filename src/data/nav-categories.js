import { getEcommerceProducts } from "./ecommerce-products.js";

const slugify = (value = "") =>
  String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Main categories with their subcategories, for the header's Categories menu. Only categories that have at least
 * one published product are listed. The ids are the same ones /shop uses as anchors, so a link is /shop#<id>.
 * Returns [{ id, name, count, image, subs: [{ id, name, count }] }]; image is the first product photo in the category. in the order set in admin (migration 0025 adds sort_order).
 */
export async function getNavCategories() {
  let products = [];
  try {
    products = await getEcommerceProducts();
  } catch {
    return [];
  }
  const groups = new Map();
  for (const product of products) {
    const cat = product.category;
    if (!cat) continue;
    const main = cat.parent || cat;
    const mainId = main.slug || slugify(main.name);
    let group = groups.get(mainId);
    if (!group) {
      group = { id: mainId, name: main.name, order: main.sortOrder ?? 0, count: 0, image: "", subs: new Map() };
      groups.set(mainId, group);
    }
    group.count += 1;
    if (!group.image && product.images?.[0]?.url) group.image = product.images[0].url;
    if (cat.parent) {
      const subId = cat.slug || slugify(cat.name);
      if (!group.subs.has(subId)) group.subs.set(subId, { id: subId, name: cat.name, order: cat.sortOrder ?? 0, count: 0 });
      group.subs.get(subId).count += 1;
    }
  }
  const byOrder = (a, b) => a.order - b.order || a.name.localeCompare(b.name);
  return [...groups.values()].sort(byOrder).map((g) => ({
    id: g.id,
    name: g.name,
    count: g.count,
    image: g.image,
    subs: [...g.subs.values()].sort(byOrder).map(({ id, name, count }) => ({ id, name, count })),
  }));
}
