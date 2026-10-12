// Payment path (open for Pesapal and Daraja / M-Pesa STK push, to be built later).
//
// TODAY: payment is manual. After checkout the order is saved as 'pending' and the team
// confirms payment with the customer (M-Pesa or card), then marks it paid in
// Admin -> Orders. Nothing here talks to a payment provider yet.
//
// HOW A PROVIDER PLUGS IN (no changes needed in checkout or the database):
//   1. Set PAYMENT_PROVIDER below to "pesapal" or "daraja" and implement that branch of
//      startPayment(). It receives the placed order ({ order_id, order_no, total, ... }) and
//      the customer's details, starts the payment (an STK push, or a redirect to the hosted
//      page) and returns { provider, status, redirectUrl? }. The checkout page follows
//      redirectUrl when there is one.
//   2. Keep the secret keys OUT of this file (it runs in the browser). Create the payment and
//      receive the provider's callback in a Supabase Edge Function.
//   3. When the callback says the payment succeeded, the Edge Function calls the existing
//      database function admin_set_order_status(order_id, 'paid', method, reference) with the
//      service role. That marks the order paid, and unlocks any course in it.
//   orders.payment_method and orders.payment_ref already store how and which payment.

export const PAYMENT_PROVIDER = "manual"; // "manual" | "pesapal" | "daraja"

/**
 * @param {{ order_id: string, order_no: string, total: number }} order  result of placeOrder()
 * @param {{ full_name: string, email?: string, phone?: string }} customer
 * @returns {Promise<{ provider: string, status: "awaiting_confirmation" | "pending" | "paid", redirectUrl?: string }>}
 */
export async function startPayment(order, customer) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lashtribe:payment-start", { detail: { order, customer, provider: PAYMENT_PROVIDER } }));
  }

  switch (PAYMENT_PROVIDER) {
    // case "pesapal": return startPesapal(order, customer);
    // case "daraja":  return startDaraja(order, customer);
    default:
      return { provider: "manual", status: "awaiting_confirmation" };
  }
}
