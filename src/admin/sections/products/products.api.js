import { supabase } from "../../../services/service.js";

const PRODUCT_SELECT = "*, category:category_id(id,name,slug)";

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return data;
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
