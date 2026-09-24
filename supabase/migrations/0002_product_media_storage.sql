-- 0002_product_media_storage.sql
-- Storage bucket for product images and demo videos, uploaded directly
-- from the admin panel in the browser.

insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

-- Public read (so storefront <img>/<video> tags work without auth).
drop policy if exists "product_media_public_read" on storage.objects;
create policy "product_media_public_read" on storage.objects
  for select using (bucket_id = 'product-media');

-- Anon write — same caveat as 0001: the admin panel has no server-side
-- auth, so uploads/deletes are only gated by the site's client-side
-- password, not by Supabase. Anyone with the anon key can write to this
-- bucket directly. Acceptable for now; revisit if this becomes a
-- public-facing concern.
drop policy if exists "product_media_anon_write" on storage.objects;
create policy "product_media_anon_write" on storage.objects
  for insert with check (bucket_id = 'product-media');

drop policy if exists "product_media_anon_update" on storage.objects;
create policy "product_media_anon_update" on storage.objects
  for update using (bucket_id = 'product-media');

drop policy if exists "product_media_anon_delete" on storage.objects;
create policy "product_media_anon_delete" on storage.objects
  for delete using (bucket_id = 'product-media');
