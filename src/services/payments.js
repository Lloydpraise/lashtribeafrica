// Payment path: Pesapal (card and M-Pesa on Pesapal's hosted page), with manual confirmation as the fallback.
//
// HOW IT WORKS
//   1. Checkout places the order (status 'pending') and calls startPayment().
//   2. startPayment() asks the `pesapal-create-payment` Edge Function for a payment page. The function reads the
//      amount from the order in the database and talks to Pesapal with secret keys that never reach the browser.
//   3. The customer pays on Pesapal and lands on /ecommerce/payment-return/, which asks `pesapal-status` what
//      happened. Pesapal also calls `pesapal-ipn` on its own; that, not the browser, is what marks the order paid
//      (admin_set_order_status(order, 'paid', 'pesapal', receipt), which also unlocks any course in the order).
//   If online payment is switched off for an order, or Pesapal can't be reached, the order simply stays
//   pending and the team confirms payment with the customer, exactly as before. See PESAPAL-SETUP.md.

import { supabase } from "./service.js";

const HAS_DB = Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

export const PAYMENT_PROVIDER = "pesapal"; // "manual" | "pesapal" | "daraja"

/**
 * @param {{ order_id: string, order_no: string, total: number }} order  result of placeOrder()
 * @param {{ full_name: string, email?: string, phone?: string }} customer
 * @returns {Promise<{ provider: string, status: "awaiting_confirmation" | "pending" | "paid", redirectUrl?: string, note?: "online_payment_unavailable" }>}
 */
export async function startPayment(order, customer) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lashtribe:payment-start", { detail: { order, customer, provider: PAYMENT_PROVIDER } }));
  }

  switch (PAYMENT_PROVIDER) {
    case "pesapal": return startPesapal(order);
    // case "daraja":  return startDaraja(order, customer);
    default:
      return { provider: "manual", status: "awaiting_confirmation" };
  }
}

/** Asks the server for a Pesapal payment page. Never throws: any problem falls back to manual confirmation. */
async function startPesapal(order) {
  if (!HAS_DB) return { provider: "manual", status: "awaiting_confirmation" };
  try {
    const { data, error } = await supabase.functions.invoke("pesapal-create-payment", { body: { order_id: order.order_id } });
    if (error) throw error;
    if (data?.enabled === false) return { provider: "manual", status: "awaiting_confirmation" };
    if (data?.redirect_url) return { provider: "pesapal", status: "pending", redirectUrl: data.redirect_url };
    throw new Error(data?.error || "No payment page was returned.");
  } catch (err) {
    console.warn("Pesapal: could not start the payment, falling back to manual confirmation.", err);
    return { provider: "manual", status: "awaiting_confirmation", note: "online_payment_unavailable" };
  }
}

/** Used by the payment-return page. `ref` is our merchant reference, `trackingId` is Pesapal's OrderTrackingId. */
export async function checkPayment({ trackingId, ref }) {
  const body = trackingId ? { order_tracking_id: trackingId } : { merchant_reference: ref };
  const { data, error } = await supabase.functions.invoke("pesapal-status", { body });
  if (error) throw error;
  return data; // { status, order_id, order_no, amount, currency }
}

/** "Try again" on the return page: starts a fresh attempt for an order that is still unpaid. */
export async function retryPayment(orderId) {
  return startPesapal({ order_id: orderId });
}
