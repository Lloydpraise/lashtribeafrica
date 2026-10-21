// Pesapal calls this whenever a payment changes state (the "IPN"). It is public by design (deploy with
// --no-verify-jwt), so it trusts nothing in the request: it only reads which payment to look at, then asks
// Pesapal directly what happened, and records that.
import { json, readParams } from "../_shared/http.ts";
import { loadConfig } from "../_shared/pesapal.ts";
import { adminClient, settlePayment } from "../_shared/settle.ts";

Deno.serve(async (req) => {
  const p = await readParams(req);
  const trackingId = p.OrderTrackingId || p.orderTrackingId || "";
  const reference = p.OrderMerchantReference || p.orderMerchantReference || "";
  const type = p.OrderNotificationType || "IPNCHANGE";
  const reply = (status: number) =>
    json({ orderNotificationType: type, orderTrackingId: trackingId, orderMerchantReference: reference, status }, status === 200 ? 200 : 500);

  try {
    if (!trackingId && !reference) return reply(200);
    const db = adminClient();
    let query = db.from("payments").select("id, order_id, merchant_reference, order_tracking_id, amount, currency, status");
    query = trackingId ? query.eq("order_tracking_id", trackingId) : query.eq("merchant_reference", reference);
    const { data: payment, error } = await query.maybeSingle();
    if (error) throw error;
    if (!payment) return reply(200); // not one of ours: acknowledge so Pesapal doesn't keep retrying

    await settlePayment(db, loadConfig(), payment);
    return reply(200);
  } catch (err) {
    console.error("pesapal-ipn:", err);
    return reply(500); // Pesapal retries a failed notification
  }
});
