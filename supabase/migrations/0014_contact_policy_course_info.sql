-- 0014_contact_policy_course_info.sql
-- 1. Contact + social links (Site Settings)   2. Shipping & Preorders policy text
-- 3. Course info page fields (duration, sales description, "what you'll learn")
--
-- Run AFTER 0013. Safe to re-run.
--
-- Contact: info@lashtribeafrica.com is preset. The phone and WhatsApp numbers start empty
-- (add them in Admin -> Site Settings -> Contact & social; empty ones are simply not shown).
-- The four social links start as the lashesbyshazzacademy account on each platform and are
-- editable there too.
--
-- Policy: policy_shipping is filled with the default text ONLY if it is blank, so anything
-- you already wrote is kept. The same text lives in src/data/default-policies.js.
--
-- Courses: duration_label (free text, default "2 weeks"), about (the longer sales description
-- shown on the course info page; the short description stays on the cards) and learn_points
-- (the bullet list "What you'll learn"). admin_save_course() is replaced to save them.

-- ---------------------------------------------------------------------
-- 1. contact + social
-- ---------------------------------------------------------------------
alter table public.site_settings add column if not exists contact_email text not null default 'info@lashtribeafrica.com';
alter table public.site_settings add column if not exists contact_phone text not null default '';
alter table public.site_settings add column if not exists contact_whatsapp text not null default '';
alter table public.site_settings add column if not exists social_instagram text not null default 'https://www.instagram.com/lashesbyshazzacademy';
alter table public.site_settings add column if not exists social_tiktok text not null default 'https://www.tiktok.com/@lashesbyshazzacademy';
alter table public.site_settings add column if not exists social_facebook text not null default 'https://www.facebook.com/lashesbyshazzacademy';
alter table public.site_settings add column if not exists social_youtube text not null default 'https://www.youtube.com/@lashesbyshazzacademy';

-- ---------------------------------------------------------------------
-- 2. shipping & preorders policy (only if blank)
-- ---------------------------------------------------------------------
update public.site_settings
   set policy_shipping = $policy$# How we ship
Lashtribe Africa is a preorder wholesale platform. We don't keep stock here: every product is ordered from our suppliers for you, and orders are grouped into shipping batches so you get wholesale prices.

# Shipping batches
Our suppliers ship twice a month, around the middle and the end of the month. The date of the next batch is shown on the homepage, at checkout and on your order confirmation.

Every order joins the first open batch that is more than 7 days away. If the next batch is 7 days away or less, it is already closed to new orders and yours goes into the batch after it. For example, an order placed 4 days before a batch ships with the following batch, about two weeks later.

# Payment
You pay when you place your order. After you order, we contact you straight away to confirm payment by M-Pesa or card. Your order is secured in its batch once payment is confirmed.

# Shipping fees and delivery
- The product total at checkout does not include shipping.
- The shipping fee is confirmed with you directly, based on your delivery area.
- When a free-shipping offer is active, it is applied automatically once your order meets the minimum.
- When your batch arrives, we contact you to arrange delivery.

# Changing or cancelling an order
Contact us as soon as you can if you need to change or cancel an order. Orders can be changed or cancelled until their batch has been placed with our suppliers. After that the products are already ordered and the order can't be changed.

# Questions
Reach us on the Contact page and we'll help.$policy$
 where coalesce(btrim(policy_shipping), '') = '';

-- ---------------------------------------------------------------------
-- 3. course info page fields
-- ---------------------------------------------------------------------
alter table public.courses add column if not exists duration_label text not null default '2 weeks';
alter table public.courses add column if not exists about text;
alter table public.courses add column if not exists learn_points text[] not null default '{}';

create or replace function public.admin_save_course(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  c jsonb := p -> 'course';
  cid uuid := (c ->> 'id')::uuid;
  m jsonb;
  l jsonb;
  mid uuid;
  lid uuid;
  mi integer := 0;
  li integer := 0;
  keep_modules uuid[] := '{}';
  keep_lessons uuid[] := '{}';
  free boolean := coalesce((c ->> 'is_free')::boolean, true);
begin
  insert into public.courses (
    id, slug, title, subtitle, description, level, course_type, is_free, price, compare_price,
    cover_url, hero_path, sequential, certificate_enabled, bonus_points, status, sort_order,
    duration_label, about, learn_points
  ) values (
    cid, c ->> 'slug', c ->> 'title', nullif(c ->> 'subtitle', ''), nullif(c ->> 'description', ''),
    coalesce(c ->> 'level', 'beginner'), coalesce(c ->> 'course_type', 'story'),
    free, case when free then 0 else coalesce((c ->> 'price')::numeric, 0) end,
    case when free then null else nullif(c ->> 'compare_price', '')::numeric end,
    nullif(c ->> 'cover_url', ''), nullif(c ->> 'hero_path', ''),
    coalesce((c ->> 'sequential')::boolean, false),
    coalesce((c ->> 'certificate_enabled')::boolean, true),
    coalesce((c ->> 'bonus_points')::integer, 0),
    coalesce(c ->> 'status', 'draft'), coalesce((c ->> 'sort_order')::integer, 0),
    coalesce(nullif(btrim(c ->> 'duration_label'), ''), '2 weeks'),
    nullif(btrim(coalesce(c ->> 'about', '')), ''),
    case when jsonb_typeof(c -> 'learn_points') = 'array'
         then array(select btrim(x) from jsonb_array_elements_text(c -> 'learn_points') x where btrim(x) <> '')
         else '{}'::text[] end
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle,
    description = excluded.description, level = excluded.level, course_type = excluded.course_type,
    is_free = excluded.is_free, price = excluded.price, compare_price = excluded.compare_price,
    cover_url = excluded.cover_url, hero_path = excluded.hero_path, sequential = excluded.sequential,
    certificate_enabled = excluded.certificate_enabled, bonus_points = excluded.bonus_points,
    status = excluded.status, sort_order = excluded.sort_order,
    duration_label = excluded.duration_label, about = excluded.about, learn_points = excluded.learn_points;

  for m in select * from jsonb_array_elements(coalesce(p -> 'modules', '[]'::jsonb)) loop
    mid := (m ->> 'id')::uuid;
    keep_modules := keep_modules || mid;
    insert into public.course_modules (id, course_id, title, sort_order)
    values (mid, cid, coalesce(nullif(m ->> 'title', ''), 'Untitled module'), mi)
    on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, sort_order = excluded.sort_order;
    mi := mi + 1;

    for l in select * from jsonb_array_elements(coalesce(m -> 'lessons', '[]'::jsonb)) loop
      li := li + 1;
      lid := (l ->> 'id')::uuid;
      keep_lessons := keep_lessons || lid;

      insert into public.lessons (
        id, course_id, module_id, title, kind, summary, duration_seconds, read_minutes, is_preview, sort_order, status
      ) values (
        lid, cid, mid, coalesce(nullif(l ->> 'title', ''), 'Untitled lesson'),
        coalesce(l ->> 'kind', 'reading'), nullif(l ->> 'summary', ''),
        coalesce((l ->> 'duration_seconds')::integer, 0), coalesce((l ->> 'read_minutes')::integer, 0),
        coalesce((l ->> 'is_preview')::boolean, false), li, coalesce(l ->> 'status', 'published')
      )
      on conflict (id) do update set
        course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title,
        kind = excluded.kind, summary = excluded.summary, duration_seconds = excluded.duration_seconds,
        read_minutes = excluded.read_minutes, is_preview = excluded.is_preview,
        sort_order = excluded.sort_order, status = excluded.status;

      insert into public.lesson_content (lesson_id, video, blocks)
      values (
        lid,
        case when l -> 'video' is null or jsonb_typeof(l -> 'video') = 'null' then null else l -> 'video' end,
        coalesce(l -> 'blocks', '[]'::jsonb)
      )
      on conflict (lesson_id) do update set video = excluded.video, blocks = excluded.blocks;
    end loop;
  end loop;

  delete from public.lessons where course_id = cid and not (id = any (keep_lessons));
  delete from public.course_modules where course_id = cid and not (id = any (keep_modules));

  return cid;
end;
$$;

revoke all on function public.admin_save_course(jsonb) from public;
grant execute on function public.admin_save_course(jsonb) to anon, authenticated;
