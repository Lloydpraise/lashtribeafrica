// The payment-return page calls this to show the customer what happened. It settles the payment the same way
// the IPN does (so the page is right even if the IPN is slow) and returns only what the page needs.
//
// Request:  POST { order_tracking_id } or { merchant_reference }
// Response: { status: 'pending'|'paid'|'failed'|'reversed'|'mismatch', order_id, order_no, amount, currency }
import { corsHeaders, json } from "../_shared/http.ts";
import { loadConfig } from "../_shared/pesapal.ts";
import { adminClient, settlePayment } from "../_shared/settle.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const trackingId = String(body?.order_tracking_id || "");
    const reference = String(body?.merchant_reference || "");
    if (!trackingId && !reference) return json({ error: "order_tracking_id or merchant_reference is required." }, 400);

    const db = adminClient();
    let query = db
      .from("payments")
      .select("id, order_id, merchant_reference, order_tracking_id, amount, currency, status, order:orders(order_no)");
    query = trackingId ? query.eq("order_tracking_id", trackingId) : query.eq("merchant_reference", reference);
    const { data: payment, error } = await query.maybeSingle();
    if (error) throw error;
    if (!payment) return json({ error: "Payment not found." }, 404);

    const status = await settlePayment(db, loadConfig(), payment);
    const order = Array.isArray(payment.order) ? payment.order[0] : payment.order;
    return json({
      status,
      order_id: payment.order_id,
      order_no: order?.order_no ?? null,
      amount: Number(payment.amount),
      currency: payment.currency,
    });
  } catch (err) {
    console.error("pesapal-status:", err);
    return json({ error: "We couldn't check the payment." }, 502);
  }
});
