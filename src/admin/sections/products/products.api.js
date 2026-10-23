import { supabase } from "../../../services/service.js";

const PRODUCT_SELECT = "*, category:category_id(id,name,slug), supplier:supplier_id(id,name)";

// ---------------------------------------------------------------------
// Costs are private (table product_costs, admin only, migration 0016). They are merged onto each
// product as cost_kes / cost_usd so the form can show them; a site without 0016 just has no costs.
// ---------------------------------------------------------------------
async function fetchCosts() {
  const costs = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("product_costs")
      .select("product_id, cost_kes, cost_usd")
      .range(from, from + 999);
    if (error) return costs;
    (data || []).forEach((c) => costs.set(c.product_id, c));
    if (!data || data.length < 1000) break;
  }
  return costs;
}

const withCost = (row, cost) => ({
  ...row,
  cost_kes: cost?.cost_kes ?? null,
  cost_usd: cost?.cost_usd ?? null,
});

async function saveCosts(productId, costs) {
  if (!costs) return costs;
  const kes = costs.cost_kes === "" || costs.cost_kes == null ? null : Number(costs.cost_kes);
  const usd = costs.cost_usd === "" || costs.cost_usd == null ? null : Number(costs.cost_usd);
  if (kes === null && usd === null) {
    const { error } = await supabase.from("product_costs").delete().eq("product_id", productId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("product_costs")
      .upsert({ product_id: productId, cost_kes: kes, cost_usd: usd }, { onConflict: "product_id" });
    if (error) throw error;
  }
  return { cost_kes: kes, cost_usd: usd };
}

export async function fetchProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const costs = await fetchCosts();
  return rows.map((r) => withCost(r, costs.get(r.id)));
}

// ---------------------------------------------------------------------
// Pricing formula (Site Settings). One row, admin only.
// ---------------------------------------------------------------------
export async function fetchPricingSettings() {
  const { data, error } = await supabase.from("pricing_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePricingSettings(payload) {
  const { data, error } = await supabase
    .from("pricing_settings")
    .upsert({ id: 1, ...payload }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Re-applies the formula to every product set to "formula" that has a USD cost. Returns how many changed. */
export async function repriceFormulaProducts() {
  const { data, error } = await supabase.rpc("admin_reprice_formula_products");
  if (error) throw error;
  return Number(data) || 0;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Adds a category; pass parentId to make it a subcategory. A clashing slug gets -2, -3 ... */
export async function createCategory(name, parentId = null, sortOrder = null) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  for (let n = 1; ; n += 1) {
    const row = { name, slug: n === 1 ? base : `${base}-${n}` };
    if (parentId) row.parent_id = parentId; // only sent when used, so a database without 0025 still works
    if (sortOrder != null) row.sort_order = sortOrder;
    const { data, error } = await supabase.from("categories").insert(row).select().single();
    if (!error) return data;
    if (error.code !== "23505" || n > 20) throw error;
  }
}

export async function updateCategory(id, patch) {
  const { data, error } = await supabase.from("categories").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Deletes a category. Its products become uncategorised and its subcategories become main categories. */
export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/** Sets the same columns (e.g. { status: "active" } or { category_id }) on many products at once. */
export async function bulkUpdateProducts(productIds, patch) {
  if (!productIds.length) return;
  for (let i = 0; i < productIds.length; i += 200) {
    const { error } = await supabase.from("products").update(patch).in("id", productIds.slice(i, i + 200));
    if (error) throw error;
  }
}

// payload = product columns; costs = { cost_kes, cost_usd } (kept in the private product_costs table).
export async function createProduct(payload, costs) {
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return withCost(data, await saveCosts(data.id, costs));
}

export async function updateProduct(id, payload, costs) {
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return withCost(data, await saveCosts(id, costs));
}

/** Sets one supplier on many products at once (used to fill in products created before suppliers existed). */
export async function assignSupplier(supplierId, productIds) {
  if (!productIds.length) return;
  const { error } = await supabase.from("products").update({ supplier_id: supplierId }).in("id", productIds);
  if (error) throw error;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Media (Supabase Storage — bucket created by 0002_product_media_storage.sql)
// ---------------------------------------------------------------------

const BUCKET = "product-media";

export async function uploadProductMedia(file, folder) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteProductMedia(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
