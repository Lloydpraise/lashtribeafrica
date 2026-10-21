// Starts a Pesapal payment for an order that has already been placed (status 'pending').
// The amount always comes from the order in the database, never from the browser.
//
// Request:  POST { order_id }
// Response: { enabled: true, redirect_url, order_no }   -> send the customer to redirect_url
//           { enabled: false }                          -> online payment is off for this order; use manual confirmation
import { corsHeaders, json } from "../_shared/http.ts";
import { ensureIpnId, getToken, loadConfig, submitOrder } from "../_shared/pesapal.ts";
import { adminClient } from "../_shared/settle.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || "");
    if (!UUID.test(orderId)) return json({ error: "order_id is required." }, 400);

    const db = adminClient();
    const { data: order, error } = await db
      .from("orders")
      .select("id, order_no, status, total, customer:customers(full_name, email, phone)")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.status !== "pending") return json({ error: `This order is already ${order.status}.` }, 409);

    const amount = Math.round(Number(order.total) * 100) / 100;
    if (!(amount > 0)) return json({ error: "There is nothing to pay on this order." }, 400);

    const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;

    // Safety switch while testing on personal keys: if PESAPAL_TEST_EMAILS is set, only those customers are sent
    // to Pesapal. Everyone else falls back to manual payment confirmation. Remove the secret to open it to all.
    const testEmails = (Deno.env.get("PESAPAL_TEST_EMAILS") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (testEmails.length && !testEmails.includes(String(customer?.email || "").toLowerCase())) {
      return json({ enabled: false, reason: "test_only" });
    }

    const site = (Deno.env.get("SITE_URL") || "").trim().replace(/\/+$/, "");
    if (!site) throw new Error("SITE_URL is not set (for example https://www.lashtribeafrica.com).");

    const cfg = loadConfig();
    const token = await getToken(cfg);
    const ipnId = await ensureIpnId(cfg, token, `${Deno.env.get("SUPABASE_URL")}/functions/v1/pesapal-ipn`);

    // A fresh reference per attempt (Pesapal needs each one unique), allowed characters only, well under 50.
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const reference = `${order.order_no}-${suffix}`;
    const [first, ...rest] = String(customer?.full_name || "").trim().split(/\s+/);

    const submitted = await submitOrder(cfg, token, {
      id: reference,
      currency: "KES",
      amount,
      description: `Lashtribe order ${order.order_no}`,
      callback_url: `${site}/ecommerce/payment-return/`,
      cancellation_url: `${site}/ecommerce/payment-return/?cancelled=1&ref=${encodeURIComponent(reference)}`,
      notification_id: ipnId,
      billing_address: {
        email_address: customer?.email || undefined,
        phone_number: customer?.phone || undefined,
        country_code: "KE",
        first_name: first || undefined,
        last_name: rest.join(" ") || undefined,
      },
    });

    const { error: insertErr } = await db.from("payments").insert({
      order_id: order.id,
      env: cfg.env,
      merchant_reference: reference,
      order_tracking_id: submitted.order_tracking_id,
      amount,
      currency: "KES",
      status: "pending",
    });
    if (insertErr) throw insertErr;

    return json({ enabled: true, redirect_url: submitted.redirect_url, order_no: order.order_no });
  } catch (err) {
    console.error("pesapal-create-payment:", err);
    return json({ error: "We couldn't start the payment." }, 502);
  }
});
