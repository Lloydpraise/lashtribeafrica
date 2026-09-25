import { supabase } from "../../../services/service.js";

const SETTINGS_ID = true;

export async function fetchSiteSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveSiteSettings(payload) {
  const { data, error } = await supabase
    .from("site_settings")
    .update(payload)
    .eq("id", SETTINGS_ID)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Media (reuses the same public "product-media" bucket/policy created
// by 0002_product_media_storage.sql, under a site-settings/ folder)
// ---------------------------------------------------------------------
const BUCKET = "product-media";

export async function uploadSiteMedia(file, folder = "site-settings") {
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

export async function deleteSiteMedia(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
