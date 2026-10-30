// Sends queued emails from email_outbox through Brevo. Nothing here runs on a timer: the database pings it the
// moment a message is due (and once an hour only if something delayed is waiting). Deploy with --no-verify-jwt;
// the shared secret below is the lock.
//
//   supabase secrets set COMMS_SECRET=<same value as comms_settings.webhook_secret> BREVO_API_KEY=<brevo api key>
//   supabase functions deploy send-emails --no-verify-jwt
//
// Request body (JSON): { ids: ["<outbox id>", ...] }  send exactly these, if they are due
//                      { drain: true }                send whatever is due, most important first
import { json } from "../_shared/http.ts";
import { adminClient } from "../_shared/settle.ts";
// @ts-ignore plain JS shared with the admin preview
import { fill, fmtDate, renderEmail, sampleContext } from "../_shared/email-render.js";

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;
const BATCH = 40;          // messages per run; a full run chains another so a big campaign drains without a timer
const MAX_ATTEMPTS = 3;

const nairobiHour = (d = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Nairobi" }).format(d)) % 24;
const nairobiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());   // YYYY-MM-DD
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// the next time the Nairobi clock reads `hour`:00 (Nairobi is UTC+3 all year)
function nextNairobiHour(hour: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour - 3, 0, 0));
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
const sameSecret = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
const first = (name?: string | null) => String(name || "").trim().split(/\s+/)[0] || "";

class Skip extends Error {}   // a message we decide not to send, with the reason

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = Deno.env.get("COMMS_SECRET") || "";
  if (!secret || !sameSecret(req.headers.get("x-comms-secret") || "", secret)) return json({ error: "unauthorised" }, 401);

  let body: Row = {};
  try { body = await req.json(); } catch { /* an empty body means drain */ }

  const db = adminClient();
  const { data: s } = await db.from("comms_settings").select("*").eq("id", true).maybeSingle();
  if (!s || !s.enabled) return json({ ok: true, note: "sending is switched off" });
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoKey) return json({ error: "BREVO_API_KEY is not set" }, 500);

  // 1. pick what is due, then claim it so two overlapping runs never send the same message
  const nowIso = new Date().toISOString();
  let pick = db.from("email_outbox").select("id").eq("status", "queued").lte("send_after", nowIso);
  pick = Array.isArray(body.ids) && body.ids.length
    ? pick.in("id", body.ids.slice(0, 100))
    : pick.order("priority").order("send_after").limit(BATCH);
  const { data: ids } = await pick;
  if (!ids?.length) return json({ ok: true, sent: 0 });
  const { data: claimed, error: claimErr } = await db.from("email_outbox")
    .update({ status: "sending" }).in("id", ids.map((r: Row) => r.id)).eq("status", "queued").select("*");
  if (claimErr) return json({ error: claimErr.message }, 500);
  const rows: Row[] = (claimed || []).sort((a: Row, b: Row) => a.priority - b.priority || a.send_after.localeCompare(b.send_after));

  // 2. today's allowance (Brevo free plan = 300 a day); the rest go back to the queue for tomorrow
  const dayStart = new Date(`${nairobiToday()}T00:00:00+03:00`).toISOString();
  const { count: sentToday } = await db.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", dayStart);
  let room = Math.max(0, s.daily_limit - (sentToday || 0));

  const cache = new Map<string, Row | null>();
  const getTemplate = async (key: string) => {
    if (!cache.has(key)) cache.set(key, (await db.from("email_templates").select("*").eq("key", key).maybeSingle()).data);
    return cache.get(key) || null;
  };

  const stats = { sent: 0, skipped: 0, failed: 0, deferred: 0 };
  for (const row of rows) {
    const isTest = row.vars?.test === true;
    const finish = (patch: Row) => db.from("email_outbox").update(patch).eq("id", row.id);
    try {
      if (room <= 0) { await finish({ status: "queued" }); stats.deferred++; continue; }

      const tpl = await getTemplate(row.template_key);
      if (!tpl || (!tpl.enabled && !isTest)) throw new Skip("template is off");
      if (!isTest && Array.isArray(s.only_to) && s.only_to.length && !s.only_to.map((e: string) => e.toLowerCase()).includes(row.to_email)) {
        throw new Skip("test mode: this address is not on the allow list");
      }

      // consent, checked again at the moment of sending
      let customer: Row | null = null;
      if (row.customer_id) customer = (await db.from("customers").select("id, full_name, email, marketing_opt_in, email_opt_out, unsub_token").eq("id", row.customer_id).maybeSingle()).data;
      if (!customer) customer = (await db.from("customers").select("id, full_name, email, marketing_opt_in, email_opt_out, unsub_token").ilike("email", row.to_email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle()).data;
      if (!isTest) {
        if (tpl.kind === "marketing" && !(customer?.marketing_opt_in && !customer?.email_opt_out)) throw new Skip("no marketing consent");
        if (tpl.kind === "nudge" && customer?.email_opt_out) throw new Skip("unsubscribed");
        if ((tpl.kind !== "service" || tpl.respect_quiet) && inQuietHours(s)) {
          await finish({ status: "queued", send_after: nextNairobiHour(s.quiet_to) });
          stats.deferred++;
          continue;
        }
      }

      const ctx = isTest ? sampleFor(row, tpl, s) : await buildContext(db, row, tpl, s, customer);
      const camp = row.campaign_id ? (await db.from("email_campaigns").select("*").eq("id", row.campaign_id).maybeSingle()).data : null;

      const siteUrl = String(s.site_url).replace(/\/$/, "");
      const base = String(s.function_url || "").replace(/\/send-emails\/?$/, "");
      const token = customer?.unsub_token;
      const wantsUnsub = tpl.kind !== "service" && token;
      const unsubscribeUrl = wantsUnsub ? `${siteUrl}/unsubscribe?t=${token}` : "";
      const oneClick = wantsUnsub && base ? `${base}/email-unsubscribe?t=${token}` : "";

      ctx.data.first_name = isTest ? ctx.data.first_name : first(row.to_name || customer?.full_name) || "there";
      ctx.data.site_url = siteUrl;
      if (camp) { ctx.data.campaign_subject = camp.subject; ctx.data.campaign_body = camp.body; }

      const email = renderEmail({
        subject: camp ? camp.subject : tpl.subject,
        preheader: camp ? camp.preheader : tpl.preheader,
        body: camp ? camp.body : tpl.body,
        ctaLabel: camp ? camp.cta_label : tpl.cta_label,
        ctaUrl: camp ? camp.cta_url : tpl.cta_url,
        blocks: camp ? camp.blocks : tpl.blocks,
        data: ctx.data, order: ctx.order, cart: ctx.cart, offer: ctx.offer,
        siteUrl, unsubscribeUrl,
        supportEmail: s.reply_to || s.sender_email,
        footerNote: tpl.kind === "service"
          ? "You are getting this because of your Lashtribe Africa account, order or course."
          : "You are getting this because you opted in to emails from Lashtribe Africa.",
      });

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: s.sender_name, email: s.sender_email },
          to: [{ email: row.to_email, ...(row.to_name ? { name: row.to_name } : {}) }],
          ...(s.reply_to ? { replyTo: { email: s.reply_to } } : {}),
          subject: isTest ? `[TEST] ${email.subject}` : email.subject,
          htmlContent: email.html,
          textContent: email.text,
          tags: [row.template_key],
          ...(oneClick ? { headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        await finish({ status: "sent", sent_at: new Date().toISOString(), provider_id: out.messageId || null, reason: null, attempts: row.attempts + 1 });
        stats.sent++; room--;
      } else {
        const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
        const attempts = row.attempts + 1;
        const reason = `Brevo ${res.status}: ${out.message || out.code || "error"}`.slice(0, 300);
        if (permanent || attempts >= MAX_ATTEMPTS) { await finish({ status: "failed", reason, attempts }); stats.failed++; }
        else { await finish({ status: "queued", reason, attempts, send_after: new Date(Date.now() + attempts * 10 * 60_000).toISOString() }); stats.deferred++; }
      }
    } catch (err) {
      if (err instanceof Skip) { await finish({ status: "skipped", reason: err.message }); stats.skipped++; }
      else {
        console.error("send-emails:", row.id, err);
        const attempts = row.attempts + 1;
        await finish(attempts >= MAX_ATTEMPTS
          ? { status: "failed", reason: String((err as Error).message || err).slice(0, 300), attempts }
          : { status: "queued", reason: String((err as Error).message || err).slice(0, 300), attempts, send_after: new Date(Date.now() + attempts * 10 * 60_000).toISOString() });
        stats.failed++;
      }
    }
  }

  // a full run means there may be more waiting: chain one more (this is how a campaign drains, no timer involved)
  if (rows.length >= BATCH && room > 0 && s.function_url) {
    const again = fetch(s.function_url, { method: "POST", headers: { "content-type": "application/json", "x-comms-secret": secret }, body: JSON.stringify({ drain: true }) }).catch(() => {});
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(again);
  }
  return json({ ok: true, ...stats });
});

function inQuietHours(s: Row): boolean {
  const h = nairobiHour();
  return s.quiet_from > s.quiet_to ? h >= s.quiet_from || h < s.quiet_to : h >= s.quiet_from && h < s.quiet_to;
}

// "Send test" shows example data, never a real person's order
function sampleFor(row: Row, tpl: Row, s: Row) {
  const sample = sampleContext(s.site_url);
  void tpl;
  void row;
  return sample;
}

/** Loads what a message is about (order, cart, course, offer) and decides whether it is still worth sending. */
// deno-lint-ignore no-explicit-any
async function buildContext(db: any, row: Row, tpl: Row, s: Row, customer: Row | null) {
  const siteUrl = String(s.site_url).replace(/\/$/, "");
  const key: string = tpl.key;
  const v = row.vars || {};
  const ctx: Row = { data: { first_name: "" }, order: null, cart: null, offer: null };

  // ---- orders, shipping
  if (v.order_id) {
    const { data: o } = await db.from("orders")
      .select("id, order_no, status, kind, subtotal, discount, shipping_fee, total, batch_id, order_items(name, quantity, line_total, selected_options)")
      .eq("id", v.order_id).maybeSingle();
    if (!o) throw new Skip("order not found");
    let ship = "";
    if (o.batch_id) ship = (await db.from("batches").select("ship_date, status").eq("id", o.batch_id).maybeSingle()).data?.ship_date || "";
    const batchStatus = o.batch_id ? (await db.from("batches").select("status").eq("id", o.batch_id).maybeSingle()).data?.status : null;

    if ((key === "order_unpaid_1" || key === "order_unpaid_2") && o.status !== "pending") throw new Skip(`order is ${o.status}`);
    if (key === "order_uncollected" && o.status !== "paid") throw new Skip(`order is ${o.status}`);
    if (key === "review_request" && ["cancelled", "refunded"].includes(o.status)) throw new Skip(`order is ${o.status}`);
    if (key === "shipping_soon" && (o.status !== "paid" || !["open", "closed", "ordered"].includes(batchStatus || ""))) throw new Skip("no longer shipping soon");
    if (["batch_shipped", "batch_arrived", "order_paid"].includes(key) && ["cancelled", "refunded"].includes(o.status)) throw new Skip(`order is ${o.status}`);

    ctx.order = {
      order_no: o.order_no, ship_date: ship || null, discount: o.discount, shipping_fee: o.shipping_fee, total: o.total,
      items: (o.order_items || []).map((i: Row) => ({ name: i.name, qty: i.quantity, total: i.line_total, options: i.selected_options })),
    };
    Object.assign(ctx.data, {
      order_no: o.order_no, order_status: o.status, ship_date: ship ? fmtDate(ship) : "to be confirmed",
      order_total: o.total,
    });

    // the one-time review link; nothing to send if they already reviewed this order
    if (key === "review_request") {
      const { data: rr } = await db.from("review_requests").select("token, used_at").eq("order_id", o.id).maybeSingle();
      if (!rr) throw new Skip("no review link for this order");
      if (rr.used_at) throw new Skip("already reviewed");
      ctx.data.review_url = `${siteUrl}/review?t=${rr.token}`;
    }
    return ctx;
  }

  // ---- saved cart
  if (v.cart_id) {
    const { data: cart } = await db.from("saved_carts").select("id, customer_id, items, updated_at, stage").eq("id", v.cart_id).maybeSingle();
    if (!cart) throw new Skip("cart is gone");
    const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", cart.customer_id).gt("placed_at", cart.updated_at);
    if (count) throw new Skip("they ordered after leaving the cart");
    const lines = Object.entries(cart.items || {}).map(([k, qty]) => {
      const at = k.indexOf("|");
      const options: Record<string, string> = {};
      if (at !== -1) for (const pair of k.slice(at + 1).split("&")) {
        const eq = pair.indexOf("=");
        if (eq > 0) { try { options[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1)); } catch { /* skip */ } }
      }
      return { id: at === -1 ? k : k.slice(0, at), options, qty: Number(qty) };
    });
    const { data: products } = await db.from("products").select("id, name, slug, status, images").in("id", lines.map((l) => l.id));
    const byId = new Map((products || []).map((p: Row) => [p.id, p]));
    const items = lines.filter((l) => byId.get(l.id)?.status === "active").map((l) => {
      const p = byId.get(l.id) as Row;
      const img = Array.isArray(p.images) && p.images[0]?.url ? String(p.images[0].url) : "";
      return { name: p.name, options: l.options, qty: l.qty, url: `${siteUrl}/ecommerce/product/${p.slug}`, image: img };
    });
    if (!items.length) throw new Skip("nothing in the cart is on sale any more");
    ctx.cart = { items };

    // the next shipment they can still make, so the reminder carries a real deadline
    const { data: cutoffRow } = await db.from("site_settings").select("batch_cutoff_days").limit(1).maybeSingle();
    const cutoff = cutoffRow?.batch_cutoff_days ?? 7;
    const today = nairobiToday();
    const { data: batches } = await db.from("batches").select("ship_date").eq("status", "open").gte("ship_date", today).order("ship_date");
    const next = (batches || []).find((b: Row) => (new Date(`${b.ship_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000 > cutoff);
    Object.assign(ctx.data, {
      next_ship_date: next ? fmtDate(next.ship_date) : "our next shipment",
      order_by_date: next ? fmtDate(addDays(next.ship_date, -cutoff - 1)) : "soon",
    });
    return ctx;
  }

  // ---- courses and certificates
  if (v.course_id) {
    const { data: course } = await db.from("courses").select("id, title, slug").eq("id", v.course_id).maybeSingle();
    if (!course) throw new Skip("course not found");
    Object.assign(ctx.data, { course_title: course.title, course_url: `${siteUrl}/academy/learn/?course=${course.slug}` });
    if (v.certificate_id) {
      const { data: cert } = await db.from("course_certificates").select("certificate_no, verify_code, holder_name").eq("id", v.certificate_id).maybeSingle();
      if (!cert) throw new Skip("certificate not found");
      Object.assign(ctx.data, { certificate_no: cert.certificate_no, verify_code: cert.verify_code });
    }
    if (key === "course_not_started" || key === "course_stalled") {
      const uid = v.user_id;
      const { data: prog } = await db.from("lesson_progress").select("updated_at").eq("user_id", uid).eq("course_id", course.id).order("updated_at", { ascending: false }).limit(1);
      const { count: certs } = await db.from("course_certificates").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("course_id", course.id);
      if (certs) throw new Skip("already finished");
      if (key === "course_not_started" && prog?.length) throw new Skip("they already started");
      if (key === "course_stalled" && prog?.length && Date.now() - new Date(prog[0].updated_at).getTime() < 6 * 86400000) throw new Skip("still active");
    }
    return ctx;
  }

  // ---- offers
  if (v.offer_id) {
    const { data: f } = await db.from("offers").select("label, badge_text, banner_text, ends_at, is_active").eq("id", v.offer_id).maybeSingle();
    if (!f || !f.is_active || (f.ends_at && new Date(f.ends_at).getTime() < Date.now())) throw new Skip("offer is over");
    const ends = f.ends_at ? fmtDate(f.ends_at) : "";
    ctx.offer = { title: f.badge_text || f.label, text: f.banner_text || "", ends };
    Object.assign(ctx.data, { offer_title: f.badge_text || f.label, offer_ends: ends ? `on ${ends}` : "soon" });
    return ctx;
  }

  // ---- campaigns can carry an offer block
  if (row.campaign_id) {
    const { data: c } = await db.from("email_campaigns").select("offer_id, blocks").eq("id", row.campaign_id).maybeSingle();
    if (c?.offer_id) {
      const { data: f } = await db.from("offers").select("label, badge_text, banner_text, ends_at").eq("id", c.offer_id).maybeSingle();
      if (f) {
        const ends = f.ends_at ? fmtDate(f.ends_at) : "";
        ctx.offer = { title: f.badge_text || f.label, text: f.banner_text || "", ends };
      }
    }
  }
  void customer;
  void fill;
  return ctx;
}
